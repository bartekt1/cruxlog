import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { listAscents } from '../../src/db/repo';
import { isoDate } from '../../src/domain/dates';
import { BOULDER_LADDER, ROUTE_LADDER, formatGrade } from '../../src/domain/grades';
import { activityByDay, ascentYears, pyramid, yearStats, type StatAscent } from '../../src/domain/stats';
import { EmptyState, HIT, Label, Screen } from '../../src/ui/kit';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';

function Pyramid({ data, kind }: { data: Map<number, number>; kind: 'route' | 'boulder' }) {
  const th = useTheme();
  const { t } = useTranslation();
  const { routeSystem, boulderSystem } = useSettings();
  const size = kind === 'boulder' ? BOULDER_LADDER.length : ROUTE_LADDER.length;
  const indices = [...data.keys()].sort((a, b) => b - a);
  const max = Math.max(1, ...data.values());
  if (size === 0) return null;
  if (!indices.length) return <Text style={{ color: th.muted }}>{t('progress.noSends')}</Text>;
  return (
    <View style={{ gap: 3 }}>
      {indices.map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ width: 48, textAlign: 'right', color: th.muted, fontVariant: ['tabular-nums'] }}>
            {formatGrade(i, kind === 'boulder' ? boulderSystem : routeSystem, kind === 'boulder' ? 'boulder' : 'sport')}
          </Text>
          <View style={{ height: 12, borderRadius: 2, backgroundColor: th.accent, width: `${(data.get(i)! / max) * 80}%` }} />
          <Text style={{ color: th.muted }}>{data.get(i)}</Text>
        </View>
      ))}
    </View>
  );
}

function Calendar({ days }: { days: Map<string, number> }) {
  const th = useTheme();
  const { t } = useTranslation();
  const cells: { key: string; n: number }[] = [];
  const today = new Date();
  for (let i = 125; i >= 0; i--) {
    const key = isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
    cells.push({ key, n: days.get(key) ?? 0 });
  }
  const color = (n: number) => (n === 0 ? th.line : n < 3 ? th.soft : th.accent);
  const legend = [[0, t('progress.legendNone')], [1, t('progress.legendSome')], [3, t('progress.legendMany')]] as const;
  return (
    <View>
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
        {cells.map((c) => (
          <View key={c.key} style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: color(c.n), borderWidth: c.n > 0 && c.n < 3 ? 1 : 0, borderColor: th.accent }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
        {legend.map(([n, label]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color(n), borderWidth: n > 0 && n < 3 ? 1 : 0, borderColor: th.accent }} />
            <Text style={{ color: th.muted, fontSize: 12 }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function YearArrow({ label, hint, target, onPress }: { label: string; hint: string; target: number | undefined; onPress: (y: number) => void }) {
  const th = useTheme();
  const disabled = target == null;
  return (
    <Pressable
      onPress={() => target != null && onPress(target)}
      disabled={disabled}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={hint}
      accessibilityState={{ disabled }}
      style={{ paddingHorizontal: 12, paddingVertical: 4 }}
    >
      <Text style={{ fontSize: 28, color: disabled ? th.line : th.accent }}>{label}</Text>
    </Pressable>
  );
}

export default function Progress() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const { routeSystem, boulderSystem } = useSettings();
  const [ascents, setAscents] = useState<StatAscent[]>([]);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  useFocusEffect(useCallback(() => {
    listAscents(db).then((rows) => setAscents(rows.map((r) => ({ date: r.date, type: r.type, gradeIndex: r.grade_index, style: r.style }))));
  }, [db]));

  const stats = useMemo(() => yearStats(ascents, year), [ascents, year]);
  const routes = useMemo(() => pyramid(ascents, year, 'route'), [ascents, year]);
  const boulders = useMemo(() => pyramid(ascents, year, 'boulder'), [ascents, year]);
  const days = useMemo(() => activityByDay(ascents), [ascents]);
  const years = useMemo(() => ascentYears(ascents, currentYear), [ascents, currentYear]);
  // The chosen year may have lost all its ascents (deleted); fall back to the current year.
  useEffect(() => { if (!years.includes(year)) setYear(currentYear); }, [years, year, currentYear]);

  const tile = (value: string, label: string) => (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flex: 1, backgroundColor: th.soft, borderRadius: 6, padding: 10 }}>
      <Text style={{ color: th.ink, fontSize: 22, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: th.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <YearArrow label="‹" hint={t('progress.prevYear')} target={years[years.indexOf(year) + 1]} onPress={setYear} />
          <Text accessibilityRole="header" style={{ color: th.ink, fontSize: 20, fontWeight: '700', minWidth: 64, textAlign: 'center' }}>{year}</Text>
          <YearArrow label="›" hint={t('progress.nextYear')} target={years[years.indexOf(year) - 1]} onPress={setYear} />
        </View>
        {stats.sends === 0 ? <EmptyState title={t('progress.empty', { year })} hint={t('progress.emptyHint')} /> : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {tile(String(stats.sends), t('progress.sends'))}
          {tile(String(stats.climbingDays), t('progress.days'))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {tile(stats.hardest.sport != null ? formatGrade(stats.hardest.sport, routeSystem, 'sport') : '-', t('progress.hardestRoute'))}
          {tile(stats.hardest.boulder != null ? formatGrade(stats.hardest.boulder, boulderSystem, 'boulder') : '-', t('progress.hardestBoulder'))}
        </View>
        <Label>{t('progress.pyramidRoutes')}</Label>
        <Pyramid data={routes} kind="route" />
        <Label>{t('progress.pyramidBoulders')}</Label>
        <Pyramid data={boulders} kind="boulder" />
        {year === currentYear ? (
          <>
            <Label>{t('progress.activity')}</Label>
            <Calendar days={days} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
