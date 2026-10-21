import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, SectionList, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { getCrag, listAreas, listCragRoutes, listPhotos, listPhotosOf, listSectors, routeGoalKinds, type AreaRow, type CragDetail, type CragRouteRow, type PhotoOwner, type PhotoRow, type SectorRow } from '../../src/db/repo';
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
import { PHOTO_LIMIT } from '../../src/domain/photos';
import { PhotoSection, PhotoStrip } from '../../src/ui/PhotoViews';
import { addPhotosFromGallery } from '../../src/ui/photos';
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
  // Photos of the crag and of its walls (sectors); `photoBusy` names the owner whose photos are being prepared.
  const [cragPhotos, setCragPhotos] = useState<PhotoRow[]>([]);
  const [sectorPhotos, setSectorPhotos] = useState<Map<string, PhotoRow[]>>(new Map());
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    setCragPhotos(await listPhotos(db, 'crag', id));
    const sectors = await listSectors(db, id);
    setSectorPhotos(await listPhotosOf(db, 'sector', sectors.map((s) => s.id)));
  }, [db, id]);

  async function addPhotoTo(owner: PhotoOwner, ownerId: string, have: number) {
    setPhotoBusy(`${owner}:${ownerId}`);
    try {
      await addPhotosFromGallery(db, owner, ownerId, have);
      await loadPhotos();
    } catch (e) {
      Alert.alert(t('photos.title'), t('photos.failed', { message: (e as Error).message }));
    } finally {
      setPhotoBusy(null);
    }
  }
  const openPhotos = (owner: PhotoOwner, ownerId: string, index: number) =>
    router.push({ pathname: '/photo', params: { ownerType: owner, ownerId, index: String(index) } });

  useFocusEffect(useCallback(() => {
    getCrag(db, id).then((c) => {
      if (!c) { router.back(); return; } // deleted from the edit screen
      setCrag(c);
    });
    listCragRoutes(db, id).then(setRoutes);
    listSectors(db, id).then(setSectorRows);
    listAreas(db).then(setAreas);
    routeGoalKinds(db).then(setGoalKinds);
    loadPhotos();
  }, [db, id, router, loadPhotos]));

  // Every sector, also empty ones, so a sector added without routes shows up; while searching, only sectors with hits.
  const sections = useMemo(() => {
    const bySector = new Map<string, CragRouteRow[]>();
    for (const r of routes) if (matches(query, r.name)) bySector.set(r.sector_id, [...(bySector.get(r.sector_id) ?? []), r]);
    return [...sectorRows]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((sec) => ({ sectorId: sec.id, sector: sec.name, photos: sectorPhotos.get(sec.id) ?? [], data: bySector.get(sec.id) ?? [] }))
      .filter((sec) => !query.trim() || sec.data.length);
  }, [routes, sectorRows, sectorPhotos, query]);

  const status = (r: CragRouteRow) =>
    r.sends > 0 ? `✓ ${t('crags.sends', { count: r.sends })}` : r.ascents > 0 ? t('crags.tried', { count: r.ascents }) : '';

  return (
    <Screen>
      {crag ? (
        <Stack.Screen
          options={{
            title: crag.name,
            headerRight: () => (
              <View style={{ flexDirection: 'row' }}>
                <IconButton name="share-social-outline" size={26} label={t('share.title')} onPress={() => router.push({ pathname: '/share', params: { kind: 'crag', id: crag.id } })} />
                <IconButton name="create-outline" size={26} label={t('edit.cragTitle')} onPress={() => router.push({ pathname: '/crag/edit', params: { id: crag.id } })} />
              </View>
            ),
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
              <Text accessibilityRole="header" style={{ color: th.muted, fontSize: 12, fontFamily: F.semi, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 8 }}>{t('photos.cragTitle')}</Text>
              <PhotoSection owner="crag" ids={cragPhotos.map((p) => p.id)} busy={photoBusy === `crag:${crag.id}`}
                onAdd={() => addPhotoTo('crag', crag.id, cragPhotos.length)} onOpen={(i) => openPhotos('crag', crag.id, i)} />
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
          <View style={{ paddingTop: 16, paddingBottom: 2, paddingLeft: 4, backgroundColor: th.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text accessibilityRole="header" style={{ flex: 1, color: th.muted, fontSize: 12, fontFamily: F.semi, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              {section.sector}
            </Text>
            {section.photos.length < PHOTO_LIMIT.sector ? (
              <IconButton name={photoBusy === `sector:${section.sectorId}` ? 'hourglass-outline' : 'camera-outline'} size={22} label={t('photos.addWall', { sector: section.sector })}
                onPress={() => addPhotoTo('sector', section.sectorId, section.photos.length)} />
            ) : null}
            <IconButton name="add-circle-outline" size={22} label={t('edit.addRouteInSector', { sector: section.sector })}
              onPress={() => router.push({ pathname: '/route/new', params: { cragId: id, sector: section.sector } })} />
            <IconButton name="create-outline" size={20} label={t('edit.sectorTitle')} onPress={() => router.push(`/sector/${section.sectorId}`)} />
          </View>
          {section.photos.length ? <PhotoStrip ids={section.photos.map((p) => p.id)} onOpen={(i) => openPhotos('sector', section.sectorId, i)} /> : null}
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
