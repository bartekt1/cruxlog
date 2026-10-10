import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { HIT } from './kit';
import { useTheme } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** An icon-only button. `label` is read by screen readers, so it is required. */
export function IconButton({ name, label, onPress, size = 22, color }: { name: IconName; label: string; onPress: () => void; size?: number; color?: string }) {
  const th = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.6 : 1 })}
    >
      <Ionicons name={name} size={size} color={color ?? th.accent} />
    </Pressable>
  );
}
