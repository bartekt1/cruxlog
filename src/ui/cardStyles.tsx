// The share card looks other than "Przewodnik" (ShareCard.tsx). Each one has a version with the photo and one without.
// Sizes are those of the 360×450 design, times `u`.
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { schematicLine } from '../domain/topo';
import { Brand, CARD_RATIO, GradeBadge, PhotoBox, PlaceLine, stars, Tag, type CardProps, type ShareCardData } from './cardParts';
import { F } from './fonts';
import { Text } from './Text';
import { TopoLines } from './TopoLines';
import { nightTheme as n, paperTheme as c } from './theme';

const Frame = ({ width, bg, children, pad }: { width: number; bg: string; children: ReactNode; pad?: number }) => (
  <View collapsable={false} style={{ width, height: width * CARD_RATIO, backgroundColor: bg, overflow: 'hidden', padding: pad }}>{children}</View>
);

const Title = ({ text, u, size, color, lines = 2 }: { text: string; u: number; size: number; color: string; lines?: number }) => (
  <Text numberOfLines={lines} adjustsFontSizeToFit minimumFontScale={0.6}
    style={{ color, fontFamily: F.display, fontSize: size * u, lineHeight: size * 1.04 * u, textTransform: 'uppercase' }}>{text}</Text>
);

/** Wavy contour lines across a box, as on a map. */
function Waves({ w, h, color, step = 30, from = 40, to, opacity = 1 }: { w: number; h: number; color: string; step?: number; from?: number; to: number; opacity?: number }) {
  const ys: number[] = [];
  for (let y = from; y <= to; y += step) ys.push(y);
  return (
    <Svg width={w} height={h} viewBox={`0 0 360 ${(360 * h) / w}`} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <G fill="none" stroke={color} strokeWidth={1.5} opacity={opacity}>
        {ys.map((y) => <Path key={y} d={`M-10 ${y} Q80 ${y - 30} 170 ${y + 5} T370 ${y - 10}`} />)}
      </G>
    </Svg>
  );
}

/** Style and stars after the tag, e.g. "PRZEJŚCIE · RP · ★★★★". */
const tagLine = (d: ShareCardData) => [d.tag, d.style, stars(d.rating)].filter(Boolean).join(' · ');

/** "Pełny kadr": the photo over the whole card (or rust with contours), the text on a dark strip at the bottom. */
export function FullCard({ data, width, onPhotoLoaded }: CardProps) {
  const u = width / 360;
  return (
    <Frame width={width} bg={c.accent}>
      {data.photoUri ? <PhotoBox data={data} onPhotoLoaded={onPhotoLoaded} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} /> : (
        <Svg width={width} height={width * CARD_RATIO} viewBox="0 0 360 450" style={{ position: 'absolute' }}>
          <G fill="none" stroke={c.bg} strokeWidth={2} opacity={0.14}>
            {[40, 80, 120, 160, 200, 240].map((y) => <Path key={y} d={`M-20 ${y} Q90 ${y - 40} 180 ${y + 10} T380 ${y - 10}`} />)}
          </G>
          <Path d="M40 250 L110 110 L150 160 L200 60 L290 250 Z" fill="none" stroke={c.bg} strokeWidth={3} strokeLinejoin="round" opacity={0.5} />
        </Svg>
      )}
      <View style={{ position: 'absolute', top: 16 * u, left: 16 * u, right: 16 * u, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tag text={data.tag} u={u} color={c.bg} bg={c.ink} />
        <View style={{ paddingHorizontal: 9 * u, paddingVertical: 2 * u, borderRadius: 6 * u, backgroundColor: data.photoUri ? c.ink : 'transparent' }}>
          <Brand u={u} color={c.bg} />
        </View>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18 * u, paddingTop: 16 * u, paddingBottom: 14 * u, backgroundColor: c.ink, gap: 6 * u }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 * u }}>
          {data.grade ? <GradeBadge grade={data.grade} u={u} size={58} bg={n.accent} color={n.onAccent} /> : null}
          <View style={{ flex: 1 }}>
            <Title text={data.title} u={u} size={30} color={n.ink} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * u }}>
              {data.style ? <Text style={{ color: n.accent, fontFamily: F.cond, fontSize: 19 * u }}>{data.style}</Text> : null}
              {data.rating ? <Text style={{ color: n.sun, fontSize: 13 * u }}>{stars(data.rating)}</Text> : null}
              {data.date ? <Text numberOfLines={1} style={{ color: n.muted, fontSize: 12 * u, flexShrink: 1 }}>{data.date}</Text> : null}
            </View>
          </View>
        </View>
        <Text numberOfLines={1} style={{ color: n.ink, fontFamily: F.semi, fontSize: 14 * u }}>
          {data.line}{data.path ? <Text style={{ color: n.muted, fontFamily: F.body }}>{` · ${data.path}`}</Text> : null}
        </Text>
        {data.message ? <Text numberOfLines={2} style={{ color: n.ink, fontSize: 14 * u, lineHeight: 19 * u }}>{`„${data.message}”`}</Text> : null}
        {data.place ? <View style={{ flexDirection: 'row' }}><PlaceLine data={data} u={u} pal={n} /></View> : null}
      </View>
    </Frame>
  );
}

/** "Polaroid": a slightly turned instant photo taped to paper (without a photo: a little map of the crag), a stamp with the grade. */
export function PolaroidCard({ data, width, onPhotoLoaded }: CardProps) {
  const u = width / 360;
  return (
    <Frame width={width} bg={c.soft}>
      <View style={{ position: 'absolute', top: 22 * u, left: 30 * u, width: 300 * u, padding: 12 * u, paddingBottom: 14 * u, backgroundColor: c.surface, transform: [{ rotate: '-2.5deg' }], elevation: 6, gap: 10 * u }}>
        {data.photoUri ? <PhotoBox data={data} onPhotoLoaded={onPhotoLoaded} style={{ width: 276 * u, height: 230 * u }} /> : (
          <View style={{ width: 276 * u, height: 230 * u, backgroundColor: c.bg }}>
            <Svg width={276 * u} height={230 * u} viewBox="0 0 276 230">
              <G fill="none" stroke={c.outline} strokeWidth={1.5} opacity={0.45}>
                <Ellipse cx={150} cy={110} rx={120} ry={80} /><Ellipse cx={150} cy={112} rx={92} ry={60} /><Ellipse cx={152} cy={114} rx={64} ry={42} />
                <Ellipse cx={154} cy={116} rx={38} ry={25} /><Ellipse cx={156} cy={117} rx={14} ry={9} />
              </G>
              <Path d="M156 70C146 70 138 78 138 88c0 13 18 31 18 31s18-18 18-31c0-10-8-18-18-18z" fill={c.accent} />
              <Circle cx={156} cy={88} r={6} fill={c.surface} />
              {data.cragName ? <SvgText x={180} y={96} fontFamily={F.semi} fontSize={13} fill={c.ink}>{data.cragName}</SvgText> : null}
            </Svg>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 * u }}>
          <View style={{ flex: 1 }}>
            <Title text={data.title} u={u} size={28} color={c.ink} lines={1} />
            <Text numberOfLines={1} style={{ color: c.ink, fontFamily: F.semi, fontSize: 13 * u }}>{data.line}</Text>
            {data.date || data.path ? <Text numberOfLines={1} style={{ color: c.muted, fontSize: 12 * u }}>{data.date ?? data.path}</Text> : null}
          </View>
          {data.grade ? (
            <View style={{ width: 66 * u, height: 66 * u, borderWidth: 2.5 * u, borderColor: c.accent, borderRadius: 33 * u, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] }}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: c.accent, fontFamily: F.display, fontSize: 22 * u, lineHeight: 23 * u, maxWidth: 58 * u }}>{data.grade}</Text>
              {data.style ? <Text style={{ color: c.accent, fontFamily: F.cond, fontSize: 14 * u, letterSpacing: 1 * u }}>{data.style}</Text> : null}
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ position: 'absolute', top: 12 * u, left: 150 * u, width: 70 * u, height: 22 * u, backgroundColor: c.line, opacity: 0.85, transform: [{ rotate: '4deg' }] }} />
      <View style={{ position: 'absolute', left: 24 * u, right: 24 * u, bottom: 16 * u, gap: 8 * u }}>
        {data.message || data.rating ? (
          <Text numberOfLines={2} style={{ color: c.ink, fontSize: 15 * u, lineHeight: 20 * u, transform: [{ rotate: '-1deg' }] }}>
            {data.message}{data.rating ? <Text style={{ color: c.sun }}>{`${data.message ? ' ' : ''}${stars(data.rating)}`}</Text> : null}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 * u }}>
          <PlaceLine data={data} u={u} prefix={data.cragName} />
          <Brand u={u} />
        </View>
      </View>
    </Frame>
  );
}

/** "Plakat": the grade huge, like a poster (for a crag its name); the photo, when there is one, in a frame below. */
export function PosterCard({ data, width, onPhotoLoaded }: CardProps) {
  const u = width / 360;
  const photo = !!data.photoUri;
  const big = data.grade ?? data.title;
  const bigSize = data.grade ? (photo ? 150 : 190) : (photo ? 70 : 96);
  return (
    <Frame width={width} bg={c.bg}>
      <Waves w={width} h={(photo ? 170 : 260) * u} color={c.contour} to={photo ? 160 : 250} />
      <View style={{ paddingHorizontal: 20 * u, paddingTop: 16 * u, height: photo ? 170 * u : undefined }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 * u }}>
          <View style={{ flexShrink: 1 }}><Tag text={tagLine(data)} u={u} color={c.accent} /></View>
          {data.date ? <Text numberOfLines={1} style={{ color: c.muted, fontSize: 12 * u }}>{data.date}</Text> : null}
        </View>
        <Text numberOfLines={data.grade ? 1 : 2} adjustsFontSizeToFit minimumFontScale={0.3}
          style={{ color: c.ink, fontFamily: F.display, fontSize: bigSize * u, lineHeight: bigSize * 0.9 * u, letterSpacing: -bigSize * 0.02 * u, marginTop: 8 * u, textTransform: 'uppercase' }}>{big}</Text>
        {!photo && data.otherGrades ? <Text style={{ color: c.muted, fontFamily: F.cond, fontSize: 22 * u }}>{data.otherGrades}</Text> : null}
      </View>
      {photo ? <PhotoBox data={data} onPhotoLoaded={onPhotoLoaded} style={{ height: 150 * u, marginHorizontal: 20 * u, borderRadius: 12 * u }} /> : null}
      <View style={{ flex: 1, paddingHorizontal: 20 * u, paddingTop: (photo ? 12 : 16) * u, paddingBottom: 14 * u, gap: 2 * u }}>
        <Title text={data.grade ? data.title : data.line} u={u} size={photo ? 30 : 34} color={c.ink} lines={1} />
        <Text numberOfLines={1} style={{ color: c.ink, fontFamily: F.semi, fontSize: 14 * u }}>
          {data.grade ? data.line : ''}{data.path ? <Text style={{ color: c.muted, fontFamily: F.body }}>{`${data.grade ? ' · ' : ''}${data.path}`}</Text> : null}
        </Text>
        {data.message ? <Text numberOfLines={2} style={{ color: c.ink, fontSize: 14 * u, marginTop: 2 * u }}>{data.message}</Text> : null}
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8 * u, gap: 10 * u }}>
          <PlaceLine data={data} u={u} />
          <Brand u={u} />
        </View>
      </View>
    </Frame>
  );
}

/** "Bilet": a ticket on rust with a perforated tear line and small labelled boxes for the grade, the style and the date. */
export function TicketCard({ data, width, onPhotoLoaded }: CardProps) {
  const { t } = useTranslation();
  const u = width / 360;
  const photo = !!data.photoUri;
  const inner = 324 * u;
  const cell = (label: string, value: ReactNode) => ({ label, value });
  const big = (text: string, color = c.ink, size = 26) => <Text numberOfLines={1} adjustsFontSizeToFit style={{ color, fontFamily: F.display, fontSize: size * u }}>{text}</Text>;
  const cells = [
    photo && data.grade ? cell(t('cards.grade'), big(data.grade)) : null,
    photo && data.style ? cell(t('cards.style'), big(data.style, c.accent)) : null,
    data.date ? cell(t('cards.date'), <Text numberOfLines={2} style={{ color: c.ink, fontFamily: F.cond, fontSize: 18 * u, lineHeight: 22 * u }}>{data.date}</Text>) : null,
    data.rating ? cell(t('cards.rating'), <Text style={{ color: c.sun, fontSize: 16 * u, lineHeight: 26 * u }}>{stars(data.rating)}</Text>) : null,
  ].filter((x): x is { label: string; value: ReactNode } => x != null).slice(0, 3);
  return (
    <Frame width={width} bg={c.accent} pad={18 * u}>
      <View style={{ flex: 1, borderRadius: 14 * u, backgroundColor: c.surface, overflow: 'hidden' }}>
        {photo ? (
          <PhotoBox data={data} onPhotoLoaded={onPhotoLoaded} style={{ height: 180 * u }}>
            <View style={{ position: 'absolute', top: 12 * u, left: 12 * u }}><Tag text={data.tag} u={u} color={c.accent} bg={c.surface} /></View>
          </PhotoBox>
        ) : (
          <View style={{ height: 180 * u, backgroundColor: c.ink, paddingHorizontal: 16 * u, paddingVertical: 14 * u, justifyContent: 'space-between' }}>
            <Waves w={inner} h={180 * u} color={n.line} step={40} to={160} />
            <Tag text={data.tag} u={u} color={c.accent} bg={c.surface} />
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 * u }}>
              {data.grade ? (
                <Text numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, color: c.bg, fontFamily: F.display, fontSize: 96 * u, lineHeight: 90 * u }}>{data.grade}</Text>
              ) : <Title text={data.line} u={u} size={34} color={c.bg} />}
              {data.style ? <Text style={{ color: n.accent, fontFamily: F.display, fontSize: 34 * u }}>{data.style}</Text> : null}
            </View>
          </View>
        )}
        <View style={{ paddingHorizontal: 16 * u, paddingTop: 10 * u, paddingBottom: 4 * u, gap: 2 * u }}>
          <Title text={data.title} u={u} size={30} color={c.ink} lines={1} />
          <Text numberOfLines={1} style={{ color: c.ink, fontFamily: F.semi, fontSize: 14 * u }}>{data.grade || photo ? data.line : data.facts.join(' · ')}</Text>
          {data.path ? <Text numberOfLines={1} style={{ color: c.muted, fontSize: 12 * u }}>{data.path}</Text> : null}
        </View>
        <View style={{ height: 20 * u, justifyContent: 'center' }}>
          <Svg width={inner} height={2 * u}><Line x1={12 * u} y1={u} x2={inner - 12 * u} y2={u} stroke={c.line} strokeWidth={2 * u} strokeDasharray={`${6 * u},${5 * u}`} /></Svg>
          <View style={{ position: 'absolute', left: -10 * u, width: 20 * u, height: 20 * u, borderRadius: 10 * u, backgroundColor: c.accent }} />
          <View style={{ position: 'absolute', right: -10 * u, width: 20 * u, height: 20 * u, borderRadius: 10 * u, backgroundColor: c.accent }} />
        </View>
        <View style={{ flex: 1, paddingHorizontal: 16 * u, paddingTop: 6 * u, paddingBottom: 12 * u, gap: 6 * u }}>
          {cells.length ? (
            <View style={{ flexDirection: 'row', gap: 8 * u }}>
              {cells.map((x) => (
                <View key={x.label} style={{ flex: 1 }}>
                  <Text style={{ color: c.muted, fontSize: 10 * u, letterSpacing: 1 * u, textTransform: 'uppercase' }}>{x.label}</Text>
                  {x.value}
                </View>
              ))}
            </View>
          ) : null}
          {data.place ? <View style={{ flexDirection: 'row' }}><PlaceLine data={data} u={u} /></View> : null}
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 * u }}>
            <Text numberOfLines={1} style={{ flex: 1, color: c.ink, fontSize: 13 * u }}>{data.message}</Text>
            <Brand u={u} size={16} />
          </View>
        </View>
      </View>
    </Frame>
  );
}

/** "Nocny": the night colours (deep green and orange), like the app's dark theme. */
export function NightCard({ data, width, onPhotoLoaded }: CardProps) {
  const u = width / 360;
  const photo = !!data.photoUri;
  return (
    <Frame width={width} bg={n.bg} pad={18 * u}>
      {photo ? null : (
        <Svg width={width} height={width * CARD_RATIO} viewBox="0 0 360 450" style={{ position: 'absolute', left: 0, top: 0 }}>
          <G fill="none" stroke={n.soft} strokeWidth={2}>
            {[[210, 130], [170, 104], [130, 80], [92, 56], [56, 34], [22, 13]].map(([rx, ry], i) => <Ellipse key={rx} cx={260 + 2 * i} cy={150 + 2 * i} rx={rx} ry={ry} />)}
          </G>
        </Svg>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 * u }}>
        <View style={{ flexShrink: 1 }}><Tag text={data.tag} u={u} color={n.accent} /></View>
        {data.date ? <Text numberOfLines={1} style={{ color: n.muted, fontSize: 12 * u }}>{data.date}</Text> : null}
      </View>
      {photo ? (
        <PhotoBox data={data} onPhotoLoaded={onPhotoLoaded} style={{ height: 210 * u, borderRadius: 16 * u, marginTop: 12 * u, backgroundColor: n.soft }}>
          {data.grade ? <View style={{ position: 'absolute', right: 10 * u, bottom: 10 * u }}><GradeBadge grade={data.grade} u={u} size={60} bg={n.accent} color={n.onAccent} radius={12} /></View> : null}
        </PhotoBox>
      ) : (
        <>
          <View style={{ flex: 1 }} />
          {data.grade ? <View style={{ alignSelf: 'flex-start', marginBottom: 12 * u }}><GradeBadge grade={data.grade} u={u} size={92} bg={n.accent} color={n.onAccent} radius={16} /></View> : null}
        </>
      )}
      <View style={{ marginTop: photo ? 12 * u : 0, gap: 2 * u }}>
        <Title text={data.title} u={u} size={photo ? 32 : 42} color={n.ink} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * u }}>
          {data.style ? <Text style={{ color: n.accent, fontFamily: F.cond, fontSize: (photo ? 20 : 22) * u }}>{data.style}</Text> : null}
          {data.rating ? <Text style={{ color: n.sun, fontSize: 13 * u }}>{stars(data.rating)}</Text> : null}
          <Text numberOfLines={1} style={{ flexShrink: 1, color: n.muted, fontSize: 13 * u }}>{data.line}</Text>
        </View>
        {data.message ? <Text numberOfLines={2} style={{ color: n.ink, fontSize: (photo ? 14 : 15) * u, marginTop: 4 * u }}>{data.message}</Text> : null}
      </View>
      {photo ? <View style={{ flex: 1 }} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 * u, marginTop: 12 * u }}>
        <PlaceLine data={data} u={u} pal={n} prefix={data.cragName} />
        <Brand u={u} color={n.ink} />
      </View>
    </Frame>
  );
}

/** "Topo": the photo of the wall with the route's line (without a photo: a drawn wall with the line and its bolts). */
export function TopoCard({ data, width, onPhotoLoaded }: CardProps) {
  const u = width / 360;
  const top = 340 * u;
  return (
    <Frame width={width} bg={c.bg}>
      {data.photoUri ? <PhotoBox data={data} onPhotoLoaded={onPhotoLoaded} style={{ height: top }} /> : (
        <View style={{ height: top }}>
          <Svg width={width} height={top} viewBox="0 0 360 340">
            <Rect width={360} height={340} fill={c.soft} />
            <Path d="M40 340 L70 60 L130 20 L250 26 L310 90 L330 340 Z" fill={c.surface} stroke={c.outline} strokeWidth={2} strokeLinejoin="round" />
            <Path d="M150 30 L140 120 L160 200 L146 340" fill="none" stroke={c.line} strokeWidth={2} strokeDasharray="4 4" />
            <Path d="M250 60 L262 160" fill="none" stroke={c.line} strokeWidth={2} strokeDasharray="4 4" />
          </Svg>
          {data.grade ? <TopoLines lines={[{ routeId: 'card', mode: 'bolts', points: schematicLine(data.bolts) }]} width={width} height={top} /> : null}
        </View>
      )}
      <View style={{ position: 'absolute', top: 14 * u, left: 14 * u }}><Tag text={data.tag} u={u} color={c.bg} bg={c.ink} /></View>
      <View style={{ flex: 1, paddingHorizontal: 16 * u, paddingTop: 10 * u, paddingBottom: 12 * u, gap: 2 * u }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 * u }}>
          {data.grade ? <GradeBadge grade={data.grade} u={u} size={46} bg={c.badge} color={c.onBadge} radius={8} /> : null}
          <View style={{ flex: 1 }}>
            <Title text={data.title} u={u} size={24} color={c.ink} lines={1} />
            <Text numberOfLines={1} style={{ color: c.muted, fontSize: 12 * u }}>{[data.line, ...data.facts.slice(1), data.date ?? ''].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>
        {data.message ? <Text numberOfLines={1} style={{ color: c.ink, fontSize: 13 * u }}>{data.message}</Text> : null}
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 * u }}>
          <PlaceLine data={data} u={u} />
          <Brand u={u} />
        </View>
      </View>
    </Frame>
  );
}
