import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { listAreas, listCrags, type AreaRow, type CragRow } from '../../src/db/repo';
import { areaPath, childLevel, childrenOf, cragCounts, descendantIds, pathLabels } from '../../src/domain/areas';
import { IconButton } from '../../src/ui/icons';
import { Button, EmptyState, Field, Label } from '../../src/ui/kit';
import { NavRow } from '../../src/ui/NavRow';
import { PlaceSearch } from '../../src/ui/PlaceSearch';
import { useTheme } from '../../src/ui/theme';

/** One region, rejon or group: a search inside it, its sub-areas and the crags directly in it. */
export default function AreaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [crags, setCrags] = useState<CragRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[] | null>(null);
  useFocusEffect(useCallback(() => {
    listCrags(db).then(setCrags);
    listAreas(db).then(setAreas);
  }, [db]));

  const area = areas?.find((a) => a.id === id) ?? null;
  const counts = useMemo(() => cragCounts(areas ?? [], crags.map((c) => c.region_id)), [areas, crags]);
  const [query, setQuery] = useState('');
  // The search covers this area and everything below it.
  const inside = useMemo(() => (areas ? [...descendantIds(areas, id)] : []), [areas, id]);
  const insideCrags = useMemo(() => { const set = new Set(inside); return crags.filter((c) => c.region_id != null && set.has(c.region_id)); }, [crags, inside]);
  const labels = useMemo(() => pathLabels(areas ?? []), [areas]);
  const path = (c: CragRow) => (c.region_id ? labels.get(c.region_id) ?? '' : '');
  const gone = areas != null && !area;
  useEffect(() => { if (gone) router.back(); }, [gone, router]); // deleted from the edit screen
  if (!areas || !area) return null;

  const parents = areaPath(areas, id).slice(0, -1);
  const children = childrenOf(areas, id);
  const here = crags.filter((c) => c.region_id === id);
  const next = childLevel(area);

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: area.name,
          headerRight: () => <IconButton name="create-outline" size={26} label={t(`areas.edit.${area.level}`)} onPress={() => router.push(`/region/${id}`)} />,
        }}
      />
      <Text style={{ color: th.muted }}>
        {[t(`areas.level.${area.level}`), parents.map((p) => p.name).join(' › ')].filter(Boolean).join(' · ')}
      </Text>
      <Field value={query} onChangeText={setQuery} placeholder={t('areas.searchIn', { name: area.name })} accessibilityLabel={t('areas.searchIn', { name: area.name })} returnKeyType="search" style={{ marginTop: 10 }} />
      <Button label={t('routeSearch.openHere')} variant="plain" onPress={() => router.push({ pathname: '/route/search', params: { areaId: id } })} />
      {query.trim() ? (
        <PlaceSearch query={query} crags={insideCrags} areaIds={inside} path={path} onOpenCrag={(c) => router.push(`/crag/${c.id}`)} />
      ) : (
        <>
        {children.length ? <Label>{t(next === 'group' ? 'areas.groups' : 'areas.areas')}</Label> : null}
        {children.map((a) => (
          <NavRow key={a.id} title={a.name} subtitle={t('areas.cragCount', { count: counts.get(a.id) ?? 0 })} onPress={() => router.push(`/area/${a.id}`)} />
        ))}
        {here.length ? <Label>{t('crags.title')}</Label> : null}
        {here.map((c) => <NavRow key={c.id} title={c.name} subtitle={t('crags.routes', { count: c.routes })} onPress={() => router.push(`/crag/${c.id}`)} />)}
        {!children.length && !here.length ? <EmptyState title={t('areas.empty')} /> : null}
        </>
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {next ? (
          <View style={{ flex: 1 }}>
            <Button label={t(`areas.add.${next}`)} variant="plain" onPress={() => router.push({ pathname: '/area/new', params: { parentId: id } })} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button label={t('edit.newCragTitle')} onPress={() => router.push({ pathname: '/crag/edit', params: { areaId: id } })} />
        </View>
      </View>
    </ScrollView>
  );
}
