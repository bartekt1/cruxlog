import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { findRoutes, type AreaRow, type CragRow, type FoundRoute } from '../db/repo';
import { routeGrade } from '../domain/grades';
import { sectorLine, suggest } from '../domain/text';
import { EmptyState, Field, Label } from './kit';
import { IconButton } from './icons';
import { NavRow } from './NavRow';
import { useSettings } from './settingsStore';
import { Text } from './Text';
import { useTheme } from './theme';
import { RouteCard } from './rows';

const ROUTE_LIMIT = 40;

/** The one search field for regions, crags and routes, with the button to the route search with filters beside it. */
export function SearchBar({ value, onChange, placeholder, onFilters }: { value: string; onChange: (q: string) => void; placeholder: string; onFilters: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ flex: 1 }}>
        <Field value={value} onChangeText={onChange} placeholder={placeholder} accessibilityLabel={placeholder} returnKeyType="search" />
      </View>
      <IconButton name="options-outline" size={28} label={t('routeSearch.openHere')} onPress={onFilters} />
    </View>
  );
}

/**
 * Results of the plain search in the Crags tab and on every area screen: regions and rejony, crags, then routes, by name.
 * `areas`, `crags` and `areaIds` limit it to the place (null areaIds = everywhere).
 */
export function PlaceSearch({ query, areas, crags, areaIds, path, areaPath, onOpenCrag }: {
  query: string; areas: AreaRow[]; crags: CragRow[]; areaIds: string[] | null; path: (c: CragRow) => string; areaPath: (a: AreaRow) => string; onOpenCrag: (c: CragRow) => void;
}) {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();
  const [routes, setRoutes] = useState<{ total: number; rows: FoundRoute[] }>({ total: 0, rows: [] });

  // A short pause while typing; a late answer never overwrites a newer one.
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      findRoutes(db, { query, minGrade: null, maxGrade: null, areaIds, status: 'all', type: null }, ROUTE_LIMIT)
        .then((r) => { if (live) setRoutes(r); });
    }, 200);
    return () => { live = false; clearTimeout(timer); };
  }, [db, query, areaIds]);

  const areaHits = suggest(areas, query, (a) => a.name, () => [], 8);
  const hits = suggest(crags, query, (c) => c.name, (c) => [path(c)], 15);
  if (!areaHits.length && !hits.length && !routes.total) return <EmptyState title={t('areas.noHits')} />;

  return (
    <View>
      {areaHits.length ? <Label>{t('areas.areasHeader')}</Label> : null}
      {areaHits.map((a) => <NavRow key={a.id} title={a.name} subtitle={[t(`areas.level.${a.level}`), areaPath(a)].filter(Boolean).join(' · ')} onPress={() => router.push(`/area/${a.id}`)} />)}
      {hits.length ? <Label>{t('areas.cragsHeader')}</Label> : null}
      {hits.map((c) => <NavRow key={c.id} title={c.name} subtitle={[path(c), t('crags.routes', { count: c.routes })].filter(Boolean).join(' · ')} onPress={() => onOpenCrag(c)} />)}
      {routes.total ? <Label>{t('areas.routesHeader')}</Label> : null}
      {routes.rows.map((r) => (
        <RouteCard key={r.id} grade={routeGrade(r, routeSystem)} name={r.name} subtitle={sectorLine(r.crag_name, r.sector_name)}
          onPress={() => router.push(`/route/${r.id}`)} />
      ))}
      {routes.total > routes.rows.length ? (
        <Text style={{ color: th.muted, fontSize: 13, marginTop: 8 }}>{t('areas.moreRoutes', { shown: routes.rows.length, total: routes.total })}</Text>
      ) : null}
    </View>
  );
}
