import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { useTheme } from './theme';

export function Screen({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <View style={{ flex: 1, backgroundColor: t.bg, paddingHorizontal: 16 }}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={{ color: t.muted, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 14, marginBottom: 6 }}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.muted}
      {...props}
      style={[{ borderWidth: 1, borderColor: t.line, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, color: t.ink, backgroundColor: t.surface }, props.style]}
    />
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={{ borderWidth: 1, borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accent : 'transparent', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, marginBottom: 6 }}>
      <Text style={{ color: on ? t.onAccent : t.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Button({ label, onPress, variant = 'primary' }: { label: string; onPress: () => void; variant?: 'primary' | 'plain' }) {
  const t = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: primary ? t.accent : 'transparent', borderWidth: primary ? 0 : 1, borderColor: t.line, borderRadius: 6, paddingVertical: 12, alignItems: 'center', marginTop: 12 }}>
      <Text style={{ color: primary ? t.onAccent : t.ink, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function GradeBadge({ text }: { text: string }) {
  const t = useTheme();
  return <Text style={{ backgroundColor: t.soft, color: t.ink, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, fontVariant: ['tabular-nums'], overflow: 'hidden' }}>{text}</Text>;
}

export const rowStyle = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
