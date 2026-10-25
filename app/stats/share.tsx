import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { listAscents } from '../../src/db/repo';
import { formatGrade } from '../../src/domain/grades';
import { activityByDay, ascentYears, pyramid, pyramidTop, topByDays, yearCalendar, yearStats, type StatAscent } from '../../src/domain/stats';
import { Button, Chip, ChipRow, Field, Label } from '../../src/ui/kit';
import { toStat } from '../../src/ui/progress';
import { SwitchRow } from '../../src/ui/rows';
import { useSettings } from '../../src/ui/settingsStore';
import { shareCardImage } from '../../src/ui/shareImage';
import { STATS_CARD_RATIO, StatsCard, type CardPalette, type StatsCardData } from '../../src/ui/StatsCard';
import { useTheme } from '../../src/ui/theme';

/** /stats/share?year=2026: the year's stats as a picture and a text to send. Partners' names only when switched on. */
export default function StatsShare() {
  const { year: rawYear } = useLocalSearchParams<{ year?: string }>();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const { routeSystem, cardStyle } = useSettings();
  const { width: screenWidth } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const currentYear = new Date().getFullYear();
  const [ascents, setAscents] = useState<StatAscent[]>([]);
  const [year, setYear] = useState(Number(rawYear) || currentYear);
  const [look, setLook] = useState<CardPalette>(cardStyle === 'night' ? 'night' : 'paper');
  const [withPartners, setWithPartners] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { listAscents(db).then((rows) => setAscents(rows.map(toStat))); }, [db]);
  const years = useMemo(() => ascentYears(ascents, currentYear), [ascents, currentYear]);

  const stats = yearStats(ascents, year);
  const crag = topByDays(ascents, year, (a) => a.cragName, 1)[0];
  const partners = topByDays(ascents, year, (a) => a.partner, 3);
  const hardest = stats.hardest.sport != null ? formatGrade(stats.hardest.sport, routeSystem) : '–';
  const lines = [
    crag ? t('statsShare.favCrag', { name: crag.name, count: crag.days }) : '',
    withPartners && partners.length ? t('statsShare.partners', { names: partners.map((p) => p.name).join(', ') }) : '',
  ].filter(Boolean);
  const card: StatsCardData = {
    tag: t('statsShare.tag'), title: String(year),
    stats: [
      { value: String(stats.sends), label: t('progress.sends') },
      { value: String(stats.climbingDays), label: t('statsShare.days') },
      { value: hardest, label: t('statsShare.hardest') },
    ],
    pyramidLabel: t('statsShare.hardestGrades'),
    pyramid: pyramidTop(pyramid(ascents, year)).map((p) => ({ grade: formatGrade(p.gradeIndex, routeSystem), count: p.count })),
    calendarLabel: t('statsShare.calendar'), calendar: yearCalendar(activityByDay(ascents), year).map((m) => m.map((d) => d.n)),
    lines, message: message.trim(),
  };
  const cardWidth = Math.min(screenWidth - 32, 360);

  const sendImage = async () => { setBusy(true); await shareCardImage(cardRef, STATS_CARD_RATIO); setBusy(false); };
  const sendText = async () => {
    const body = [
      `${card.tag} ${year}`,
      card.stats.map((s) => `${s.label}: ${s.value}`).join(' · '),
      ...lines, card.message, 'Cruxlog',
    ].filter(Boolean).join('\n');
    try { await Share.share({ message: body }); } catch { Alert.alert(t('share.title'), t('share.failed')); }
  };

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t('statsShare.title') }} />
      <ChipRow>{years.slice().reverse().map((y) => <Chip key={y} label={String(y)} on={y === year} onPress={() => setYear(y)} />)}</ChipRow>
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <View ref={cardRef} collapsable={false} style={{ borderWidth: 1, borderColor: th.line }}>
          <StatsCard data={card} width={cardWidth} look={look} />
        </View>
      </View>
      <Label>{t('cards.look')}</Label>
      <ChipRow>
        <Chip label={t('cards.styles.guide')} on={look === 'paper'} onPress={() => setLook('paper')} />
        <Chip label={t('cards.styles.night')} on={look === 'night'} onPress={() => setLook('night')} />
      </ChipRow>
      {partners.length ? <SwitchRow label={t('statsShare.withPartners')} value={withPartners} onChange={setWithPartners} /> : null}
      <Label>{t('share.message')}</Label>
      <Field value={message} onChangeText={setMessage} maxLength={120} placeholder={t('statsShare.messagePlaceholder')} accessibilityLabel={t('share.message')} />
      <View style={{ marginTop: 12 }}>
        <Button label={t('share.sendImage')} onPress={sendImage} disabled={busy} />
        <Button label={t('statsShare.sendText')} variant="plain" onPress={sendText} disabled={busy} />
      </View>
    </ScrollView>
  );
}
