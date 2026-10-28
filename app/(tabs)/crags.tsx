import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { listAreas, listCrags, type AreaRow, type CragRow } from '../../src/db/repo';
import { childrenOf, cragCounts, pathLabels } from '../../src/domain/areas';
import { Chip, EmptyState, LinkButton, Label } from '../../src/ui/kit';
import { CragMap } from '../../src/ui/CragMap';
import { useLocation } from '../../src/ui/useLocation';
import { formatDistance, isLatLng, nearest } from '../../src/domain/geo';
import { NavRow } from '../../src/ui/NavRow';
import { PlaceSearch, SearchBar } from '../../src/ui/PlaceSearch';
import { AddMenu, SettingsButton } from '../../src/ui/Menu';
import { useTheme } from '../../src/ui/theme';

/** Crags tab: search, then regions to drill down (region › rejon › group › crag). */
export default function Crags() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const [crags, setCrags] = useState<CragRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const loc = useLocation();
  // "+" (add a crag or a region) beside the settings button in this tab's header.
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AddMenu label={t('areas.addMenu')} items={[
            { icon: 'image-outline', label: t('edit.addCragItem'), onPress: () => router.push('/crag/edit') },
            { icon: 'map-outline', label: t('areas.addItem.region'), onPress: () => router.push('/area/new') },
          ]} />
          <SettingsButton />
        </View>
      ),
    });
  }, [navigation, router, t]);
  useFocusEffect(useCallback(() => {
    listCrags(db).then(setCrags);
    listAreas(db).then(setAreas);
  }, [db]));

  const counts = useMemo(() => cragCounts(areas, crags.map((c) => c.region_id)), [areas, crags]);
  const labels = useMemo(() => pathLabels(areas), [areas]);
  const path = (c: CragRow) => (c.region_id ? labels.get(c.region_id) ?? '' : '');
  const areaPath = (a: AreaRow) => (a.parent_id ? labels.get(a.parent_id) ?? '' : '');
  const regions = childrenOf(areas, null);
  const loose = crags.filter((c) => !c.region_id);
  const openCrag = (c: CragRow) => router.push(`/crag/${c.id}`);
  const near = useMemo(() => (loc.position ? nearest(crags, loc.position, 5, 50_000) : []), [crags, loc.position]);
  const placed = useMemo(() => crags.some((c) => isLatLng(c.lat, c.lng)), [crags]);

  const modeSwitch = (
    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
      <Chip label={t('map.list')} on={mode === 'list'} onPress={() => setMode('list')} />
      <Chip label={t('map.title')} on={mode === 'map'} onPress={() => setMode('map')} />
    </View>
  );

  if (mode === 'map') {
    return (
      <View style={{ flex: 1, backgroundColor: th.bg }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>{modeSwitch}</View>
        <CragMap crags={crags.map((c) => ({ id: c.id, name: c.name, lat: c.lat, lng: c.lng, approx: c.pos_source === 'approx', routes: c.routes, path: path(c) }))} onOpen={(id) => router.push(`/crag/${id}`)} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 88 }} keyboardShouldPersistTaps="handled">
      {modeSwitch}
      <SearchBar value={query} onChange={setQuery} placeholder={t('areas.search')} onFilters={() => router.push('/route/search')} />
      {query.trim() ? (
        <PlaceSearch query={query} areas={areas} crags={crags} areaIds={null} path={path} areaPath={areaPath} onOpenCrag={openCrag} />
      ) : (
        <>
          {!crags.length && !regions.length ? <EmptyState title={t('crags.empty')} hint={t('crags.emptyHint')} /> : null}
          {near.length ? (
            <>
              <Label>{t('map.nearby')}</Label>
              {near.map((c) => (
                <NavRow key={c.id} title={c.name} subtitle={[c.pos_source === 'approx' ? t('map.about', { distance: formatDistance(c.distance, i18n.language) }) : formatDistance(c.distance, i18n.language), path(c), t('crags.routes', { count: c.routes })].filter(Boolean).join(' · ')} onPress={() => openCrag(c)} />
              ))}
            </>
          ) : placed && loc.state !== 'granted' && loc.state !== 'denied' ? (
            <LinkButton label={t('map.showNearby')} onPress={() => { loc.locate(); }} />
          ) : null}
          {regions.length ? <Label>{t('areas.regions')}</Label> : null}
          {regions.map((r) => (
            <NavRow key={r.id} title={r.name} subtitle={t('areas.cragCount', { count: counts.get(r.id) ?? 0 })} onPress={() => router.push(`/area/${r.id}`)} />
          ))}
          {loose.length ? <Label>{t('crags.noRegion')}</Label> : null}
          {loose.map((c) => <NavRow key={c.id} title={c.name} subtitle={t('crags.routes', { count: c.routes })} onPress={() => openCrag(c)} />)}
        </>
      )}
    </ScrollView>
  );
}
