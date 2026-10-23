import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { listCragRoutes, recentRoutes, searchRoutes, warmSearch, type CragChoice, type CragRouteRow, type RouteRow } from '../../db/repo';
import { formatDistance, nearest } from '../../domain/geo';
import { routeGrade } from '../../domain/grades';
import { sectorLine, suggest } from '../../domain/text';
import { Chip, Field, LinkButton, Suggestions, type SuggestionItem } from '../kit';
import { Text } from '../Text';
import { useTheme } from '../theme';
import { useLocation } from '../useLocation';

/**
 * Choosing the route of a new ascent: search by name (routes, and crags to add a route on), or without a query the crags
 * nearby (when the phone already allowed the position) and the routes climbed lately; or a new route.
 */
export function RouteChooser({ crags, cragPath, invalid, onPick, onNewRoute, onCragHit, trip }: {
  crags: CragChoice[]; cragPath: (c: CragChoice) => string; invalid?: boolean;
  /** The routes proposed for a trip on the ascent's day, offered first. */
  trip?: { trip: string; routes: RouteRow[] } | null;
  onPick: (r: RouteRow) => void; onNewRoute: (name: string) => void; onCragHit: (c: CragChoice) => void;
}) {
  const db = useSQLiteContext();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RouteRow[]>([]);
  const [recent, setRecent] = useState<RouteRow[]>([]);
  const loc = useLocation();
  const [nearCrag, setNearCrag] = useState<string | null>(null);
  const [nearRoutes, setNearRoutes] = useState<CragRouteRow[]>([]);

  useEffect(() => {
    recentRoutes(db).then(setRecent);
    warmSearch(db).catch(() => {}); // only a speed-up
  }, [db]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let live = true;
    searchRoutes(db, query).then((r) => { if (live) setResults(r); });
    return () => { live = false; };
  }, [db, query]);

  // Crags within 3 km; one tap lists that crag's routes.
  const near = useMemo(() => (loc.position ? nearest(crags, loc.position, 4, 3_000) : []), [crags, loc.position]);
  useEffect(() => {
    if (!nearCrag) { setNearRoutes([]); return; }
    let live = true;
    listCragRoutes(db, nearCrag).then((x) => { if (live) setNearRoutes(x); });
    return () => { live = false; };
  }, [db, nearCrag]);
  const cragHits = query.trim() ? suggest(crags, query, (c) => c.name, (c) => [cragPath(c)], 3) : [];

  const routeItem = (r: RouteRow): SuggestionItem => ({
    key: r.id, title: r.name, subtitle: sectorLine(r.crag_name, r.sector_name), badge: routeGrade(r, r.grade_system),
  });
  const pickFrom = (rows: RouteRow[]) => (key: string) => {
    const r = rows.find((x) => x.id === key);
    if (r) onPick(r);
  };

  return (
    <View style={{ gap: 4 }}>
      <Field value={query} onChangeText={setQuery} placeholder={t('ascent.searchRoute')} accessibilityLabel={t('ascent.searchRoute')} invalid={invalid} autoCorrect={false} />
      {query.trim() ? (
        <>
          <Suggestions title={cragHits.length ? t('ascent.routesHeader') : undefined} items={results.map(routeItem)} onPick={pickFrom(results)} />
          <Suggestions
            title={t('ascent.cragsHeader')}
            items={cragHits.map((c) => ({ key: c.id, title: c.name, subtitle: [cragPath(c), t('crags.routes', { count: c.routes })].filter(Boolean).join(' · ') }))}
            onPick={(key) => { const c = crags.find((x) => x.id === key); if (c) onCragHit(c); }}
          />
          {cragHits.length ? <Text style={{ color: th.muted, fontSize: 12, marginTop: 2 }}>{t('ascent.cragHitHint')}</Text> : null}
        </>
      ) : (
        <>
          {near.length ? (
            <>
              <Text style={{ color: th.muted, fontSize: 12, marginTop: 6 }}>{t('map.nearby')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {near.map((c) => (
                  <Chip key={c.id} label={`${c.name} · ${c.pos_source === 'approx' ? t('map.about', { distance: formatDistance(c.distance, i18n.language) }) : formatDistance(c.distance, i18n.language)}`} on={nearCrag === c.id} onPress={() => setNearCrag(nearCrag === c.id ? null : c.id)} />
                ))}
              </ScrollView>
            </>
          ) : null}
          {trip && !nearCrag ? <Suggestions title={t('trip.fromTrip', { name: trip.trip })} items={trip.routes.map(routeItem)} onPick={pickFrom(trip.routes)} /> : null}
          {nearCrag ? (
            <Suggestions title={near.find((c) => c.id === nearCrag)?.name} items={nearRoutes.map(routeItem)} onPick={pickFrom(nearRoutes)} />
          ) : (
            <Suggestions title={t('ascent.recent')} items={recent.map(routeItem)} onPick={pickFrom(recent)} />
          )}
        </>
      )}
      {query.trim() && results.length === 0 && cragHits.length === 0 ? <Text style={{ color: th.muted, paddingVertical: 6 }}>{t('ascent.noResults', { query: query.trim() })}</Text> : null}
      <LinkButton label={query.trim() ? t('ascent.newRouteNamed', { name: query.trim() }) : t('ascent.newRoute')} onPress={() => onNewRoute(query.trim())} />
    </View>
  );
}
