import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { CardStyle } from '../domain/settings';
import { CARD_RATIO, CardFooter, PhotoBox, type CardProps, type ShareCardData } from './cardParts';
import { FullCard, NightCard, PolaroidCard, PosterCard, TicketCard, TopoCard } from './cardStyles';
import { Contours } from './Contours';
import { F } from './fonts';
import { Text } from './Text';
import { paperTheme as c } from './theme';

export { CARD_RATIO, CardFooter, type ShareCardData };

const Footer = ({ data, u }: { data: ShareCardData; u: number }) => <CardFooter place={data.place} approxLabel={data.approxLabel} u={u} />;

/** With a photo the picture comes first: it fills the top of the card, the grade sits on it like a label, the text is below. */
function PhotoCard({ data, width, onPhotoLoaded }: CardProps) {
  const u = width / 360;
  return (
    <View collapsable={false} style={{ width, height: width * CARD_RATIO, backgroundColor: c.bg, overflow: 'hidden' }}>
      <PhotoBox data={data} onPhotoLoaded={onPhotoLoaded} style={{ flex: 1 }}>
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
      </PhotoBox>
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

const STYLES: Record<Exclude<CardStyle, 'guide'>, (p: CardProps) => ReactElement> = {
  full: FullCard, polaroid: PolaroidCard, poster: PosterCard, ticket: TicketCard, night: NightCard, topo: TopoCard,
};

/**
 * The picture sent to a friend, in the look the user picked (`look`), the same whatever the phone's theme.
 * Sized by `width` (dp) so the preview and the saved image look the same.
 */
export function ShareCard({ look = 'guide', ...p }: CardProps & { look?: CardStyle }) {
  if (look !== 'guide') { const Card = STYLES[look]; return <Card {...p} />; }
  return <GuideCard {...p} />;
}

/** "Przewodnik": the app's own look on paper. */
function GuideCard({ data, width, onPhotoLoaded }: CardProps) {
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
