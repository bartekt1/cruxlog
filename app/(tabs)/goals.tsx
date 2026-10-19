import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Keyboard, Pressable, View } from 'react-native';
import { addGoal, listAreas, listAscents, listGoals, type GoalRow } from '../../src/db/repo';
import { pathLabels } from '../../src/domain/areas';
import { formatDay, isoDate } from '../../src/domain/dates';
import type { GoalKind } from '../../src/domain/forms';
import { formatGrade, routeGrade } from '../../src/domain/grades';
import { countGoalProgress, gradeGoalProgress, projectProgress, yearStats, type StatAscent } from '../../src/domain/stats';
import { F } from '../../src/ui/fonts';
import { EMPTY_GOAL, GoalForm } from '../../src/ui/GoalForm';
import { ProgressBar, toStat } from '../../src/ui/progress';
import { EmptyState, GradeBadge, Label, Screen } from '../../src/ui/kit';
import { useSettings } from '../../src/ui/settingsStore';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';

export default function Goals() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [ascents, setAscents] = useState<StatAscent[]>([]);
  const [labels, setLabels] = useState<Map<string, string>>(new Map());
  const [adding, setAdding] = useState(false);
  const year = new Date().getFullYear();

  const load = useCallback(() => {
    listGoals(db).then(setRows);
    listAscents(db).then((a) => setAscents(a.map(toStat)));
    listAreas(db).then((a) => setLabels(pathLabels(a)));
  }, [db]);
  useFocusEffect(load);

  const sends = useMemo(() => yearStats(ascents, year).sends, [ascents, year]);
  const today = isoDate(new Date());

  const details = (g: GoalRow) => {
    if (g.kind === 'count' && g.target) {
      const p = countGoalProgress(g.target, sends);
      return <ProgressBar ratio={p.ratio} reached={p.reached} label={t('goals.progress', { value: p.value, target: p.target, year })} />;
    }
    if (g.kind === 'grade' && g.grade_index != null) {
      const p = gradeGoalProgress(ascents, g.grade_index, g.target ?? 1, year);
      return (
        <>
          <ProgressBar ratio={p.ratio} reached={p.reached} label={t('goals.gradeProgress', { value: p.value, target: p.target, grade: formatGrade(g.grade_index, routeSystem), year })} />
          {p.routes.length ? <Text style={{ color: th.muted, fontSize: 13 }} numberOfLines={2}>{p.routes.join(', ')}</Text> : null}
        </>
      );
    }
    if (g.route_id) {
      const p = projectProgress(ascents, g.route_id);
      return (
        <Pressable onPress={() => router.push(`/route/${g.route_id}`)} accessibilityRole="link"
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, opacity: pressed ? 0.6 : 1 })}>
          <GradeBadge size="sm" text={routeGrade({ grade_index: g.route_grade_index!, grade_label: g.route_grade_label ?? '', grade_system: g.route_grade_system ?? undefined, type: g.route_type ?? 'sport' }, routeSystem)} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: th.muted, fontSize: 13 }} numberOfLines={1}>{[g.region_id ? labels.get(g.region_id) : '', g.crag_name].filter(Boolean).join(' › ')}</Text>
            <Text style={{ color: p.sentOn ? th.accent : th.muted, fontSize: 13 }}>
              {p.sentOn ? `✓ ${t('goals.sentOn', { date: formatDay(p.sentOn, i18n.language, today) })}` : p.tries ? t('goals.tries', { tries: p.tries, days: p.days }) : t('goals.notTried')}
            </Text>
          </View>
        </Pressable>
      );
    }
    return null;
  };

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <View style={{ paddingBottom: 8 }}>
            {adding ? (
              <GoalForm
                initial={EMPTY_GOAL}
                submitLabel={t('common.add')}
                onSubmit={async (kind: GoalKind, v) => { await addGoal(db, { kind, ...v }); }}
                onSaved={(reset) => { reset(); Keyboard.dismiss(); setAdding(false); load(); }}
              />
            ) : (
              <Pressable onPress={() => setAdding(true)} accessibilityRole="button"
                style={({ pressed }) => ({ marginTop: 12, minHeight: 50, borderRadius: 14, backgroundColor: th.accent, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
                <Text style={{ color: th.onAccent, fontFamily: F.display, fontSize: 19, letterSpacing: 0.8, textTransform: 'uppercase' }}>{t('goals.add')}</Text>
              </Pressable>
            )}
            {rows.length ? <Label>{t('goals.yours')}</Label> : null}
          </View>
        }
        ListEmptyComponent={adding ? null : <EmptyState title={t('goals.empty')} hint={t('goals.emptyHint')} />}
        renderItem={({ item }) => {
          const done = item.done_at != null;
          return (
            <Pressable
              onPress={() => router.push(`/goal/${item.id}`)}
              accessibilityRole="button"
              accessibilityHint={t('goals.editHint')}
              style={({ pressed }) => ({ marginTop: 8, padding: 14, backgroundColor: th.surface, borderWidth: 1, borderColor: th.line, borderRadius: 14, opacity: pressed ? 0.7 : done ? 0.6 : 1 })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, color: th.ink, fontFamily: F.semi, fontSize: 16, textDecorationLine: done ? 'line-through' : 'none' }}>{done ? '✓ ' : ''}{item.title}</Text>
                <Text style={{ color: th.muted, fontFamily: F.semi, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{t(`goals.${item.kind as GoalKind}`)}</Text>
              </View>
              {details(item)}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
