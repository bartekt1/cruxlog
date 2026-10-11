import { Pressable, Text, View } from 'react-native';
import { useTheme } from './theme';

/** A tappable list row with a title, an optional subtitle and a chevron. */
export function NavRow({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress: () => void }) {
  const th = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: th.line, opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: th.ink, fontWeight: '600', fontSize: 16 }}>{title}</Text>
        {subtitle ? <Text style={{ color: th.muted, fontSize: 12 }}>{subtitle}</Text> : null}
      </View>
      <Text style={{ color: th.muted, fontSize: 20 }}>›</Text>
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const th = useTheme();
  return (
    <Text accessibilityRole="header" style={{ color: th.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16 }}>
      {children}
    </Text>
  );
}
