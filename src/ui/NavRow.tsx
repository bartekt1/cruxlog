import { Pressable, View } from 'react-native';
import { F } from './fonts';
import { Text } from './Text';
import { useTheme } from './theme';

/** A tappable card with a title, an optional subtitle and a chevron. */
export function NavRow({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress: () => void }) {
  const th = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: 10, paddingHorizontal: 14, marginTop: 8, backgroundColor: th.surface, borderWidth: 1, borderColor: th.line, borderRadius: 14, opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: th.ink, fontFamily: F.semi, fontSize: 16 }}>{title}</Text>
        {subtitle ? <Text style={{ color: th.muted, fontSize: 13 }}>{subtitle}</Text> : null}
      </View>
      <Text style={{ color: th.muted, fontFamily: F.cond, fontSize: 24 }}>›</Text>
    </Pressable>
  );
}
