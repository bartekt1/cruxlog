import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { listAscents, type AscentRow } from '../../src/db/repo';
import { formatDay, isoDate, relativeDay } from '../../src/domain/dates';
import { feltGrade, formatGrade, routeGrade, type AscentStyle } from '../../src/domain/grades';
import { backupStatus } from '../../src/domain/history';
import { yearStats } from '../../src/domain/stats';
import { Contours } from '../../src/ui/Contours';
import { F } from '../../src/ui/fonts';
import { EmptyState, GradeBadge, Screen, StatTile } from '../../src/ui/kit';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';

export default function Journal() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem, lastBackupAt } = useSettings();
  const [rows, setRows] = useState<AscentRow[]>([]);

  useFocusEffect(useCallback(() => { listAscents(db).then(setRows); }, [db]));

  const sections = useMemo(() => {
    const byDay = new Map<string, AscentRow[]>();
    for (const r of rows) byDay.set(r.date, [...(byDay.get(r.date) ?? []), r]);
    return [...byDay.entries()].map(([day, data]) => ({ day, data }));
  }, [rows]);

  const year = new Date().getFullYear();
  const season = useMemo(() => yearStats(rows.map((r) => ({ date: r.date, type: r.type, gradeIndex: r.grade_index, style: r.style })), year), [rows, year]);

  const feltLabel = (a: AscentRow) => {
    const f = feltGrade(a.felt_grade_index, a.grade_index);
    return f == null ? '' : ` · ${t('ascent.feltFor', { grade: formatGrade(f, routeSystem) })}`;
  };

  const today = isoDate(new Date());
  const backup = backupStatus(lastBackupAt, Date.now(), rows.length > 0);
  const dayTitle = (day: string) => {
    const rel = relativeDay(day, today);
    return rel ? t(`common.${rel}`) : formatDay(day, i18n.language, today);
  };

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={<>
          {rows.length ? (
            <View style={{ paddingTop: 4, paddingBottom: 4 }}>
              <Contours height={120} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <StatTile strong value={String(season.sends)} label={t('journal.statSends', { year })} />
                <StatTile value={String(season.climbingDays)} label={t('progress.days')} />
                <StatTile value={season.hardest.sport != null ? formatGrade(season.hardest.sport, routeSystem) : '–'} label={t('journal.statHardest')} />
              </View>
            </View>
          ) : null}
          {backup.due ? (
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: th.warn, backgroundColor: th.surface, opacity: pressed ? 0.7 : 1 })}
            >
              <Ionicons name="cloud-upload-outline" size={24} color={th.warn} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: th.ink, fontWeight: '600' }}>{backup.days == null ? t('journal.backupNever') : t('journal.backupOld', { n: backup.days })}</Text>
                <Text style={{ color: th.muted, fontSize: 12 }}>{t('journal.backupHint')}</Text>
              </View>
            </Pressable>
          ) : null}
        </>}
        ListEmptyComponent={<EmptyState title={t('journal.empty')} hint={t('journal.emptyHint')} />}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={{ color: th.muted, fontSize: 12, fontFamily: F.semi, letterSpacing: 1.5, textTransform: 'uppercase', paddingTop: 18, paddingBottom: 6, paddingHorizontal: 4 }}>
            {dayTitle(section.day)}{section.data.length > 1 ? ` · ${t('journal.dayCount', { count: section.data.length })}` : ''}
          </Text>
        )}
        // One card per day: the rows of a day share the card's border, separated by thin lines.
        renderItem={({ item, index, section }) => {
          const first = index === 0;
          const last = index === section.data.length - 1;
          return (
            <Pressable
              onPress={() => router.push(`/ascent/${item.id}`)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12,
                backgroundColor: th.surface, borderColor: th.line, borderLeftWidth: 1, borderRightWidth: 1,
                borderTopWidth: first ? 1 : 0, borderBottomWidth: last ? 1 : 0,
                borderTopLeftRadius: first ? 14 : 0, borderTopRightRadius: first ? 14 : 0,
                borderBottomLeftRadius: last ? 14 : 0, borderBottomRightRadius: last ? 14 : 0,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              {first ? null : <View style={{ position: 'absolute', top: 0, left: 12, right: 12, height: 1, backgroundColor: th.line }} />}
              <GradeBadge text={routeGrade(item, routeSystem)} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: th.ink, fontFamily: F.semi, fontSize: 16 }}>{item.route_name}</Text>
                <Text style={{ color: th.muted, fontSize: 13 }}>
                  {item.crag_name}{feltLabel(item)}{item.attempts > 1 ? ` · ${t('journal.attempts', { count: item.attempts })}` : ''}{item.partner_name ? ` · ${item.partner_name}` : ''}
                </Text>
              </View>
              <Text style={{ color: item.style === 'attempt' ? th.muted : th.accent, fontFamily: F.cond, fontSize: 17, minWidth: 44, textAlign: 'right' }}>{t(`styles.${item.style as AscentStyle}`)}</Text>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
