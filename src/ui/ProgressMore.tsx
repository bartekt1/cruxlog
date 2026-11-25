import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { ASCENT_STYLES, formatGrade } from '../domain/grades';
import { activityByDay, hardestByYear, pyramid, styleCounts, topByDays, yearCalendar, type StatAscent } from '../domain/stats';
import { Bars } from './Bars';
import { F } from './fonts';
import { Label } from './kit';
import { useSettings } from './settingsStore';
import { Text } from './Text';
import { useTheme } from './theme';

// The fuller Progress tab (grade pyramid, grade by year, styles, activity calendar, top crags and partners).

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

/** More sections of the Progress tab, under the season figures: pyramid, grade by year, styles, calendar, top crags and partners. */
export function ProgressMore({ ascents, year }: { ascents: StatAscent[]; year: number }) {
  const { t } = useTranslation();
  const { routeSystem } = useSettings();
  const routes = useMemo(() => pyramid(ascents, year), [ascents, year]);
  const days = useMemo(() => activityByDay(ascents), [ascents]);
  const byYear = useMemo(() => hardestByYear(ascents), [ascents]);
  const styles = useMemo(() => styleCounts(ascents, year), [ascents, year]);
  const crags = useMemo(() => topByDays(ascents, year, (a) => a.cragName), [ascents, year]);
  const partners = useMemo(() => topByDays(ascents, year, (a) => a.partner), [ascents, year]);
  const maxStyle = Math.max(1, ...styles.values());
  const maxYear = Math.max(0, ...byYear.map((y) => y.gradeIndex));
  return (
    <>
      <Label>{t('progress.pyramidRoutes')}</Label>
      <Pyramid data={routes} />
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
    </>
  );
}
