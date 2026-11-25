import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { listAscents } from '../../src/db/repo';
import { formatGrade } from '../../src/domain/grades';
import { toStat } from '../../src/ui/progress';
import { ascentYears, hardestByMonth, yearStats, type StatAscent } from '../../src/domain/stats';
import { Bars } from '../../src/ui/Bars';
import { ProgressMore } from '../../src/ui/ProgressMore';
import { EmptyState, HIT, Label, Screen, StatTile } from '../../src/ui/kit';
import { F } from '../../src/ui/fonts';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';

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
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();
  const [ascents, setAscents] = useState<StatAscent[]>([]);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  useFocusEffect(useCallback(() => {
    listAscents(db).then((rows) => setAscents(rows.map(toStat)));
  }, [db]));

  // Past seasons and the fuller stats are Pro (src/pro); the free tab has the season's tiles and the hardest grade by month.
  const stats = useMemo(() => yearStats(ascents, year), [ascents, year]);
  const years = useMemo(() => ascentYears(ascents, currentYear), [ascents, currentYear]);
  const byMonth = useMemo(() => hardestByMonth(ascents, year), [ascents, year]);
  const month = (m: number) => t(`progress.months.${m}`);
  const maxMonth = Math.max(0, ...byMonth.map((g) => g ?? 0));
  // The chosen year may have lost all its ascents (deleted); fall back to the current year.
  useEffect(() => { if (!years.includes(year)) setYear(currentYear); }, [years, year, currentYear]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 88 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <YearArrow label="‹" hint={t('progress.prevYear')} target={years[years.indexOf(year) + 1]} onPress={setYear} />
          <Text accessibilityRole="header" style={{ color: th.ink, fontSize: 32, fontFamily: F.display, minWidth: 80, textAlign: 'center' }}>{year}</Text>
          <YearArrow label="›" hint={t('progress.nextYear')} target={years[years.indexOf(year) - 1]} onPress={setYear} />
          {stats.sends ? (
            <Pressable onPress={() => router.push(`/stats/share?year=${year}`)} hitSlop={HIT} accessibilityRole="button" accessibilityLabel={t('statsShare.title')}
              style={{ position: 'absolute', right: 0, padding: 6 }}>
              <Ionicons name="share-social-outline" size={24} color={th.accent} />
            </Pressable>
          ) : null}
        </View>
        {stats.sends === 0 ? <EmptyState title={t('progress.empty', { year })} hint={t('progress.emptyHint')} /> : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <StatTile strong value={String(stats.sends)} label={t('progress.sends')} />
          <StatTile value={String(stats.climbingDays)} label={t('progress.days')} />
          <StatTile value={stats.hardest.sport != null ? formatGrade(stats.hardest.sport, routeSystem) : '–'} label={t('progress.hardestRoute')} />
        </View>
        {byMonth.some((g) => g != null) ? (
          <>
            <Label>{t('progress.byMonth')}</Label>
            <Bars rows={byMonth.flatMap((g, m) => (g == null ? [] : [{ key: String(m), label: month(m), ratio: (g + 1) / (maxMonth + 1), value: formatGrade(g, routeSystem) }]))} />
          </>
        ) : null}
        <ProgressMore ascents={ascents} year={year} />
      </ScrollView>
    </Screen>
  );
}
