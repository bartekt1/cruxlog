import { View } from 'react-native';
import { CardFooter } from './cardParts';
import { Contours } from './Contours';
import { F } from './fonts';
import { Text } from './Text';
import { nightTheme, paperTheme, type Theme } from './theme';

/** Stats and goals cards are 9:16, like a phone story, to hold their lists. */
export const STATS_CARD_RATIO = 16 / 9;
export type CardPalette = 'paper' | 'night';
const palette = (p: CardPalette): Theme => (p === 'night' ? nightTheme : paperTheme);

export type StatsCardData = {
  tag: string; title: string;
  stats: { value: string; label: string }[];
  pyramidLabel: string; pyramid: { grade: string; count: number }[];
  /** 12 months of days, each the number of ascents that day. */
  calendarLabel: string; calendar: number[][];
  /** e.g. "Favourite crag: Krowia (12 days)". */
  lines: string[];
  message: string;
};

const Head = ({ tag, title, u, c }: { tag: string; title: string; u: number; c: Theme }) => (
  <>
    <Text style={{ color: c.accent, fontFamily: F.semi, fontSize: 12 * u, letterSpacing: 2 * u, textTransform: 'uppercase' }}>{tag}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{ color: c.ink, fontFamily: F.display, fontSize: 64 * u, lineHeight: 64 * u, textTransform: 'uppercase', marginTop: 4 * u }}>{title}</Text>
  </>
);

const Small = ({ text, u, c }: { text: string; u: number; c: Theme }) => (
  <Text style={{ color: c.muted, fontFamily: F.semi, fontSize: 11 * u, letterSpacing: 1.5 * u, textTransform: 'uppercase', marginTop: 14 * u, marginBottom: 5 * u }}>{text}</Text>
);

const Message = ({ text, u, c }: { text: string; u: number; c: Theme }) => (text ? (
  <View style={{ marginTop: 12 * u, borderLeftWidth: 3 * u, borderLeftColor: c.accent, paddingLeft: 10 * u }}>
    <Text numberOfLines={3} style={{ color: c.ink, fontSize: 15 * u, lineHeight: 20 * u }}>{text}</Text>
  </View>
) : null);

/** "My year": the main numbers, the hardest grades, the year's calendar and the favourite crag. */
export function StatsCard({ data, width, look }: { data: StatsCardData; width: number; look: CardPalette }) {
  const c = palette(look);
  const u = width / 360;
  const max = Math.max(1, ...data.pyramid.map((p) => p.count));
  const dot = (n: number) => (n === 0 ? c.soft : n < 3 ? c.outline : c.accent);
  return (
    <View collapsable={false} style={{ width, height: width * STATS_CARD_RATIO, backgroundColor: c.bg, overflow: 'hidden' }}>
      <Contours height={width * 0.4} color={c.contour} />
      <View style={{ flex: 1, padding: 22 * u }}>
        <Head tag={data.tag} title={data.title} u={u} c={c} />
        <View style={{ flexDirection: 'row', gap: 8 * u, marginTop: 12 * u }}>
          {data.stats.map((s, i) => (
            <View key={s.label} style={{ flex: 1, paddingVertical: 8 * u, paddingHorizontal: 10 * u, borderRadius: 10 * u, backgroundColor: i === 0 ? c.badge : c.surface, borderWidth: i === 0 ? 0 : 1, borderColor: c.line }}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: i === 0 ? c.onBadge : c.ink, fontFamily: F.display, fontSize: 32 * u, lineHeight: 34 * u }}>{s.value}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: i === 0 ? c.onBadge : c.muted, fontSize: 10 * u, textTransform: 'uppercase', letterSpacing: 0.5 * u }}>{s.label}</Text>
            </View>
          ))}
        </View>
        {data.pyramid.length ? (
          <>
            <Small text={data.pyramidLabel} u={u} c={c} />
            <View style={{ gap: 3 * u }}>
              {data.pyramid.map((p) => (
                <View key={p.grade} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * u }}>
                  <Text numberOfLines={1} style={{ width: 56 * u, textAlign: 'right', color: c.ink, fontFamily: F.cond, fontSize: 16 * u }}>{p.grade}</Text>
                  <View style={{ height: 14 * u, borderRadius: 3 * u, backgroundColor: c.badge, width: `${Math.max(3, (p.count / max) * 62)}%` }} />
                  <Text style={{ color: c.muted, fontFamily: F.cond, fontSize: 15 * u }}>{p.count}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
        <Small text={data.calendarLabel} u={u} c={c} />
        <View style={{ gap: 2 * u }}>
          {data.calendar.map((days, m) => (
            <View key={m} style={{ flexDirection: 'row', gap: 1.5 * u }}>
              {days.map((n, d) => <View key={d} style={{ width: 8 * u, height: 8 * u, borderRadius: 1.5 * u, backgroundColor: dot(n) }} />)}
            </View>
          ))}
        </View>
        {data.lines.map((l) => <Text key={l} numberOfLines={1} style={{ color: c.ink, fontFamily: F.semi, fontSize: 14 * u, marginTop: 8 * u }}>{l}</Text>)}
        <Message text={data.message} u={u} c={c} />
        <View style={{ flex: 1 }} />
        <CardFooter place={null} approxLabel="" u={u} pal={c} />
      </View>
    </View>
  );
}

export type GoalsCardItem = { title: string; kind: string; label: string; ratio: number | null; reached: boolean };
export type GoalsCardData = { tag: string; title: string; items: GoalsCardItem[]; message: string };

/** "My goals": each chosen goal with its progress; one goal alone is shown big. */
export function GoalsCard({ data, width, look }: { data: GoalsCardData; width: number; look: CardPalette }) {
  const c = palette(look);
  const u = width / 360;
  const one = data.items.length === 1;
  return (
    <View collapsable={false} style={{ width, height: width * STATS_CARD_RATIO, backgroundColor: c.bg, overflow: 'hidden' }}>
      <Contours height={width * 0.4} color={c.contour} />
      <View style={{ flex: 1, padding: 22 * u }}>
        <Head tag={data.tag} title={data.title} u={u} c={c} />
        <View style={{ gap: (one ? 0 : 14) * u, marginTop: (one ? 40 : 16) * u }}>
          {data.items.map((g) => (
            <View key={g.title}>
              <Text style={{ color: c.muted, fontFamily: F.semi, fontSize: (one ? 13 : 11) * u, letterSpacing: 1.5 * u, textTransform: 'uppercase' }}>{g.kind}</Text>
              <Text numberOfLines={2} style={{ color: c.ink, fontFamily: one ? F.display : F.semi, fontSize: (one ? 40 : 18) * u, lineHeight: (one ? 42 : 22) * u, textTransform: one ? 'uppercase' : 'none' }}>{g.title}</Text>
              {g.ratio != null ? (
                <View style={{ height: (one ? 18 : 9) * u, borderRadius: (one ? 9 : 4.5) * u, backgroundColor: c.soft, overflow: 'hidden', marginTop: (one ? 14 : 6) * u }}>
                  <View style={{ height: '100%', width: `${g.ratio * 100}%`, backgroundColor: c.accent }} />
                </View>
              ) : null}
              <Text numberOfLines={2} style={{ color: g.reached ? c.accent : c.muted, fontFamily: g.reached ? F.semi : F.body, fontSize: (one ? 20 : 13) * u, marginTop: (one ? 8 : 3) * u }}>
                {g.reached ? `✓ ${g.label}` : g.label}
              </Text>
            </View>
          ))}
        </View>
        <Message text={data.message} u={u} c={c} />
        <View style={{ flex: 1 }} />
        <CardFooter place={null} approxLabel="" u={u} pal={c} />
      </View>
    </View>
  );
}
