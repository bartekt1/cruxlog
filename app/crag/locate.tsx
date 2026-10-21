import { Camera, Map, UserLocation, type CameraRef, type MapRef } from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';
import { getCrag, setCragLocation, type CragDetail } from '../../src/db/repo';
import { isLatLng } from '../../src/domain/geo';
import { F } from '../../src/ui/fonts';
import { Button } from '../../src/ui/kit';
import { DEFAULT_VIEW, mapStyle } from '../../src/ui/mapStyles';
import { useSettings } from '../../src/ui/settingsStore';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';
import { currentPosition, useLocation } from '../../src/ui/useLocation';
import { showError } from '../../src/ui/errors';

/** /crag/locate?id=<crag>: set where a crag is, from the phone's GPS or by moving the map under the pin. */
export default function LocateCrag() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const { mapBase } = useSettings();
  const loc = useLocation();
  const map = useRef<MapRef>(null);
  const camera = useRef<CameraRef>(null);
  const [crag, setCrag] = useState<CragDetail | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getCrag(db, id).then((c) => { if (c) setCrag(c); else router.back(); }); }, [db, id, router]);
  // Without a saved position, start where the phone is.
  const moved = useRef(false);
  useEffect(() => {
    if (!crag || moved.current || isLatLng(crag.lat, crag.lng) || !loc.position) return;
    moved.current = true;
    camera.current?.jumpTo({ center: [loc.position.lng, loc.position.lat], zoom: 15 });
  }, [crag, loc.position]);
  if (!crag) return null;
  const has = isLatLng(crag.lat, crag.lng);
  const approx = has && crag.pos_source === 'approx';

  async function save(at: { lat: number; lng: number } | null) {
    setSaving(true);
    try {
      await setCragLocation(db, id, at);
      router.back();
    } catch (e) {
      showError(e);
    } finally {
      setSaving(false);
    }
  }
  async function here() {
    setSaving(true);
    const at = await currentPosition();
    setSaving(false);
    if (!at) { Alert.alert(t('map.title'), t('map.noFix')); return; }
    await save(at);
  }
  async function center() {
    const c = await map.current?.getCenter();
    if (c) await save({ lat: c[1], lng: c[0] });
  }

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <Stack.Screen options={{ title: t('map.locateTitle', { name: crag.name }) }} />
      <View style={{ flex: 1 }}>
        <Map ref={map} style={{ flex: 1 }} mapStyle={mapStyle(mapBase)} attribution logo={false} touchPitch={false}>
          <Camera ref={camera} initialViewState={has ? { center: [crag.lng!, crag.lat!], zoom: approx ? 14 : 16 } : { center: DEFAULT_VIEW.center, zoom: DEFAULT_VIEW.zoom }} />
          {loc.state === 'granted' ? <UserLocation accuracy /> : null}
        </Map>
        {/* The pin stays in the middle; the map moves under it. */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="location" size={44} color={th.accent} style={{ marginBottom: 40 }} />
        </View>
      </View>
      <View style={{ padding: 16, paddingBottom: 24, backgroundColor: th.surface, borderTopWidth: 1, borderTopColor: th.line }}>
        <Text style={{ color: th.muted, fontSize: 13 }}>{approx ? t('map.locateApproxHint') : t('map.locateHint')}</Text>
        <Button label={t('map.saveCenter')} onPress={center} disabled={saving} />
        <Button label={saving ? t('common.saving') : t('map.saveHere')} variant="plain" onPress={here} disabled={saving} />
        {has ? <Button label={t('map.clear')} variant="danger" onPress={() => save(null)} disabled={saving} /> : null}
        <Text style={{ color: th.muted, fontSize: 12, marginTop: 10, fontFamily: F.body }}>{t('map.privacy')}</Text>
      </View>
    </View>
  );
}
