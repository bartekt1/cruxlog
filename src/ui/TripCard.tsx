import { View } from 'react-native';
import { Contours } from './Contours';
import { F } from './fonts';
import { CardFooter, type ShareCardData } from './ShareCard';
import { Text } from './Text';
import { nightTheme, paperTheme, type Theme } from './theme';

/** Trip cards are taller than the route card, to hold a list of routes. */
export const TRIP_CARD_RATIO = 1.5;

export type TripCardRow = { grade: string; name: string; detail: string; done?: boolean };
export type TripCardData = {
  tag: string; title: string; dates: string; crags: string; path: string;
  /** Sends, days and the hardest grade after the trip; null on an invitation. */
  stats: { value: string; label: string }[] | null;
  rows: TripCardRow[];
  /** "and 5 more routes", or '' when every row fits. */
  more: string;
  /** A line under the list, e.g. "4 of 6 proposed routes done". */
  note: string;
  message: string;
  place: ShareCardData['place'];
  approxLabel: string;
};

/** The picture of a trip: an invitation with the proposed routes, or afterwards what was climbed. Paper look like ShareCard, or the night colours. Also used for one day of the journal. */
export function TripCard({ data, width, night = false }: { data: TripCardData; width: number; night?: boolean }) {
  const c: Theme = night ? nightTheme : paperTheme;
  const u = width / 360;
  return (
    <View collapsable={false} style={{ width, height: width * TRIP_CARD_RATIO, backgroundColor: c.bg, overflow: 'hidden' }}>
      <Contours height={width * 0.45} color={c.contour} />
      <View style={{ flex: 1, padding: 22 * u }}>
        <Text style={{ color: c.accent, fontFamily: F.semi, fontSize: 12 * u, letterSpacing: 2 * u, textTransform: 'uppercase' }}>{data.tag}</Text>
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}
          style={{ color: c.ink, fontFamily: F.display, fontSize: 40 * u, lineHeight: 42 * u, textTransform: 'uppercase', marginTop: 8 * u }}>
          {data.title}
        </Text>
        <Text style={{ color: c.ink, fontFamily: F.semi, fontSize: 17 * u, marginTop: 6 * u }}>{data.dates}</Text>
        {data.crags ? <Text numberOfLines={2} style={{ color: c.ink, fontSize: 15 * u, marginTop: 2 * u }}>{data.crags}</Text> : null}
        {data.path ? <Text numberOfLines={1} style={{ color: c.muted, fontSize: 13 * u }}>{data.path}</Text> : null}

        {data.stats ? (
          <View style={{ flexDirection: 'row', gap: 8 * u, marginTop: 14 * u }}>
            {data.stats.map((s, i) => (
              <View key={s.label} style={{ flex: 1, borderRadius: 10 * u, padding: 8 * u, backgroundColor: i === 0 ? c.badge : c.soft }}>
                <Text style={{ color: i === 0 ? c.onBadge : c.ink, fontFamily: F.display, fontSize: 24 * u, lineHeight: 26 * u }}>{s.value}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: i === 0 ? c.onBadge : c.muted, fontFamily: F.semi, fontSize: 10 * u, letterSpacing: 1 * u, textTransform: 'uppercase' }}>{s.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ marginTop: 14 * u, gap: 6 * u }}>
          {data.rows.map((r, i) => (
            <View key={`${r.name}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 * u }}>
              <View style={{ minWidth: 44 * u, height: 28 * u, paddingHorizontal: 5 * u, borderRadius: 6 * u, backgroundColor: c.badge, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: c.onBadge, fontFamily: F.display, fontSize: 15 * u }}>{r.grade}</Text>
              </View>
              <Text numberOfLines={1} style={{ flex: 1, color: c.ink, fontFamily: F.semi, fontSize: 15 * u }}>{r.done ? '✓ ' : ''}{r.name}</Text>
              <Text numberOfLines={1} style={{ maxWidth: '40%', color: r.done ? c.accent : c.muted, fontFamily: r.done ? F.cond : F.body, fontSize: 13 * u }}>{r.detail}</Text>
            </View>
          ))}
          {data.more ? <Text style={{ color: c.muted, fontSize: 13 * u }}>{data.more}</Text> : null}
          {data.note ? <Text style={{ color: c.ink, fontSize: 13 * u, marginTop: 2 * u }}>{data.note}</Text> : null}
        </View>

        {data.message ? (
          <View style={{ marginTop: 14 * u, borderLeftWidth: 3 * u, borderLeftColor: c.accent, paddingLeft: 12 * u }}>
            <Text numberOfLines={3} style={{ color: c.ink, fontSize: 15 * u, lineHeight: 20 * u }}>{data.message}</Text>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />
        <CardFooter place={data.place} approxLabel={data.approxLabel} u={u} pal={c} />
      </View>
    </View>
  );
}
