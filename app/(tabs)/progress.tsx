import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { listAscents } from '../../src/db/repo';
import { ASCENT_STYLES, formatGrade } from '../../src/domain/grades';
import { toStat } from '../../src/ui/progress';
import {
  activityByDay, ascentYears, hardestByMonth, hardestByYear, pyramid, styleCounts, topByDays, yearCalendar, yearStats, type StatAscent,
} from '../../src/domain/stats';
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

/** The whole year, one row of day squares per month, colored by the number of ascents that day. */
function Calendar({ days, year }: { days: Map<string, number>; year: number }) {
  const th = useTheme();
  const { t } = useTranslation();
  const month = (m: number) => t(`progress.months.${m}`);
  const color = (n: number) => (n === 0 ? th.soft : n < 3 ? th.outline : th.accent);
  const legend = [[0, t('progress.legendNone')], [1, t('progress.legendSome')], [3, t('progress.legendMany')]] as const;
  return (
    <View>
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ gap: 3 }}>
        {yearCalendar(days, year).map((cells, m) => (
          <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ width: 30, color: th.muted, fontFamily: F.semi, fontSize: 11, textTransform: 'uppercase' }}>{month(m)}</Text>
            {cells.map((c) => <View key={c.key} style={{ flex: 1, aspectRatio: 1, maxWidth: 12, borderRadius: 2, backgroundColor: color(c.n) }} />)}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
        {legend.map(([n, label]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color(n) }} />
            <Text style={{ color: th.muted, fontSize: 12 }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Horizontal bars with a label on the left and the value on the right. */
function Bars({ rows }: { rows: { key: string; label: string; ratio: number; value: string }[] }) {
  const th = useTheme();
  return (
    <View style={{ gap: 4 }}>
      {rows.map((r) => (
        <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ width: 52, color: th.muted, fontFamily: F.semi, fontSize: 12, textTransform: 'uppercase' }} numberOfLines={1}>{r.label}</Text>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ height: 16, borderRadius: 4, backgroundColor: th.badge, width: `${Math.max(4, r.ratio * 70)}%` }} />
            <Text style={{ color: th.ink, fontFamily: F.cond, fontSize: 16 }}>{r.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** A short ranked list: name and number of days. */
function TopList({ items, empty }: { items: { name: string; days: number }[]; empty: string }) {
  const th = useTheme();
  const { t } = useTranslation();
  if (!items.length) return <Text style={{ color: th.muted }}>{empty}</Text>;
  return (
    <View style={{ backgroundColor: th.surface, borderWidth: 1, borderColor: th.line, borderRadius: 14 }}>
      {items.map((it, i) => (
        <View key={it.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: i ? 1 : 0, borderTopColor: th.line }}>
          <Text style={{ width: 18, color: th.muted, fontFamily: F.cond, fontSize: 16 }}>{i + 1}</Text>
          <Text style={{ flex: 1, color: th.ink, fontFamily: F.semi }} numberOfLines={1}>{it.name}</Text>
          <Text style={{ color: th.muted, fontSize: 13 }}>{t('progress.daysCount', { count: it.days })}</Text>
        </View>
      ))}
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
    listAscents(db).then((rows) => setAscents(rows.map(toStat)));
  }, [db]));

  const stats = useMemo(() => yearStats(ascents, year), [ascents, year]);
  const routes = useMemo(() => pyramid(ascents, year), [ascents, year]);
  const days = useMemo(() => activityByDay(ascents), [ascents]);
  const years = useMemo(() => ascentYears(ascents, currentYear), [ascents, currentYear]);
  const byMonth = useMemo(() => hardestByMonth(ascents, year), [ascents, year]);
  const byYear = useMemo(() => hardestByYear(ascents), [ascents]);
  const styles = useMemo(() => styleCounts(ascents, year), [ascents, year]);
  const crags = useMemo(() => topByDays(ascents, year, (a) => a.cragName), [ascents, year]);
  const partners = useMemo(() => topByDays(ascents, year, (a) => a.partner), [ascents, year]);
  const month = (m: number) => t(`progress.months.${m}`);
  const maxMonth = Math.max(0, ...byMonth.map((g) => g ?? 0));
  const maxStyle = Math.max(1, ...styles.values());
  const maxYear = Math.max(0, ...byYear.map((y) => y.gradeIndex));
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
        {byMonth.some((g) => g != null) ? (
          <>
            <Label>{t('progress.byMonth')}</Label>
            <Bars rows={byMonth.flatMap((g, m) => (g == null ? [] : [{ key: String(m), label: month(m), ratio: (g + 1) / (maxMonth + 1), value: formatGrade(g, routeSystem) }]))} />
          </>
        ) : null}
        {byYear.length > 1 ? (
          <>
            <Label>{t('progress.byYear')}</Label>
            <Bars rows={byYear.map((y) => ({ key: String(y.year), label: String(y.year), ratio: (y.gradeIndex + 1) / (maxYear + 1), value: formatGrade(y.gradeIndex, routeSystem) }))} />
          </>
        ) : null}
        {styles.size ? (
          <>
            <Label>{t('progress.styles')}</Label>
            <Bars rows={ASCENT_STYLES.filter((st) => styles.get(st)).map((st) => ({ key: st, label: t(`styles.${st}`), ratio: styles.get(st)! / maxStyle, value: String(styles.get(st)) }))} />
          </>
        ) : null}
        <Label>{t('progress.activityYear', { year })}</Label>
        <Calendar days={days} year={year} />
        <Label>{t('progress.topCrags')}</Label>
        <TopList items={crags} empty={t('progress.noData')} />
        <Label>{t('progress.topPartners')}</Label>
        <TopList items={partners} empty={t('progress.noPartners')} />
      </ScrollView>
    </Screen>
  );
}
