import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { listAscents, listGoals, type GoalRow } from '../../src/db/repo';
import { formatDay, isoDate } from '../../src/domain/dates';
import type { GoalKind } from '../../src/domain/forms';
import { formatGrade } from '../../src/domain/grades';
import { countGoalProgress, gradeGoalProgress, projectProgress, yearStats, type StatAscent } from '../../src/domain/stats';
import { Button, Chip, ChipRow, EmptyState, Field, Label } from '../../src/ui/kit';
import { toStat } from '../../src/ui/progress';
import { SwitchRow } from '../../src/ui/rows';
import { useSettings } from '../../src/ui/settingsStore';
import { shareCardImage } from '../../src/ui/shareImage';
import { GoalsCard, STATS_CARD_RATIO, type CardPalette, type GoalsCardData, type GoalsCardItem } from '../../src/ui/StatsCard';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';

const MAX = 5;

/** /goal/share: the chosen goals with their progress as a picture and a text to send. */
export default function GoalsShare() {
  const db = useSQLiteContext();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem, cardStyle } = useSettings();
  const { width: screenWidth } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const year = new Date().getFullYear();
  const [goals, setGoals] = useState<GoalRow[] | undefined>(undefined);
  const [ascents, setAscents] = useState<StatAscent[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [look, setLook] = useState<CardPalette>(cardStyle === 'night' ? 'night' : 'paper');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([listGoals(db), listAscents(db)]).then(([g, a]) => {
      if (!live) return;
      setGoals(g); setAscents(a.map(toStat));
      // Open goals first, as many as fit.
      setChosen(g.filter((x) => x.done_at == null).slice(0, MAX).map((x) => x.id));
    });
    return () => { live = false; };
  }, [db]);

  if (goals === undefined) return <View style={{ flex: 1, backgroundColor: th.bg }} />;
  if (!goals.length) return <View style={{ flex: 1, backgroundColor: th.bg, padding: 16 }}><EmptyState title={t('goals.empty')} hint={t('goals.emptyHint')} /></View>;

  const today = isoDate(new Date());
  const sends = yearStats(ascents, year).sends;
  const itemOf = (g: GoalRow): GoalsCardItem => {
    const kind = t(`goals.${g.kind as GoalKind}`);
    if (g.kind === 'count' && g.target) {
      const p = countGoalProgress(g.target, sends);
      return { title: g.title, kind, ratio: p.ratio, reached: p.reached, label: t('goals.progress', { value: p.value, target: p.target, year }) };
    }
    if (g.kind === 'grade' && g.grade_index != null) {
      const p = gradeGoalProgress(ascents, g.grade_index, g.target ?? 1, year);
      return { title: g.title, kind, ratio: p.ratio, reached: p.reached, label: t('goals.gradeProgress', { value: p.value, target: p.target, grade: formatGrade(g.grade_index, routeSystem), year }) };
    }
    if (g.route_id) {
      const p = projectProgress(ascents, g.route_id);
      const label = p.sentOn ? t('goals.sentOn', { date: formatDay(p.sentOn, i18n.language, today) }) : p.tries ? t('goals.tries', { tries: p.tries, days: p.days }) : t('goals.notTried');
      return { title: g.title, kind, ratio: null, reached: !!p.sentOn, label };
    }
    return { title: g.title, kind, ratio: null, reached: g.done_at != null, label: '' };
  };
  const items = goals.filter((g) => chosen.includes(g.id)).map(itemOf);
  const card: GoalsCardData = { tag: t('goalsShare.tag'), title: String(year), items, message: message.trim() };
  const cardWidth = Math.min(screenWidth - 32, 360);
  const toggle = (id: string, on: boolean) => setChosen((c) => (on ? [...c, id].slice(-MAX) : c.filter((x) => x !== id)));

  const sendImage = async () => { setBusy(true); await shareCardImage(cardRef, STATS_CARD_RATIO); setBusy(false); };
  const sendText = async () => {
    const body = [`${card.tag} ${year}`, ...items.map((g) => `• ${g.title}${g.label ? ` – ${g.label}` : ''}${g.reached ? ' ✓' : ''}`), card.message, 'Cruxlog'].filter(Boolean).join('\n');
    try { await Share.share({ message: body }); } catch { Alert.alert(t('share.title'), t('share.failed')); }
  };

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t('goalsShare.title') }} />
      <View style={{ alignItems: 'center' }}>
        <View ref={cardRef} collapsable={false} style={{ borderWidth: 1, borderColor: th.line }}>
          <GoalsCard data={card} width={cardWidth} look={look} />
        </View>
      </View>
      <Button label={t('share.sendImage')} onPress={sendImage} disabled={busy || !items.length} />
      <Label>{t('goalsShare.which', { max: MAX })}</Label>
      {goals.map((g) => <SwitchRow key={g.id} label={g.title} value={chosen.includes(g.id)} onChange={(on) => toggle(g.id, on)} marginTop={4} />)}
      {!items.length ? <Text style={{ color: th.warn, marginTop: 6 }}>{t('goalsShare.none')}</Text> : null}
      <Label>{t('cards.look')}</Label>
      <ChipRow>
        <Chip label={t('cards.styles.guide')} on={look === 'paper'} onPress={() => setLook('paper')} />
        <Chip label={t('cards.styles.night')} on={look === 'night'} onPress={() => setLook('night')} />
      </ChipRow>
      <Label>{t('share.message')}</Label>
      <Field value={message} onChangeText={setMessage} maxLength={120} placeholder={t('goalsShare.messagePlaceholder')} accessibilityLabel={t('share.message')} />
      <View style={{ marginTop: 12 }}>
        <Button label={t('statsShare.sendText')} variant="plain" onPress={sendText} disabled={busy || !items.length} />
      </View>
    </ScrollView>
  );
}
