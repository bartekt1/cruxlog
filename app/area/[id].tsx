import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { listAreas, listCrags, type AreaRow, type CragRow } from '../../src/db/repo';
import { areaPath, childLevel, childrenOf, cragCounts, descendantIds, pathLabels } from '../../src/domain/areas';
import { IconButton } from '../../src/ui/icons';
import { EmptyState, Label, Loading } from '../../src/ui/kit';
import { AddMenu } from '../../src/ui/Menu';
import { NavRow } from '../../src/ui/NavRow';
import { PlaceSearch, SearchBar } from '../../src/ui/PlaceSearch';
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
  const insideAreas = useMemo(() => { const set = new Set(inside); return (areas ?? []).filter((a) => a.id !== id && set.has(a.id)); }, [areas, inside, id]);
  const insideCrags = useMemo(() => { const set = new Set(inside); return crags.filter((c) => c.region_id != null && set.has(c.region_id)); }, [crags, inside]);
  const labels = useMemo(() => pathLabels(areas ?? []), [areas]);
  const path = (c: CragRow) => (c.region_id ? labels.get(c.region_id) ?? '' : '');
  const parentPath = (a: AreaRow) => (a.parent_id ? labels.get(a.parent_id) ?? '' : '');
  const gone = areas != null && !area;
  useEffect(() => { if (gone) router.back(); }, [gone, router]); // deleted from the edit screen
  if (!areas || !area) return <Loading />;

  const parents = areaPath(areas, id).slice(0, -1);
  const children = childrenOf(areas, id);
  const here = crags.filter((c) => c.region_id === id);
  const next = childLevel(area);

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: area.name,
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <AddMenu size={26} label={area.name} items={[
                { icon: 'image-outline', label: t('edit.addCragItem'), onPress: () => router.push({ pathname: '/crag/edit', params: { areaId: id } }) },
                ...(next ? [{ icon: 'map-outline' as const, label: t(`areas.addItem.${next}`), onPress: () => router.push({ pathname: '/area/new', params: { parentId: id } }) }] : []),
              ]} />
              <IconButton name="create-outline" size={26} label={t(`areas.edit.${area.level}`)} onPress={() => router.push(`/region/${id}`)} />
            </View>
          ),
        }}
      />
      <Text style={{ color: th.muted }}>
        {[t(`areas.level.${area.level}`), parents.map((p) => p.name).join(' › ')].filter(Boolean).join(' · ')}
      </Text>
      <View style={{ marginTop: 10 }}>
        <SearchBar value={query} onChange={setQuery} placeholder={t('areas.searchIn', { name: area.name })} onFilters={() => router.push({ pathname: '/route/search', params: { areaId: id } })} />
      </View>
      {query.trim() ? (
        <PlaceSearch query={query} areas={insideAreas} crags={insideCrags} areaIds={inside} path={path} areaPath={parentPath} onOpenCrag={(c) => router.push(`/crag/${c.id}`)} />
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
    </ScrollView>
  );
}
