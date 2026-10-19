import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { listAscents } from '../../src/db/repo';
import { isoDate } from '../../src/domain/dates';
import { formatGrade } from '../../src/domain/grades';
import { activityByDay, ascentYears, pyramid, yearStats, type StatAscent } from '../../src/domain/stats';
import { EmptyState, HIT, Label, Screen, StatTile } from '../../src/ui/kit';
import { F } from '../../src/ui/fonts';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';

function Pyramid({ data }: { data: Map<number, number> }) {
  const th = useTheme();
  const { t } = useTranslation();
  const { routeSystem } = useSettings();
  const indices = [...data.keys()].sort((a, b) => b - a);
  const max = Math.max(1, ...data.values());
  if (!indices.length) return <Text style={{ color: th.muted }}>{t('progress.noSends')}</Text>;
  return (
    <View style={{ gap: 3 }}>
      {indices.map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ width: 52, textAlign: 'right', color: th.ink, fontFamily: F.cond, fontSize: 16, fontVariant: ['tabular-nums'] }}>
            {formatGrade(i, routeSystem)}
          </Text>
          <View style={{ height: 16, borderRadius: 4, backgroundColor: th.badge, width: `${(data.get(i)! / max) * 75}%` }} />
          <Text style={{ color: th.muted, fontFamily: F.cond, fontSize: 16 }}>{data.get(i)}</Text>
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
      <Text style={{ fontSize: 30, fontFamily: F.cond, color: disabled ? th.line : th.accent }}>{label}</Text>
    </Pressable>
  );
}

export default function Progress() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();
  const [ascents, setAscents] = useState<StatAscent[]>([]);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  useFocusEffect(useCallback(() => {
    listAscents(db).then((rows) => setAscents(rows.map((r) => ({ date: r.date, type: r.type, gradeIndex: r.grade_index, style: r.style }))));
  }, [db]));

  const stats = useMemo(() => yearStats(ascents, year), [ascents, year]);
  const routes = useMemo(() => pyramid(ascents, year), [ascents, year]);
  const days = useMemo(() => activityByDay(ascents), [ascents]);
  const years = useMemo(() => ascentYears(ascents, currentYear), [ascents, currentYear]);
  // The chosen year may have lost all its ascents (deleted); fall back to the current year.
  useEffect(() => { if (!years.includes(year)) setYear(currentYear); }, [years, year, currentYear]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <YearArrow label="‹" hint={t('progress.prevYear')} target={years[years.indexOf(year) + 1]} onPress={setYear} />
          <Text accessibilityRole="header" style={{ color: th.ink, fontSize: 32, fontFamily: F.display, minWidth: 80, textAlign: 'center' }}>{year}</Text>
          <YearArrow label="›" hint={t('progress.nextYear')} target={years[years.indexOf(year) - 1]} onPress={setYear} />
        </View>
        {stats.sends === 0 ? <EmptyState title={t('progress.empty', { year })} hint={t('progress.emptyHint')} /> : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <StatTile strong value={String(stats.sends)} label={t('progress.sends')} />
          <StatTile value={String(stats.climbingDays)} label={t('progress.days')} />
          <StatTile value={stats.hardest.sport != null ? formatGrade(stats.hardest.sport, routeSystem) : '–'} label={t('progress.hardestRoute')} />
        </View>
        <Label>{t('progress.pyramidRoutes')}</Label>
        <Pyramid data={routes} />
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
