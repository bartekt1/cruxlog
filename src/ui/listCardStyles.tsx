// The looks of the list cards other than "Przewodnik" and "Noc": a day of the journal and a trip ("Pełna", "Polaroid",
// "Bilet"), the season's stats and the goals ("Plakat"). Sizes are those of a 360-wide design, times `u`.
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, View } from 'react-native';
import Svg, { G, Line, Path } from 'react-native-svg';
import { Brand, CARD_RATIO, GradeBadge, Tag } from './cardParts';
import { F } from './fonts';
import { STATS_CARD_RATIO, type GoalsCardData, type StatsCardData } from './StatsCard';
import { Text } from './Text';
import { nightTheme as n, paperTheme as c, type Theme } from './theme';
import type { TripCardData, TripCardRow } from './TripCard';

/** A photo of the day for "Pełna" and "Polaroid": the first photo of its ascents. */
export type DayPhoto = { uri: string; width: number; height: number };

/** Contour lines across a box, as on a map (`to`: how far down, in the 360-wide design). */
function Waves({ w, h, color, step = 30, to }: { w: number; h: number; color: string; step?: number; to: number }) {
  const ys: number[] = [];
  for (let y = 40; y <= to; y += step) ys.push(y);
  return (
    <Svg width={w} height={h} viewBox={`0 0 360 ${(360 * h) / w}`} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <G fill="none" stroke={color} strokeWidth={1.5}>
        {ys.map((y) => <Path key={y} d={`M-10 ${y} Q80 ${y - 30} 170 ${y + 5} T370 ${y - 10}`} />)}
      </G>
    </Svg>
  );
}

const Big = ({ text, u, size, color, lines = 1 }: { text: string; u: number; size: number; color: string; lines?: number }) => (
  <Text numberOfLines={lines} adjustsFontSizeToFit minimumFontScale={0.4}
    style={{ color, fontFamily: F.display, fontSize: size * u, lineHeight: size * 0.95 * u, textTransform: 'uppercase' }}>{text}</Text>
);

/** One route of the list: grade, name, style or detail. */
function Row({ r, u, pal, badge, onBadge }: { r: TripCardRow; u: number; pal: Theme; badge: string; onBadge: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 * u }}>
      <GradeBadge grade={r.grade} u={u} size={30} bg={badge} color={onBadge} />
      <Text numberOfLines={1} style={{ flex: 1, color: pal.ink, fontFamily: F.semi, fontSize: 15 * u }}>{r.name}</Text>
      {r.detail ? <Text numberOfLines={1} style={{ maxWidth: '35%', color: pal.accent, fontFamily: F.cond, fontSize: 15 * u }}>{r.detail}</Text> : null}
    </View>
  );
}

/** The photo filling `style`, cropped at the edges; `onLoaded` tells when it is drawn (the picture is taken after that). */
function Photo({ photo, style, onLoaded }: { photo: DayPhoto; style: object; onLoaded?: () => void }) {
  return <Image source={{ uri: photo.uri }} resizeMode="cover" style={style} onLoad={onLoaded} onError={onLoaded} />;
}

type DayProps = { data: TripCardData; width: number; photo: DayPhoto | null; onPhotoLoaded?: () => void };

/** "Pełna": the day's photo over the whole card (rust with contours without one), the routes on a dark strip at the bottom. */
export function DayFullCard({ data, width, photo, onPhotoLoaded }: DayProps) {
  const { t } = useTranslation();
  const u = width / 360;
  const rows = data.rows.slice(0, 4);
  const more = data.rows.length - rows.length + data.rest;
  return (
    <View collapsable={false} style={{ width, height: width * CARD_RATIO, backgroundColor: c.accent, overflow: 'hidden' }}>
      {photo ? <Photo photo={photo} onLoaded={onPhotoLoaded} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} />
        : <Waves w={width} h={width * CARD_RATIO} color={c.bg} to={260} />}
      <View style={{ position: 'absolute', top: 16 * u, left: 16 * u, right: 16 * u, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 * u }}>
        <Tag text={data.tag} u={u} color={c.bg} bg={c.ink} />
        <View style={{ paddingHorizontal: 9 * u, paddingVertical: 3 * u, borderRadius: 6 * u, backgroundColor: c.ink }}>
          <Text numberOfLines={1} style={{ color: c.bg, fontSize: 12 * u }}>{data.dates}</Text>
        </View>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18 * u, paddingTop: 14 * u, paddingBottom: 12 * u, backgroundColor: n.bg, gap: 6 * u }}>
        <Big text={data.title} u={u} size={34} color={n.ink} lines={2} />
        {data.stats ? <Text numberOfLines={1} style={{ color: n.muted, fontSize: 13 * u }}>{data.stats.map((s) => `${s.label} ${s.value}`).join(' · ')}</Text> : null}
        <View style={{ gap: 5 * u, marginTop: 2 * u }}>
          {rows.map((r, i) => <Row key={`${r.name}-${i}`} r={r} u={u} pal={n} badge={n.ink} onBadge={n.bg} />)}
          {more > 0 ? <Text style={{ color: n.muted, fontSize: 12 * u }}>{t('trip.more', { count: more })}</Text> : null}
        </View>
        {data.message ? <Text numberOfLines={2} style={{ color: n.ink, fontSize: 14 * u, lineHeight: 19 * u }}>{`„${data.message}”`}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: n.line, paddingTop: 6 * u, gap: 10 * u }}>
          <Text numberOfLines={1} style={{ flex: 1, color: n.muted, fontSize: 12 * u }}>{[data.path, data.place?.coords].filter(Boolean).join(' · ')}</Text>
          <Brand u={u} color={n.muted} size={15} />
        </View>
      </View>
    </View>
  );
}

/** "Polaroid": the day's photo as a slightly turned instant photo taped to paper, the hardest grade as a stamp. */
export function DayPolaroidCard({ data, width, photo, onPhotoLoaded }: DayProps) {
  const { t } = useTranslation();
  const u = width / 360;
  const hardest = data.stats?.[data.stats.length - 1]?.value;
  const names = data.rows.map((r) => r.name).join(', ');
  return (
    <View collapsable={false} style={{ width, height: width * CARD_RATIO, backgroundColor: c.soft, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: 22 * u, left: 30 * u, width: 300 * u, padding: 12 * u, paddingBottom: 14 * u, backgroundColor: c.surface, transform: [{ rotate: '-2.5deg' }], elevation: 6, gap: 10 * u }}>
        {photo ? <Photo photo={photo} onLoaded={onPhotoLoaded} style={{ width: 276 * u, height: 210 * u, backgroundColor: c.bg }} /> : (
          <View style={{ width: 276 * u, height: 210 * u, backgroundColor: c.ink, overflow: 'hidden' }}>
            <Waves w={276 * u} h={210 * u} color={n.line} step={36} to={220} />
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 * u }}>
          <View style={{ flex: 1 }}>
            <Big text={data.title} u={u} size={28} color={c.ink} />
            <Text numberOfLines={1} style={{ color: c.ink, fontFamily: F.semi, fontSize: 13 * u }}>{names}</Text>
            <Text numberOfLines={1} style={{ color: c.muted, fontSize: 12 * u }}>{data.dates}</Text>
          </View>
          {hardest && hardest !== '–' ? (
            <View style={{ width: 66 * u, height: 66 * u, borderWidth: 2.5 * u, borderColor: c.accent, borderRadius: 33 * u, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] }}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: c.accent, fontFamily: F.display, fontSize: 22 * u, lineHeight: 23 * u, maxWidth: 58 * u }}>{hardest}</Text>
              <Text style={{ color: c.accent, fontFamily: F.cond, fontSize: 11 * u, letterSpacing: 1 * u }}>{t('cards.max')}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ position: 'absolute', top: 12 * u, left: 150 * u, width: 70 * u, height: 22 * u, backgroundColor: c.line, opacity: 0.85, transform: [{ rotate: '4deg' }] }} />
      <View style={{ position: 'absolute', left: 24 * u, right: 24 * u, bottom: 16 * u, gap: 8 * u }}>
        {data.message ? <Text numberOfLines={2} style={{ color: c.ink, fontSize: 15 * u, lineHeight: 20 * u, transform: [{ rotate: '-1deg' }] }}>{data.message}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 * u }}>
          <Text numberOfLines={1} style={{ flex: 1, color: c.muted, fontSize: 12 * u }}>{[data.path, data.place?.coords].filter(Boolean).join(' · ')}</Text>
          <Brand u={u} color={c.muted} size={15} />
        </View>
      </View>
    </View>
  );
}

/**
 * "Bilet": a ticket on rust with a tear line. A day or a trip summary shows its first number big (e.g. "3 przejścia") and
 * the others in small boxes; an invitation shows the trip's name, when, where and how many routes.
 */
export function TicketListCard({ data, width }: { data: TripCardData; width: number }) {
  const { t } = useTranslation();
  const u = width / 360;
  const inner = width - 36 * u;
  const [first, ...others] = data.stats ?? [];
  const cells = data.stats
    ? [...others, { value: data.dates, label: t('cards.when') }].slice(0, 3)
    : [{ value: data.dates, label: t('cards.when') }, { value: data.crags, label: t('cards.cragsLabel') }, { value: String(data.rows.length + data.rest), label: t('cards.routesLabel') }];
  const rows = data.rows.slice(0, data.stats ? 3 : 4);
  const more = data.rows.length - rows.length + data.rest;
  return (
    <View collapsable={false} style={{ width, height: width * CARD_RATIO, backgroundColor: c.accent, padding: 18 * u }}>
      <View style={{ flex: 1, borderRadius: 14 * u, backgroundColor: c.surface, overflow: 'hidden' }}>
        <View style={{ height: 136 * u, backgroundColor: c.ink, paddingHorizontal: 16 * u, paddingVertical: 14 * u, justifyContent: 'space-between' }}>
          <Waves w={inner} h={136 * u} color={n.line} step={40} to={140} />
          <Tag text={data.tag} u={u} color={c.accent} bg={c.surface} />
          {first ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 * u }}>
              <Text numberOfLines={1} style={{ color: c.bg, fontFamily: F.display, fontSize: 72 * u, lineHeight: 66 * u }}>{first.value}</Text>
              <Text numberOfLines={1} style={{ flexShrink: 1, color: n.accent, fontFamily: F.display, fontSize: 28 * u, textTransform: 'uppercase' }}>{first.label}</Text>
            </View>
          ) : <Big text={data.title} u={u} size={44} color={c.bg} lines={2} />}
        </View>
        <View style={{ paddingHorizontal: 16 * u, paddingTop: 8 * u, gap: 2 * u }}>
          {first ? <Big text={data.title} u={u} size={28} color={c.ink} /> : null}
          {data.path ? <Text numberOfLines={1} style={{ color: c.muted, fontSize: 12 * u }}>{data.path}</Text> : null}
        </View>
        <View style={{ height: 20 * u, justifyContent: 'center' }}>
          <Svg width={inner} height={2 * u}><Line x1={12 * u} y1={u} x2={inner - 12 * u} y2={u} stroke={c.line} strokeWidth={2 * u} strokeDasharray={`${6 * u},${5 * u}`} /></Svg>
          <View style={{ position: 'absolute', left: -10 * u, width: 20 * u, height: 20 * u, borderRadius: 10 * u, backgroundColor: c.accent }} />
          <View style={{ position: 'absolute', right: -10 * u, width: 20 * u, height: 20 * u, borderRadius: 10 * u, backgroundColor: c.accent }} />
        </View>
        <View style={{ flex: 1, paddingHorizontal: 16 * u, paddingBottom: 12 * u, gap: 6 * u }}>
          <View style={{ flexDirection: 'row', gap: 8 * u }}>
            {cells.map((x) => (
              <View key={x.label} style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: c.muted, fontSize: 10 * u, letterSpacing: 1 * u, textTransform: 'uppercase' }}>{x.label}</Text>
                <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6} style={{ color: c.ink, fontFamily: F.cond, fontSize: 18 * u, lineHeight: 21 * u }}>{x.value}</Text>
              </View>
            ))}
          </View>
          <View style={{ gap: 4 * u, marginTop: 2 * u }}>
            {rows.map((r, i) => <Row key={`${r.name}-${i}`} r={r} u={u} pal={c} badge={c.ink} onBadge={c.bg} />)}
            {more > 0 ? <Text style={{ color: c.muted, fontSize: 12 * u }}>{t('trip.more', { count: more })}</Text> : null}
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 * u }}>
            <Text numberOfLines={2} style={{ flex: 1, color: c.ink, fontSize: 13 * u }}>{data.message}</Text>
            <Brand u={u} color={c.accent} size={16} />
          </View>
        </View>
      </View>
    </View>
  );
}

/** A poster's frame: paper with contours at the top, the tag and a small line on top, the app's name at the bottom. */
function Poster({ width, tag, side, footer, children }: { width: number; tag: string; side: string; footer: string; children: ReactNode }) {
  const u = width / 360;
  return (
    <View collapsable={false} style={{ width, height: width * STATS_CARD_RATIO, backgroundColor: c.bg, overflow: 'hidden', padding: 20 * u }}>
      <Waves w={width} h={width * 0.75} color={c.contour} to={260} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 * u }}>
        <Tag text={tag} u={u} color={c.surface} bg={c.accent} />
        {side ? <Text numberOfLines={1} style={{ flexShrink: 1, color: c.muted, fontSize: 12 * u }}>{side}</Text> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8 * u, gap: 10 * u }}>
        <Text numberOfLines={2} style={{ flex: 1, color: c.ink, fontSize: 13 * u }}>{footer}</Text>
        <Brand u={u} color={c.muted} size={15} />
      </View>
    </View>
  );
}

/** "Plakat" of the season: the number of sends huge, then the other numbers, the hardest grades and the favourite crag. */
export function StatsPosterCard({ data, width }: { data: StatsCardData; width: number }) {
  const u = width / 360;
  const [first, ...others] = data.stats;
  const max = Math.max(1, ...data.pyramid.map((p) => p.count));
  return (
    <Poster width={width} tag={data.tag} side={data.title} footer={data.message}>
      {first ? (
        <View style={{ marginTop: 10 * u }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: c.ink, fontFamily: F.display, fontSize: 200 * u, lineHeight: 180 * u, letterSpacing: -4 * u }}>{first.value}</Text>
          <Text numberOfLines={1} style={{ color: c.accent, fontFamily: F.display, fontSize: 36 * u, lineHeight: 36 * u, textTransform: 'uppercase' }}>{first.label}</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 * u, marginTop: 14 * u, paddingTop: 10 * u, borderTopWidth: 2 * u, borderTopColor: c.ink }}>
        {others.map((s, i) => (
          <View key={s.label} style={{ flex: 1 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: i === 1 ? c.accent : c.ink, fontFamily: F.display, fontSize: 36 * u, lineHeight: 38 * u }}>{s.value}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: c.muted, fontSize: 12 * u }}>{s.label}</Text>
          </View>
        ))}
      </View>
      {data.pyramid.length ? (
        <View style={{ gap: 3 * u, marginTop: 18 * u }}>
          {data.pyramid.slice(0, 6).map((p) => (
            <View key={p.grade} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * u }}>
              <Text numberOfLines={1} style={{ width: 52 * u, textAlign: 'right', color: c.ink, fontFamily: F.cond, fontSize: 16 * u }}>{p.grade}</Text>
              <View style={{ height: 14 * u, borderRadius: 3 * u, backgroundColor: c.accent, width: `${Math.max(3, (p.count / max) * 62)}%` }} />
              <Text style={{ color: c.muted, fontFamily: F.cond, fontSize: 15 * u }}>{p.count}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {data.lines.map((l) => <Text key={l} numberOfLines={1} style={{ color: c.ink, fontFamily: F.semi, fontSize: 14 * u, marginTop: 10 * u }}>{l}</Text>)}
    </Poster>
  );
}

/** "Plakat" of the goals: how many are done, huge, then each goal with its bar. */
export function GoalsPosterCard({ data, width }: { data: GoalsCardData; width: number }) {
  const { t } = useTranslation();
  const u = width / 360;
  const done = data.items.filter((g) => g.reached).length;
  return (
    <Poster width={width} tag={data.tag} side={data.title} footer={data.message}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 * u, marginTop: 12 * u }}>
        <Text numberOfLines={1} style={{ color: c.ink, fontFamily: F.display, fontSize: 130 * u, lineHeight: 120 * u, letterSpacing: -3 * u }}>{`${done}/${data.items.length}`}</Text>
        <Text numberOfLines={1} style={{ flexShrink: 1, color: c.accent, fontFamily: F.display, fontSize: 26 * u, textTransform: 'uppercase' }}>{t('cards.goalsDone')}</Text>
      </View>
      <View style={{ gap: 12 * u, marginTop: 14 * u, paddingTop: 12 * u, borderTopWidth: 2 * u, borderTopColor: c.ink }}>
        {data.items.map((g) => (
          <View key={g.title} style={{ gap: 4 * u }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 * u }}>
              <Text numberOfLines={2} style={{ flex: 1, color: c.ink, fontFamily: F.semi, fontSize: 15 * u }}>{g.reached ? `✓ ${g.title}` : g.title}</Text>
              <Text numberOfLines={1} style={{ maxWidth: '40%', color: g.reached ? c.accent : c.muted, fontFamily: F.cond, fontSize: 15 * u }}>{g.label}</Text>
            </View>
            {g.ratio != null ? (
              <View style={{ height: 8 * u, borderRadius: 4 * u, backgroundColor: c.soft, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.max(2, g.ratio * 100)}%`, backgroundColor: g.reached ? c.accent : c.outline }} />
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </Poster>
  );
}
