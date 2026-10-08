import { Link, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, Text, View } from 'react-native';
import { listAscents, type AscentRow } from '../../src/db/repo';
import { formatGrade, type AscentStyle } from '../../src/domain/grades';
import { GradeBadge, Screen } from '../../src/ui/kit';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';

export default function Journal() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const { routeSystem, boulderSystem } = useSettings();
  const [rows, setRows] = useState<AscentRow[]>([]);

  useFocusEffect(useCallback(() => { listAscents(db).then(setRows); }, [db]));

  const byDay = new Map<string, AscentRow[]>();
  for (const r of rows) byDay.set(r.date, [...(byDay.get(r.date) ?? []), r]);
  const sections = [...byDay.entries()].map(([title, data]) => ({ title, data }));

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<Text style={{ color: th.muted, marginTop: 24 }}>{t('journal.empty')}</Text>}
        renderSectionHeader={({ section }) => (
          <Text style={{ color: th.muted, fontSize: 12, paddingTop: 14, paddingBottom: 4 }}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: th.line }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: th.ink, fontWeight: '600' }}>{item.route_name}</Text>
              <Text style={{ color: th.muted, fontSize: 12 }}>
                {item.crag_name}{item.attempts > 1 ? ` · ${t('journal.attempts', { count: item.attempts })}` : ''}
              </Text>
            </View>
            <GradeBadge text={formatGrade(item.grade_index, item.type === 'boulder' ? boulderSystem : routeSystem, item.type)} />
            <Text style={{ color: th.accent, fontWeight: '700', minWidth: 44, textAlign: 'right' }}>{t(`styles.${item.style as AscentStyle}`)}</Text>
          </View>
        )}
      />
      <Link href="/ascent/new" asChild>
        <Pressable style={{ position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: th.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: th.onAccent, fontSize: 28, lineHeight: 30 }}>+</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}
