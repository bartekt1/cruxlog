import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, Text, View } from 'react-native';
import { getCrag, listCragRoutes, type CragDetail, type CragRouteRow } from '../../src/db/repo';
import { formatGrade } from '../../src/domain/grades';
import { EmptyState, GradeBadge, Screen } from '../../src/ui/kit';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';

export default function CragScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const { routeSystem, boulderSystem } = useSettings();
  const [crag, setCrag] = useState<CragDetail | null>(null);
  const [routes, setRoutes] = useState<CragRouteRow[]>([]);

  useFocusEffect(useCallback(() => {
    getCrag(db, id).then(setCrag);
    listCragRoutes(db, id).then(setRoutes);
  }, [db, id]));

  const sections = useMemo(() => {
    const bySector = new Map<string, CragRouteRow[]>();
    for (const r of routes) bySector.set(r.sector_name, [...(bySector.get(r.sector_name) ?? []), r]);
    return [...bySector.entries()].map(([sector, data]) => ({ sector, data }));
  }, [routes]);

  const status = (r: CragRouteRow) =>
    r.sends > 0 ? `✓ ${t('crags.sends', { count: r.sends })}` : r.ascents > 0 ? t('crags.tried', { count: r.ascents }) : '';

  return (
    <Screen>
      {crag ? <Stack.Screen options={{ title: crag.name }} /> : null}
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          crag ? (
            <View style={{ paddingTop: 12, gap: 4 }}>
              {crag.region ? <Text style={{ color: th.muted }}>{crag.region}</Text> : null}
              {crag.description ? <Text style={{ color: th.ink }}>{crag.description}</Text> : null}
              {crag.approach ? <Text style={{ color: th.muted }}>{t('crags.approach')}: {crag.approach}</Text> : null}
              <Text style={{ color: th.muted, fontSize: 12, marginTop: 4 }}>{t('crags.tapRoute')}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={<EmptyState title={t('crags.noRoutes')} />}
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={{ color: th.muted, fontSize: 12, fontWeight: '600', paddingTop: 16, paddingBottom: 4, backgroundColor: th.bg, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {section.sector}
          </Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/ascent/new', params: { routeId: item.id } })}
            accessibilityRole="button"
            accessibilityHint={t('crags.logHint')}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: th.line, opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: th.ink, fontWeight: '600' }}>{item.name}</Text>
              <Text style={{ color: item.sends > 0 ? th.accent : th.muted, fontSize: 12 }}>
                {t(`types.${item.type}`)}{status(item) ? ` · ${status(item)}` : ''}
              </Text>
            </View>
            <GradeBadge text={formatGrade(item.grade_index, item.type === 'boulder' ? boulderSystem : routeSystem, item.type)} />
          </Pressable>
        )}
      />
    </Screen>
  );
}
