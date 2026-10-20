import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { getCrag, listAreas, listCragRoutes, listSectors, routeGoalKinds, type AreaRow, type CragDetail, type CragRouteRow, type SectorRow } from '../../src/db/repo';
import { pathLabel } from '../../src/domain/areas';
import { routeGrade } from '../../src/domain/grades';
import { IconButton } from '../../src/ui/icons';
import { Contours } from '../../src/ui/Contours';
import { F } from '../../src/ui/fonts';
import { Button, EmptyState, Field, GradeBadge, LinkButton, Screen } from '../../src/ui/kit';
import { matches } from '../../src/domain/text';
import { useLocation } from '../../src/ui/useLocation';
import { distanceM, formatDistance, isLatLng } from '../../src/domain/geo';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';

export default function CragScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();
  const [crag, setCrag] = useState<CragDetail | null>(null);
  const [routes, setRoutes] = useState<CragRouteRow[]>([]);
  const [sectorRows, setSectorRows] = useState<SectorRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const loc = useLocation();
  const approx = crag?.pos_source === 'approx';
  const [query, setQuery] = useState('');
  const [goalKinds, setGoalKinds] = useState<Map<string, 'project' | 'wishlist'>>(new Map());

  useFocusEffect(useCallback(() => {
    getCrag(db, id).then((c) => {
      if (!c) { router.back(); return; } // deleted from the edit screen
      setCrag(c);
    });
    listCragRoutes(db, id).then(setRoutes);
    listSectors(db, id).then(setSectorRows);
    listAreas(db).then(setAreas);
    routeGoalKinds(db).then(setGoalKinds);
  }, [db, id, router]));

  // Every sector, also empty ones, so a sector added without routes shows up; while searching, only sectors with hits.
  const sections = useMemo(() => {
    const bySector = new Map<string, CragRouteRow[]>();
    for (const r of routes) if (matches(query, r.name)) bySector.set(r.sector_id, [...(bySector.get(r.sector_id) ?? []), r]);
    return [...sectorRows]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((sec) => ({ sectorId: sec.id, sector: sec.name, data: bySector.get(sec.id) ?? [] }))
      .filter((sec) => !query.trim() || sec.data.length);
  }, [routes, sectorRows, query]);

  const status = (r: CragRouteRow) =>
    r.sends > 0 ? `✓ ${t('crags.sends', { count: r.sends })}` : r.ascents > 0 ? t('crags.tried', { count: r.ascents }) : '';

  return (
    <Screen>
      {crag ? (
        <Stack.Screen
          options={{
            title: crag.name,
            headerRight: () => <IconButton name="create-outline" size={26} label={t('edit.cragTitle')} onPress={() => router.push({ pathname: '/crag/edit', params: { id: crag.id } })} />,
          }}
        />
      ) : null}
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          crag ? (
            <View style={{ paddingTop: 8, gap: 4 }}>
              <Contours height={140} />
              {crag.region_id ? <Text style={{ color: th.muted, fontFamily: F.semi, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' }}>{pathLabel(areas, crag.region_id) || crag.region}</Text> : null}
              {isLatLng(crag.lat, crag.lng) ? (
                <Pressable onPress={() => router.push({ pathname: '/crag/locate', params: { id: crag.id } })} accessibilityRole="button" accessibilityHint={t('map.changeHint')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 }}>
                  <Ionicons name={approx ? 'location-outline' : 'location'} size={18} color={th.accent} />
                  <Text style={{ color: th.ink, fontFamily: F.semi, flexShrink: 1 }}>
                    {[approx ? t('map.approx') : '', loc.position ? t(approx ? 'map.aboutAway' : 'map.away', { distance: formatDistance(distanceM(loc.position, { lat: crag.lat!, lng: crag.lng! }), i18n.language) }) : approx ? '' : t('map.hasPosition')]
                      .filter(Boolean).join(' · ')}
                  </Text>
                  <Text style={{ color: th.accent, fontFamily: F.semi }}>{approx ? t('map.improve') : t('common.change')}</Text>
                </Pressable>
              ) : (
                <LinkButton label={t('map.setPosition')} onPress={() => router.push({ pathname: '/crag/locate', params: { id: crag.id } })} />
              )}
              {crag.description ? <Text style={{ color: th.ink }}>{crag.description}</Text> : null}
              {crag.approach ? <Text style={{ color: th.muted }}>{t('crags.approach')}: {crag.approach}</Text> : null}
              <Text style={{ color: th.muted, fontSize: 12, marginTop: 4 }}>{t('crags.tapRoute')}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button label={t('edit.addRoutes')} onPress={() => router.push({ pathname: '/route/new', params: { cragId: crag.id } })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={t('edit.addSector')} variant="plain" onPress={() => router.push({ pathname: '/sector/new', params: { cragId: crag.id } })} />
                </View>
              </View>
              {routes.length ? (
                <Field value={query} onChangeText={setQuery} placeholder={t('crags.searchRoutes')} accessibilityLabel={t('crags.searchRoutes')} returnKeyType="search" style={{ marginTop: 8 }} />
              ) : null}
            </View>
          ) : null
        }
        ListEmptyComponent={<EmptyState title={query.trim() ? t('crags.noRouteHits', { query: query.trim() }) : t('crags.noRoutes')} />}
        renderSectionHeader={({ section }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 16, paddingBottom: 2, paddingLeft: 4, backgroundColor: th.bg }}>
            <Text accessibilityRole="header" style={{ flex: 1, color: th.muted, fontSize: 12, fontFamily: F.semi, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              {section.sector}
            </Text>
            <IconButton name="add-circle-outline" size={22} label={t('edit.addRouteInSector', { sector: section.sector })}
              onPress={() => router.push({ pathname: '/route/new', params: { cragId: id, sector: section.sector } })} />
            <IconButton name="create-outline" size={20} label={t('edit.sectorTitle')} onPress={() => router.push(`/sector/${section.sectorId}`)} />
          </View>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length ? null : <Text style={{ color: th.muted, fontSize: 12, paddingVertical: 8 }}>{t('edit.emptySector')}</Text>
        }
        // Routes of a sector share one card, like the days in the journal.
        renderItem={({ item, index, section }) => (
          <Pressable
            onPress={() => router.push(`/route/${item.id}`)}
            accessibilityRole="button"
            accessibilityHint={t('crags.logHint')}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingLeft: 12, paddingRight: 4,
              backgroundColor: th.surface, borderColor: th.line, borderLeftWidth: 1, borderRightWidth: 1,
              borderTopWidth: index === 0 ? 1 : 0, borderBottomWidth: index === section.data.length - 1 ? 1 : 0,
              borderTopLeftRadius: index === 0 ? 14 : 0, borderTopRightRadius: index === 0 ? 14 : 0,
              borderBottomLeftRadius: index === section.data.length - 1 ? 14 : 0, borderBottomRightRadius: index === section.data.length - 1 ? 14 : 0,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            {index === 0 ? null : <View style={{ position: 'absolute', top: 0, left: 12, right: 12, height: 1, backgroundColor: th.line }} />}
            <GradeBadge text={routeGrade(item, routeSystem)} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: th.ink, fontFamily: F.semi, fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: item.sends > 0 ? th.accent : th.muted, fontSize: 13 }}>
                {t(`types.${item.type}`)}{status(item) ? ` · ${status(item)}` : ''}
              </Text>
              {goalKinds.has(item.id) ? (
                <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, paddingHorizontal: 8, borderRadius: 10, backgroundColor: th.badge }}>
                  <Ionicons name="flag" size={11} color={th.onBadge} />
                  <Text style={{ color: th.onBadge, fontFamily: F.semi, fontSize: 12 }}>{t(goalKinds.get(item.id) === 'project' ? 'goals.badgeProject' : 'goals.badgeWish')}</Text>
                </View>
              ) : null}
            </View>
            <IconButton name="create-outline" size={20} label={t('edit.routeTitleNamed', { name: item.name })} onPress={() => router.push({ pathname: '/route/edit', params: { id: item.id } })} />
          </Pressable>
        )}
      />
    </Screen>
  );
}
