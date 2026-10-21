import { type ReactNode } from 'react';
import { Pressable, TextInput, type TextInputProps, type TextStyle, View, type ViewStyle } from 'react-native';
import { F } from './fonts';
import { Text } from './Text';
import { useTheme } from './theme';

/** Extra touch area so small controls still reach a 44 pt target. */
export const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

export function Screen({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <View style={{ flex: 1, backgroundColor: t.bg, paddingHorizontal: 16 }}>{children}</View>;
}

/** A small upper-case heading over a section or a field. `style` changes the spacing (or adds e.g. flex: 1 in a row). */
export function Label({ children, style, live }: { children: ReactNode; style?: TextStyle; live?: boolean }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="header" accessibilityLiveRegion={live ? 'polite' : undefined}
      style={[{ color: t.muted, fontFamily: F.semi, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 18, marginBottom: 6 }, style]}>
      {children}
    </Text>
  );
}

/** A big condensed heading, e.g. a route name on its screen. */
export function Title({ children, size = 34 }: { children: ReactNode; size?: number }) {
  const t = useTheme();
  return <Text accessibilityRole="header" style={{ color: t.ink, fontFamily: F.display, fontSize: size, lineHeight: size * 1.02, textTransform: 'uppercase' }}>{children}</Text>;
}

export function Field(props: TextInputProps & { invalid?: boolean }) {
  const t = useTheme();
  const { invalid, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={t.muted}
      {...rest}
      style={[{ borderWidth: 1, borderColor: invalid ? t.warn : t.outline, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minHeight: 46, color: t.ink, backgroundColor: t.surface, fontSize: 16, fontFamily: F.body }, style]}
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
      style={({ pressed }) => ({ borderWidth: 1, borderColor: on ? t.badge : t.outline, backgroundColor: on ? t.badge : t.surface, borderRadius: 18, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', marginRight: 8, marginBottom: 8, opacity: pressed ? 0.7 : 1 })}
    >
      <Text style={{ color: on ? t.onBadge : t.ink, fontFamily: F.medium }}>{label}</Text>
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
      style={({ pressed }) => ({ backgroundColor: primary ? t.accent : 'transparent', borderWidth: primary ? 0 : 1.5, borderColor: variant === 'danger' ? t.warn : t.ink, borderRadius: 14, minHeight: 50, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 })}
    >
      <Text style={primary
        ? { color: t.onAccent, fontFamily: F.display, fontSize: 19, letterSpacing: 0.8, textTransform: 'uppercase' }
        : { color: variant === 'danger' ? t.warn : t.ink, fontFamily: F.semi, fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

/** A text-only action, e.g. "Change" or "Cancel". */
export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={HIT} accessibilityRole="button" style={{ paddingVertical: 8, alignSelf: 'flex-start' }}>
      <Text style={{ color: t.accent, fontFamily: F.semi }}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={{ paddingVertical: 32, alignItems: 'center', gap: 6 }}>
      <Text style={{ color: t.ink, fontSize: 20, fontFamily: F.cond, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>{title}</Text>
      {hint ? <Text style={{ color: t.muted, textAlign: 'center' }}>{hint}</Text> : null}
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={{ color: t.warn, marginTop: 10 }}>{children}</Text>;
}

/** The grade in a dark square (light at night), like chalk on a guidebook page. */
export function GradeBadge({ text, size = 'md' }: { text: string; size?: 'sm' | 'md' | 'lg' }) {
  const t = useTheme();
  const box = size === 'lg' ? 62 : size === 'sm' ? 32 : 46;
  return (
    <View style={{ minWidth: box, height: box, paddingHorizontal: 6, borderRadius: size === 'lg' ? 10 : 8, backgroundColor: t.badge, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: t.onBadge, fontFamily: F.display, fontSize: size === 'lg' ? 28 : size === 'sm' ? 15 : 19, fontVariant: ['tabular-nums'] }}>{text}</Text>
    </View>
  );
}

/** A paper card: rounded, with a thin border. */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14 }, style]}>{children}</View>;
}

/** A number with a caption, e.g. sends this season. `strong` fills it with ink. */
export function StatTile({ value, label, strong }: { value: string; label: string; strong?: boolean }) {
  const t = useTheme();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`}
      style={{ flex: 1, borderRadius: 12, padding: 10, backgroundColor: strong ? t.badge : t.surface, borderWidth: strong ? 0 : 1, borderColor: t.line }}>
      <Text style={{ color: strong ? t.onBadge : t.ink, fontFamily: F.display, fontSize: 28, lineHeight: 30 }}>{value}</Text>
      <Text style={{ color: strong ? t.onBadge : t.muted, fontFamily: F.semi, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', opacity: strong ? 0.85 : 1 }}>{label}</Text>
    </View>
  );
}

export type SuggestionItem = { key: string; title: string; subtitle?: string; badge?: string };

/** A short list under a text field; tap a row to pick it. Renders nothing when empty. */
export function Suggestions({ items, onPick, title }: { items: SuggestionItem[]; onPick: (key: string) => void; title?: string }) {
  const t = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, backgroundColor: t.surface, marginTop: 4, overflow: 'hidden' }}>
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
          {it.badge ? <GradeBadge text={it.badge} size="sm" /> : null}
        </Pressable>
      ))}
    </View>
  );
}
