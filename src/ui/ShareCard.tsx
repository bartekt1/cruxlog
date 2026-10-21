import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';
import { Contours } from './Contours';
import { F } from './fonts';
import { Text } from './Text';
import { paperTheme as c } from './theme';

export type ShareCardData = {
  /** Small heading, e.g. "Przejście" or "Zapraszam na skałę". */
  tag: string;
  title: string;
  /** Grade square; null for a crag. */
  grade: string | null;
  style: string | null;
  rating: number | null;
  /** Crag and sector, then the area path, then facts such as length and bolts. */
  line: string; path: string; facts: string[];
  date: string | null;
  message: string;
  /** Coordinates already formatted; null when left out. */
  place: { coords: string; approx: boolean } | null;
  approxLabel: string;
  /** A photo of the ascent to show on the card (a file address), or null. */
  photoUri: string | null;
};

export const CARD_RATIO = 1.25;
const BRAND = 'Cruxlog'; // the app's name is not translated


/** Coordinates (with "approximate" when they are) on the left, the app's name on the right. */
function Footer({ data, u }: { data: ShareCardData; u: number }) {
  return (
  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 * u }}>
    {data.place ? (
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 * u }}>
        <Ionicons name={data.place.approx ? 'location-outline' : 'location'} size={18 * u} color={c.accent} />
        <View style={{ flexShrink: 1 }}>
          <Text style={{ color: c.ink, fontFamily: F.semi, fontSize: 13 * u }}>{data.place.coords}</Text>
          {data.place.approx ? <Text style={{ color: c.muted, fontSize: 12 * u }}>{data.approxLabel}</Text> : null}
        </View>
      </View>
    ) : <View style={{ flex: 1 }} />}
    <Text style={{ color: c.ink, fontFamily: F.display, fontSize: 20 * u, letterSpacing: 1.5 * u, textTransform: 'uppercase' }}>{BRAND}</Text>
  </View>
  );
}

/** With a photo the picture comes first: it fills the top of the card, the grade sits on it like a label, the text is below. */
function PhotoCard({ data, width, onPhotoLoaded }: { data: ShareCardData; width: number; onPhotoLoaded?: (uri: string) => void }) {
  const u = width / 360;
  return (
    <View collapsable={false} style={{ width, height: width * CARD_RATIO, backgroundColor: c.bg, overflow: 'hidden' }}>
      <View style={{ flex: 1, backgroundColor: c.soft }}>
        <Image source={{ uri: data.photoUri! }} resizeMode="cover" style={{ width: '100%', height: '100%' }}
          onLoad={() => onPhotoLoaded?.(data.photoUri!)} onError={() => onPhotoLoaded?.(data.photoUri!)} />
        {data.grade ? (
          <View style={{ position: 'absolute', left: 14 * u, bottom: 12 * u, flexDirection: 'row', alignItems: 'center', gap: 8 * u }}>
            <View style={{ minWidth: 56 * u, height: 56 * u, paddingHorizontal: 8 * u, borderRadius: 10 * u, backgroundColor: c.badge, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: c.onBadge, fontFamily: F.display, fontSize: 26 * u }}>{data.grade}</Text>
            </View>
            {data.style || data.rating ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 * u, paddingHorizontal: 10 * u, height: 36 * u, borderRadius: 18 * u, backgroundColor: c.bg }}>
                {data.style ? <Text style={{ color: c.accent, fontFamily: F.cond, fontSize: 22 * u }}>{data.style}</Text> : null}
                {data.rating ? <Text style={{ color: c.sun, fontSize: 14 * u }}>{'★'.repeat(data.rating)}</Text> : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 20 * u, paddingTop: 12 * u, paddingBottom: 14 * u, gap: 3 * u }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 * u }}>
          <Text style={{ color: c.accent, fontFamily: F.semi, fontSize: 11 * u, letterSpacing: 1.8 * u, textTransform: 'uppercase' }}>{data.tag}</Text>
          {data.date ? <Text style={{ color: c.muted, fontSize: 12 * u }} numberOfLines={1}>{data.date}</Text> : null}
        </View>
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6} style={{ color: c.ink, fontFamily: F.display, fontSize: 34 * u, lineHeight: 36 * u, textTransform: 'uppercase' }}>{data.title}</Text>
        <Text numberOfLines={1} style={{ color: c.ink, fontFamily: F.semi, fontSize: 15 * u }}>{data.line}</Text>
        {data.path ? <Text numberOfLines={1} style={{ color: c.muted, fontSize: 12 * u }}>{data.path}</Text> : null}
        {data.message ? (
          <View style={{ marginTop: 6 * u, borderLeftWidth: 3 * u, borderLeftColor: c.accent, paddingLeft: 10 * u }}>
            <Text numberOfLines={2} style={{ color: c.ink, fontSize: 14 * u, lineHeight: 19 * u }}>{data.message}</Text>
          </View>
        ) : null}
        <View style={{ marginTop: 6 * u }}><Footer data={data} u={u} /></View>
      </View>
    </View>
  );
}

/**
 * The picture sent to a friend. Always on paper, in the app's own look, whatever the phone's theme.
 * Sized by `width` (dp) so the preview and the saved image look the same.
 */
export function ShareCard({ data, width, onPhotoLoaded }: { data: ShareCardData; width: number; onPhotoLoaded?: (uri: string) => void }) {
  if (data.photoUri) return <PhotoCard data={data} width={width} onPhotoLoaded={onPhotoLoaded} />;
  const u = width / 360;
  return (
    <View collapsable={false} style={{ width, height: width * CARD_RATIO, backgroundColor: c.bg, overflow: 'hidden' }}>
      <Contours height={width * 0.5} color={c.contour} />
      <View style={{ flex: 1, padding: 24 * u }}>
        <Text style={{ color: c.accent, fontFamily: F.semi, fontSize: 12 * u, letterSpacing: 2 * u, textTransform: 'uppercase' }}>{data.tag}</Text>
        <Text numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.6}
          style={{ color: c.ink, fontFamily: F.display, fontSize: 46 * u, lineHeight: 48 * u, textTransform: 'uppercase', marginTop: 10 * u }}>
          {data.title}
        </Text>

        {data.grade ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 * u, marginTop: 18 * u }}>
            <View style={{ minWidth: 70 * u, height: 70 * u, paddingHorizontal: 8 * u, borderRadius: 12 * u, backgroundColor: c.badge, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: c.onBadge, fontFamily: F.display, fontSize: 32 * u }}>{data.grade}</Text>
            </View>
            <View>
              {data.style ? <Text style={{ color: c.accent, fontFamily: F.cond, fontSize: 30 * u, lineHeight: 32 * u }}>{data.style}</Text> : null}
              {data.rating ? <Text style={{ color: c.sun, fontSize: 18 * u }}>{'★'.repeat(data.rating)}</Text> : null}
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: 18 * u, gap: 2 * u }}>
          <Text style={{ color: c.ink, fontFamily: F.semi, fontSize: 17 * u }}>{data.line}</Text>
          {data.path ? <Text style={{ color: c.muted, fontSize: 13 * u }}>{data.path}</Text> : null}
          {data.facts.length ? <Text style={{ color: c.muted, fontSize: 13 * u }}>{data.facts.join(' · ')}</Text> : null}
          {data.date ? <Text style={{ color: c.muted, fontSize: 13 * u }}>{data.date}</Text> : null}
        </View>

        {data.message ? (
          <View style={{ marginTop: 18 * u, borderLeftWidth: 3 * u, borderLeftColor: c.accent, paddingLeft: 12 * u }}>
            <Text numberOfLines={4} style={{ color: c.ink, fontSize: 17 * u, lineHeight: 23 * u }}>{data.message}</Text>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />
        <Footer data={data} u={u} />
      </View>
    </View>
  );
}
