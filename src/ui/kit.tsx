import { type ReactNode } from 'react';
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native';
import { useTheme } from './theme';

/** Extra touch area so small controls still reach a 44 pt target. */
export const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

export function Screen({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <View style={{ flex: 1, backgroundColor: t.bg, paddingHorizontal: 16 }}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text accessibilityRole="header" style={{ color: t.muted, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 16, marginBottom: 6 }}>{children}</Text>;
}

export function Field(props: TextInputProps & { invalid?: boolean }) {
  const t = useTheme();
  const { invalid, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={t.muted}
      {...rest}
      style={[{ borderWidth: 1, borderColor: invalid ? t.warn : t.outline, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 10, minHeight: 44, color: t.ink, backgroundColor: t.surface, fontSize: 16 }, style]}
    />
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{children}</View>;
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      style={({ pressed }) => ({ borderWidth: 1, borderColor: on ? t.accent : t.outline, backgroundColor: on ? t.accent : 'transparent', borderRadius: 18, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', marginRight: 8, marginBottom: 8, opacity: pressed ? 0.7 : 1 })}
    >
      <Text style={{ color: on ? t.onAccent : t.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Button({ label, onPress, variant = 'primary', disabled }: { label: string; onPress: () => void; variant?: 'primary' | 'plain' | 'danger'; disabled?: boolean }) {
  const t = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({ backgroundColor: primary ? t.accent : 'transparent', borderWidth: primary ? 0 : 1, borderColor: variant === 'danger' ? t.warn : t.outline, borderRadius: 6, minHeight: 48, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 })}
    >
      <Text style={{ color: primary ? t.onAccent : variant === 'danger' ? t.warn : t.ink, fontWeight: '600', fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

/** A text-only action, e.g. "Change" or "Cancel". */
export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={HIT} accessibilityRole="button" style={{ paddingVertical: 8, alignSelf: 'flex-start' }}>
      <Text style={{ color: t.accent, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={{ paddingVertical: 32, alignItems: 'center', gap: 6 }}>
      <Text style={{ color: t.ink, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
      {hint ? <Text style={{ color: t.muted, textAlign: 'center' }}>{hint}</Text> : null}
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={{ color: t.warn, marginTop: 10 }}>{children}</Text>;
}

export function GradeBadge({ text }: { text: string }) {
  const t = useTheme();
  return <Text style={{ backgroundColor: t.soft, color: t.ink, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, fontVariant: ['tabular-nums'], overflow: 'hidden' }}>{text}</Text>;
}

export type SuggestionItem = { key: string; title: string; subtitle?: string; badge?: string };

/** A short list under a text field; tap a row to pick it. Renders nothing when empty. */
export function Suggestions({ items, onPick, title }: { items: SuggestionItem[]; onPick: (key: string) => void; title?: string }) {
  const t = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ borderWidth: 1, borderColor: t.line, borderRadius: 6, backgroundColor: t.surface, marginTop: 4 }}>
      {title ? <Text style={{ color: t.muted, fontSize: 12, paddingHorizontal: 12, paddingTop: 8 }}>{title}</Text> : null}
      {items.map((it, i) => (
        <Pressable
          key={it.key}
          onPress={() => onPick(it.key)}
          accessibilityRole="button"
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44,
            borderTopWidth: i === 0 && !title ? 0 : 1, borderTopColor: t.line, opacity: pressed ? 0.6 : 1,
          })}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.ink }}>{it.title}</Text>
            {it.subtitle ? <Text style={{ color: t.muted, fontSize: 12 }}>{it.subtitle}</Text> : null}
          </View>
          {it.badge ? <GradeBadge text={it.badge} /> : null}
        </Pressable>
      ))}
    </View>
  );
}
