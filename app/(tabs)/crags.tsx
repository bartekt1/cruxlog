import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, Text, View } from 'react-native';
import { listCrags, type CragRow } from '../../src/db/repo';
import { IconButton } from '../../src/ui/icons';
import { Button, EmptyState, Screen } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

export default function Crags() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [rows, setRows] = useState<CragRow[]>([]);
  useFocusEffect(useCallback(() => { listCrags(db).then(setRows); }, [db]));

  // Grouped by region; crags without a region come last.
  const sections = useMemo(() => {
    const byRegion = new Map<string, CragRow[]>();
    for (const r of rows) {
      const key = r.region_id ?? '';
      byRegion.set(key, [...(byRegion.get(key) ?? []), r]);
    }
    return [...byRegion.entries()].map(([regionId, data]) => ({
      regionId, title: data[0].region_name ?? t('crags.noRegion'), own: data[0].region_source === 'user', data,
    }));
  }, [rows, t]);

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={<Button label={t('edit.newCragTitle')} onPress={() => router.push('/crag/edit')} variant="plain" />}
        ListEmptyComponent={<EmptyState title={t('crags.empty')} hint={t('crags.emptyHint')} />}
        renderSectionHeader={({ section }) =>
          sections.length > 1 || section.regionId ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 12, backgroundColor: th.bg }}>
              <Text accessibilityRole="header" style={{ flex: 1, color: th.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {section.title}
              </Text>
              {section.own ? <IconButton name="create-outline" size={20} label={t('edit.regionTitle')} onPress={() => router.push(`/region/${section.regionId}`)} /> : null}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/crag/${item.id}`)}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: th.line, opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: th.ink, fontWeight: '600', fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: th.muted, fontSize: 12 }}>{t('crags.routes', { count: item.routes })}</Text>
            </View>
            <Text style={{ color: th.muted, fontSize: 20 }}>›</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
