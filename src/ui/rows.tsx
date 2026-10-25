// Rows and buttons repeated across screens, so they look and behave the same everywhere.
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';
import { type ReactNode } from 'react';
import { Pressable, Switch, View, type ViewStyle } from 'react-native';
import { F } from './fonts';
import { GradeBadge } from './kit';
import { Text } from './Text';
import { useTheme } from './theme';

/** "✓ sends: 2", "tried: 3" or '' for a route the user has not climbed. */
export function routeStatus(t: TFunction, r: { sends: number; ascents: number }): string {
  return r.sends > 0 ? `✓ ${t('crags.sends', { count: r.sends })}` : r.ascents > 0 ? t('crags.tried', { count: r.ascents }) : '';
}

/** A route as a card: grade square, name, a muted line and an optional third line (e.g. the status, in rust once sent). */
export function RouteCard({ grade, name, subtitle, note, noteAccent, onPress }: {
  grade: string; name: string; subtitle?: string; note?: string; noteAccent?: boolean; onPress: () => void;
}) {
  const th = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, padding: 10,
        backgroundColor: th.surface, borderWidth: 1, borderColor: th.line, borderRadius: 14, opacity: pressed ? 0.6 : 1,
      })}>
      <GradeBadge text={grade} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: th.ink, fontFamily: F.semi, fontSize: 16 }}>{name}</Text>
        {subtitle ? <Text style={{ color: th.muted, fontSize: 13 }} numberOfLines={1}>{subtitle}</Text> : null}
        {note ? <Text style={{ color: noteAccent ? th.accent : th.muted, fontSize: 13 }}>{note}</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * One row of a card shared by several rows (the ascents of a day, the routes of a sector): the first and last rows carry
 * the rounded corners, the others a thin line on top.
 */
export function GroupedRow({ first, last, onPress, accessibilityHint, style, children }: {
  first: boolean; last: boolean; onPress: () => void; accessibilityHint?: string; style?: ViewStyle; children: ReactNode;
}) {
  const th = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint={accessibilityHint}
      style={({ pressed }) => [{
        flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12,
        backgroundColor: th.surface, borderColor: th.line, borderLeftWidth: 1, borderRightWidth: 1,
        borderTopWidth: first ? 1 : 0, borderBottomWidth: last ? 1 : 0,
        borderTopLeftRadius: first ? 14 : 0, borderTopRightRadius: first ? 14 : 0,
        borderBottomLeftRadius: last ? 14 : 0, borderBottomRightRadius: last ? 14 : 0,
        opacity: pressed ? 0.6 : 1,
      }, style]}>
      {first ? null : <View style={{ position: 'absolute', top: 0, left: 12, right: 12, height: 1, backgroundColor: th.line }} />}
      {children}
    </Pressable>
  );
}

/** A switch with its label; the whole row is the touch target and TalkBack reads it as one switch. */
export function SwitchRow({ label, value, onChange, marginTop = 10 }: { label: string; value: boolean; onChange: (v: boolean) => void; marginTop?: number }) {
  const th = useTheme();
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop, minHeight: 44 }}>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: th.line, true: th.accent }} thumbColor={th.surface} importantForAccessibility="no" />
      <Text style={{ color: th.ink, flex: 1 }}>{label}</Text>
    </Pressable>
  );
}

/** The screen's main action in the "call to action" colour, e.g. "Log another ascent" or "Save the line". */
export function CtaButton({ label, onPress, icon, disabled, style }: {
  label: string; onPress: () => void; icon?: 'add'; disabled?: boolean; style?: ViewStyle;
}) {
  const th = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: th.cta, borderRadius: 14, minHeight: 54,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      }, style]}>
      {icon ? <Ionicons name={icon} size={24} color={th.onCta} /> : null}
      <Text style={{ color: th.onCta, fontFamily: F.display, fontSize: 20, letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</Text>
    </Pressable>
  );
}
