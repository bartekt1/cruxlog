import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Image, View, type ViewStyle } from 'react-native';
import type { PhotoFit } from '../domain/settings';
import { fitRect, TopoLines, type DrawnLine } from './TopoLines';
import { F } from './fonts';
import { Text } from './Text';
import { paperTheme as c, type Theme } from './theme';

export type ShareCardData = {
  /** Small heading, e.g. "Przejście" or "Zapraszam na skałę". */
  tag: string;
  title: string;
  /** Grade square; null for a crag. */
  grade: string | null;
  /** The grade in the other systems, e.g. "VI+ UIAA · 6a FR"; empty for a crag. */
  otherGrades: string;
  style: string | null;
  rating: number | null;
  /** Crag and sector, then the area path, then facts such as length and bolts. */
  line: string; path: string; facts: string[];
  /** The crag's name, written by the pin on the map drawing. */
  cragName: string;
  /** Bolts of the route, for the drawn route on the topo card without a photo; null when unknown or for a crag. */
  bolts: number | null;
  date: string | null;
  message: string;
  /** Coordinates already formatted; null when left out. */
  place: { coords: string; approx: boolean } | null;
  approxLabel: string;
  /** A photo of the ascent to show on the card (a file address), or null. */
  photoUri: string | null;
  /** The photo's own size, to fit it whole in the card's frame; and whether it is shown whole or fills the frame (cropped). */
  photoSize: { w: number; h: number } | null;
  photoFit: PhotoFit;
  /** Topo lines to draw over the photo, with the photo's own size (to place them on the cropped picture); null = none. */
  topo: { photoW: number; photoH: number; lines: DrawnLine[] } | null;
};

export type CardProps = { data: ShareCardData; width: number; onPhotoLoaded?: (uri: string) => void };

export const CARD_RATIO = 1.25;
export const BRAND = 'Cruxlog'; // the app's name is not translated

export const stars = (n: number | null) => (n ? '★'.repeat(n) : '');

/** The app's name in capitals. */
export function Brand({ u, color = c.ink, size = 18 }: { u: number; color?: string; size?: number }) {
  return <Text style={{ color, fontFamily: F.display, fontSize: size * u, letterSpacing: 1.5 * u, textTransform: 'uppercase' }}>{BRAND}</Text>;
}

/** The small capital heading, e.g. "PRZEJŚCIE". */
export function Tag({ text, u, color, bg }: { text: string; u: number; color: string; bg?: string }) {
  return (
    <View style={bg ? { alignSelf: 'flex-start', paddingHorizontal: 9 * u, paddingVertical: 5 * u, borderRadius: 6 * u, backgroundColor: bg } : null}>
      <Text numberOfLines={1} style={{ color, fontFamily: F.semi, fontSize: 11 * u, letterSpacing: 1.8 * u, textTransform: 'uppercase' }}>{text}</Text>
    </View>
  );
}

/** The grade in a filled square. */
export function GradeBadge({ grade, u, size, bg, color, radius }: { grade: string; u: number; size: number; bg: string; color: string; radius?: number }) {
  return (
    <View style={{ minWidth: size * u, height: size * u, paddingHorizontal: 0.14 * size * u, borderRadius: (radius ?? size * 0.18) * u, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontFamily: F.display, fontSize: size * 0.46 * u }}>{grade}</Text>
    </View>
  );
}

/** Coordinates with a pin, and "approximate" when they are. Nothing when the place is left out. */
export function PlaceLine({ data, u, pal = c, prefix }: { data: ShareCardData; u: number; pal?: Theme; prefix?: string }) {
  if (!data.place) return <View style={{ flex: 1 }} />;
  const text = [prefix, data.place.coords].filter(Boolean).join(' · ');
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 * u }}>
      <Ionicons name={data.place.approx ? 'location-outline' : 'location'} size={16 * u} color={pal.accent} />
      <View style={{ flexShrink: 1 }}>
        <Text numberOfLines={1} style={{ color: pal.ink, fontFamily: F.semi, fontSize: 12 * u }}>{text}</Text>
        {data.place.approx ? <Text style={{ color: pal.muted, fontSize: 11 * u }}>{data.approxLabel}</Text> : null}
      </View>
    </View>
  );
}

/** Coordinates (with "approximate" when they are) on the left, the app's name on the right. Also used by the trip card. */
export function CardFooter({ place, approxLabel, u, pal = c }: { place: ShareCardData['place']; approxLabel: string; u: number; pal?: Theme }) {
  return (
  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 * u }}>
    {place ? (
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 * u }}>
        <Ionicons name={place.approx ? 'location-outline' : 'location'} size={18 * u} color={pal.accent} />
        <View style={{ flexShrink: 1 }}>
          <Text style={{ color: pal.ink, fontFamily: F.semi, fontSize: 13 * u }}>{place.coords}</Text>
          {place.approx ? <Text style={{ color: pal.muted, fontSize: 12 * u }}>{approxLabel}</Text> : null}
        </View>
      </View>
    ) : <View style={{ flex: 1 }} />}
    <Brand u={u} color={pal.ink} size={20} />
  </View>
  );
}

/**
 * The card's photo in the frame `style`, with its topo lines on it. "fill": it fills the frame and is cropped at the edges.
 * "whole": all of it is seen, and the strips left beside it show the same photo enlarged and blurred.
 */
export function PhotoBox({ data, onPhotoLoaded, style, children }: {
  data: ShareCardData; onPhotoLoaded?: (uri: string) => void; style: ViewStyle; children?: ReactNode;
}) {
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const size = data.topo ? { w: data.topo.photoW, h: data.topo.photoH } : data.photoSize;
  const whole = data.photoFit === 'whole' && size != null && frame.w > 0;
  const r = whole ? fitRect(size.w, size.h, frame.w, frame.h) : coverRect(size, frame.w, frame.h);
  const loaded = () => onPhotoLoaded?.(data.photoUri!);
  return (
    <View style={[{ backgroundColor: c.soft, overflow: 'hidden' }, style]} onLayout={(e) => setFrame({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {whole ? <Image source={{ uri: data.photoUri! }} resizeMode="cover" blurRadius={18} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0.85 }} /> : null}
      {r ? (
        <Image source={{ uri: data.photoUri! }} resizeMode="stretch" style={{ position: 'absolute', left: r.left, top: r.top, width: r.width, height: r.height }}
          onLoad={loaded} onError={loaded} />
      ) : (
        <Image source={{ uri: data.photoUri! }} resizeMode="cover" style={{ width: '100%', height: '100%' }} onLoad={loaded} onError={loaded} />
      )}
      {data.topo && r ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: r.left, top: r.top, width: r.width, height: r.height }}>
          <TopoLines lines={data.topo.lines} width={r.width} height={r.height} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Where a photo sits when it fills the frame and is cropped at the edges ("cover"); null until both sizes are known. */
function coverRect(size: { w: number; h: number } | null, w: number, h: number) {
  if (!size || !size.w || !size.h || !w || !h) return null;
  const s = Math.max(w / size.w, h / size.h);
  return { left: (w - size.w * s) / 2, top: (h - size.h * s) / 2, width: size.w * s, height: size.h * s };
}
