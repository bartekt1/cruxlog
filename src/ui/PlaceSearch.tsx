import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { findRoutes, type CragRow, type FoundRoute } from '../db/repo';
import { routeGrade } from '../domain/grades';
import { sectorLine, suggest } from '../domain/text';
import { EmptyState, Label } from './kit';
import { NavRow } from './NavRow';
import { useSettings } from './settingsStore';
import { Text } from './Text';
import { useTheme } from './theme';
import { RouteCard } from './rows';

const ROUTE_LIMIT = 40;

/**
 * Results of the plain search in the Crags tab and on every area screen: crags, then routes, by name.
 * `crags` and `areaIds` limit it to the place (null areaIds = everywhere).
 */
export function PlaceSearch({ query, crags, areaIds, path, onOpenCrag }: {
  query: string; crags: CragRow[]; areaIds: string[] | null; path: (c: CragRow) => string; onOpenCrag: (c: CragRow) => void;
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

  const hits = suggest(crags, query, (c) => c.name, (c) => [path(c)], 15);
  if (!hits.length && !routes.total) return <EmptyState title={t('areas.noHits')} />;

  return (
    <View>
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
