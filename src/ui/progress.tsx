import { View } from 'react-native';
import type { AscentRow } from '../db/repo';
import type { StatAscent } from '../domain/stats';
import { F } from './fonts';
import { Text } from './Text';
import { useTheme } from './theme';

/** An ascent as the stats functions read it. */
export const toStat = (r: AscentRow): StatAscent => ({
  date: r.date, type: r.type, gradeIndex: r.grade_index, style: r.style, routeId: r.route_id, routeName: r.route_name,
  cragName: r.crag_name, partner: r.partner_name, attempts: r.attempts,
});

/** A progress bar with its caption. */
export function ProgressBar({ ratio, reached, label }: { ratio: number; reached: boolean; label: string }) {
  const th = useTheme();
  return (
    <View style={{ marginTop: 8, gap: 4 }} accessible accessibilityLabel={label}>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: th.soft, overflow: 'hidden' }}>
        <View style={{ height: 10, width: `${ratio * 100}%`, backgroundColor: th.accent }} />
      </View>
      <Text style={{ color: reached ? th.accent : th.muted, fontSize: 13, fontFamily: reached ? F.semi : F.body }}>{reached ? `✓ ${label}` : label}</Text>
    </View>
  );
}

