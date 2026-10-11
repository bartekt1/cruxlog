import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, Text, View } from 'react-native';
import { listAscents, type AscentRow } from '../../src/db/repo';
import { formatDay, isoDate, relativeDay } from '../../src/domain/dates';
import { routeGrade, type AscentStyle } from '../../src/domain/grades';
import { backupStatus } from '../../src/domain/history';
import { EmptyState, GradeBadge, Screen } from '../../src/ui/kit';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';

export default function Journal() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem, boulderSystem, lastBackupAt } = useSettings();
  const [rows, setRows] = useState<AscentRow[]>([]);

  useFocusEffect(useCallback(() => { listAscents(db).then(setRows); }, [db]));

  const sections = useMemo(() => {
    const byDay = new Map<string, AscentRow[]>();
    for (const r of rows) byDay.set(r.date, [...(byDay.get(r.date) ?? []), r]);
    return [...byDay.entries()].map(([day, data]) => ({ day, data }));
  }, [rows]);

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
        ListHeaderComponent={
          backup.due ? (
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 12, borderRadius: 6, borderWidth: 1, borderColor: th.warn, opacity: pressed ? 0.7 : 1 })}
            >
              <Ionicons name="cloud-upload-outline" size={24} color={th.warn} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: th.ink, fontWeight: '600' }}>{backup.days == null ? t('journal.backupNever') : t('journal.backupOld', { n: backup.days })}</Text>
                <Text style={{ color: th.muted, fontSize: 12 }}>{t('journal.backupHint')}</Text>
              </View>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={<EmptyState title={t('journal.empty')} hint={t('journal.emptyHint')} />}
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={{ color: th.muted, fontSize: 12, fontWeight: '600', paddingTop: 16, paddingBottom: 4, backgroundColor: th.bg }}>
            {dayTitle(section.day)}
          </Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/ascent/${item.id}`)}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: th.line, opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: th.ink, fontWeight: '600' }}>{item.route_name}</Text>
              <Text style={{ color: th.muted, fontSize: 12 }}>
                {item.crag_name}{item.attempts > 1 ? ` · ${t('journal.attempts', { count: item.attempts })}` : ''}{item.partner_name ? ` · ${item.partner_name}` : ''}
              </Text>
            </View>
            <GradeBadge text={routeGrade(item, item.type === 'boulder' ? boulderSystem : routeSystem)} />
            <Text style={{ color: item.style === 'attempt' ? th.muted : th.accent, fontWeight: '700', minWidth: 52, textAlign: 'right' }}>{t(`styles.${item.style as AscentStyle}`)}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
