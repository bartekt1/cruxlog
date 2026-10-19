import { Camera, GeoJSONSource, Layer, Map, UserLocation, type CameraRef } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { boundsOf, distanceM, formatDistance, isLatLng, type LatLng } from '../domain/geo';
import { F } from './fonts';
import { IconButton } from './icons';
import { Button } from './kit';
import { DEFAULT_VIEW, LABEL_FONT, mapStyle } from './mapStyles';
import { useSettings } from './settingsStore';
import { Text } from './Text';
import { useTheme } from './theme';
import { useLocation } from './useLocation';

/** approx: the position is an estimate from nearby crags; drawn as a hollow dot. */
export type MapCrag = { id: string; name: string; lat: number | null; lng: number | null; approx: boolean; routes: number; path: string };

/** Crags with a position as pins, the user's position, a "show me" button and a switch to the hiking map. */
export function CragMap({ crags, onOpen }: { crags: MapCrag[]; onOpen: (id: string) => void }) {
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { mapBase, setMapBase } = useSettings();
  const loc = useLocation();
  const camera = useRef<CameraRef>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const placed = useMemo(() => crags.filter((c) => isLatLng(c.lat, c.lng)), [crags]);
  const data = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: placed.map((c) => ({ type: 'Feature', id: c.id, properties: { id: c.id, name: c.name, approx: c.approx }, geometry: { type: 'Point', coordinates: [c.lng!, c.lat!] } })),
  }), [placed]);
  const bounds = useMemo(() => boundsOf(placed.map((c) => ({ lat: c.lat!, lng: c.lng! }))), [placed]);
  const crag = placed.find((c) => c.id === selected) ?? null;
  const distanceText = (m: number, approx: boolean) => (approx ? t('map.about', { distance: formatDistance(m, i18n.language) }) : formatDistance(m, i18n.language));

  // "Show me" flies to the position; on the first tap the position arrives a moment after the permission.
  const flyPending = useRef(false);
  const flyTo = (p: LatLng, zoom = 13) => camera.current?.flyTo({ center: [p.lng, p.lat], zoom, duration: 800 });
  async function showMe() {
    if (loc.position) flyTo(loc.position);
    else { flyPending.current = true; await loc.locate(); }
  }
  useEffect(() => {
    if (loc.position && flyPending.current) { flyPending.current = false; flyTo(loc.position); }
  }, [loc.position]);

  return (
    <View style={{ flex: 1 }}>
      <Map style={{ flex: 1 }} mapStyle={mapStyle(mapBase)} attribution logo={false} compass touchPitch={false}
        onPress={() => setSelected(null)}>
        <Camera ref={camera}
          initialViewState={bounds ? { bounds, padding: { top: 60, bottom: 60, left: 40, right: 40 } } : { center: DEFAULT_VIEW.center, zoom: DEFAULT_VIEW.zoom }} />
        <GeoJSONSource id="crags" data={data}
          onPress={(e) => { const id = e.nativeEvent.features[0]?.properties?.id; if (typeof id === 'string') setSelected(id); }}>
          <Layer type="circle" id="crag-dots" paint={{
              'circle-radius': 7, 'circle-color': ['case', ['get', 'approx'], th.surface, th.accent],
              'circle-stroke-width': ['case', ['get', 'approx'], 2.5, 2], 'circle-stroke-color': ['case', ['get', 'approx'], th.accent, th.surface],
            }} />
          <Layer type="symbol" id="crag-names" minzoom={11}
            layout={{ 'text-field': ['get', 'name'], 'text-font': LABEL_FONT, 'text-size': 12, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-optional': true }}
            paint={{ 'text-color': th.ink, 'text-halo-color': th.bg, 'text-halo-width': 1.5 }} />
        </GeoJSONSource>
        {loc.state === 'granted' ? <UserLocation accuracy /> : null}
      </Map>

      <View style={{ position: 'absolute', top: 12, right: 12, gap: 8, alignItems: 'flex-end' }}>
        <Pressable onPress={() => setMapBase(mapBase === 'topo' ? 'standard' : 'topo')} accessibilityRole="button"
          accessibilityLabel={t('map.switchBase')}
          style={({ pressed }) => ({ backgroundColor: th.surface, borderColor: th.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ color: th.ink, fontFamily: F.semi }}>{mapBase === 'topo' ? t('map.standard') : t('map.topo')}</Text>
        </Pressable>
        <View style={{ backgroundColor: th.surface, borderColor: th.line, borderWidth: 1, borderRadius: 12 }}>
          <IconButton name={loc.busy ? 'hourglass-outline' : 'locate'} size={26} label={t('map.showMe')} onPress={showMe} color={th.ink} />
        </View>
      </View>

      {loc.state === 'denied' ? (
        <View style={{ position: 'absolute', top: 12, left: 12, right: 150, backgroundColor: th.surface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: th.line }}>
          <Text style={{ color: th.muted, fontSize: 13 }}>{t('map.denied')}</Text>
        </View>
      ) : null}

      {!placed.length ? (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: th.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: th.line }}>
          <Text style={{ color: th.ink, fontFamily: F.semi }}>{t('map.noPositions')}</Text>
          <Text style={{ color: th.muted, fontSize: 13, marginTop: 2 }}>{t('map.noPositionsHint')}</Text>
        </View>
      ) : null}

      {crag ? (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: th.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: th.line }}>
          <Text style={{ color: th.ink, fontFamily: F.display, fontSize: 24, textTransform: 'uppercase' }}>{crag.name}</Text>
          <Text style={{ color: th.muted, fontSize: 13 }} numberOfLines={1}>
            {[crag.path, t('crags.routes', { count: crag.routes }), loc.position ? distanceText(distanceM(loc.position, { lat: crag.lat!, lng: crag.lng! }), crag.approx) : '']
              .filter(Boolean).join(' · ')}
          </Text>
          {crag.approx ? <Text style={{ color: th.muted, fontSize: 13 }}>{t('map.approx')}</Text> : null}
          <Button label={t('map.openCrag')} onPress={() => onOpen(crag.id)} />
        </View>
      ) : null}
    </View>
  );
}
