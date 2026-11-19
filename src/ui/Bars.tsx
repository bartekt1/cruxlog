import { View } from 'react-native';
import { F } from './fonts';
import { Text } from './Text';
import { useTheme } from './theme';

/** Horizontal bars with a label on the left and the value on the right. */
export function Bars({ rows }: { rows: { key: string; label: string; ratio: number; value: string }[] }) {
  const th = useTheme();
  return (
    <View style={{ gap: 4 }}>
      {rows.map((r) => (
        <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ width: 52, color: th.muted, fontFamily: F.semi, fontSize: 12, textTransform: 'uppercase' }} numberOfLines={1}>{r.label}</Text>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ height: 16, borderRadius: 4, backgroundColor: th.badge, width: `${Math.max(4, r.ratio * 70)}%` }} />
            <Text style={{ color: th.ink, fontFamily: F.cond, fontSize: 16 }}>{r.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
