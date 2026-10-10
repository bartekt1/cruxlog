import { Link, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, Text, View } from 'react-native';
import { listAscents, type AscentRow } from '../../src/db/repo';
import { formatDay, isoDate, relativeDay } from '../../src/domain/dates';
import { formatGrade, type AscentStyle } from '../../src/domain/grades';
import { EmptyState, GradeBadge, Screen } from '../../src/ui/kit';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';

export default function Journal() {
  const db = useSQLiteContext();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem, boulderSystem } = useSettings();
  const [rows, setRows] = useState<AscentRow[]>([]);

  useFocusEffect(useCallback(() => { listAscents(db).then(setRows); }, [db]));

  const sections = useMemo(() => {
    const byDay = new Map<string, AscentRow[]>();
    for (const r of rows) byDay.set(r.date, [...(byDay.get(r.date) ?? []), r]);
    return [...byDay.entries()].map(([day, data]) => ({ day, data }));
  }, [rows]);

  const today = isoDate(new Date());
  const dayTitle = (day: string) => {
    const rel = relativeDay(day, today);
    return rel ? t(`common.${rel}`) : formatDay(day, i18n.language, today);
  };

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: 96 }}
        ListEmptyComponent={<EmptyState title={t('journal.empty')} hint={t('journal.emptyHint')} />}
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={{ color: th.muted, fontSize: 12, fontWeight: '600', paddingTop: 16, paddingBottom: 4, backgroundColor: th.bg }}>
            {dayTitle(section.day)}
          </Text>
        )}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: th.line }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: th.ink, fontWeight: '600' }}>{item.route_name}</Text>
              <Text style={{ color: th.muted, fontSize: 12 }}>
                {item.crag_name}{item.attempts > 1 ? ` · ${t('journal.attempts', { count: item.attempts })}` : ''}{item.partner_name ? ` · ${item.partner_name}` : ''}
              </Text>
            </View>
            <GradeBadge text={formatGrade(item.grade_index, item.type === 'boulder' ? boulderSystem : routeSystem, item.type)} />
            <Text style={{ color: item.style === 'attempt' ? th.muted : th.accent, fontWeight: '700', minWidth: 52, textAlign: 'right' }}>{t(`styles.${item.style as AscentStyle}`)}</Text>
          </View>
        )}
      />
      <Link href="/ascent/new" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('journal.add')}
          style={({ pressed }) => ({ position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: th.accent, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, opacity: pressed ? 0.85 : 1 })}
        >
          <Text style={{ color: th.onAccent, fontSize: 28, lineHeight: 30 }}>+</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}
