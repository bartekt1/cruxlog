import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { F } from './fonts';
import { Text } from './Text';
import { useTheme } from './theme';

/** The small "PRO" mark. */
export function ProBadge() {
  const th = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: th.accent }}>
      <Text style={{ color: th.onAccent, fontFamily: F.semi, fontSize: 11, letterSpacing: 1 }}>{t('pro.badge')}</Text>
    </View>
  );
}

/** In place of a Pro feature: what it gives, with the "PRO" mark; tapping opens the Pro screen. */
export function ProTeaser({ title, hint }: { title: string; hint: string }) {
  const th = useTheme();
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/pro')} accessibilityRole="button" accessibilityLabel={`${title}. ${hint}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 14, minHeight: 56, borderRadius: 14, borderWidth: 1, borderColor: th.line, backgroundColor: th.surface, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ProBadge />
          <Text style={{ color: th.ink, fontFamily: F.semi, fontSize: 16, flexShrink: 1 }}>{title}</Text>
        </View>
        <Text style={{ color: th.muted, fontSize: 13 }}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={th.muted} />
    </Pressable>
  );
}

/** A choice chip for a Pro option (e.g. a card look): marked "PRO", opens the Pro screen. */
export function ProChip({ label }: { label: string }) {
  const th = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Pressable onPress={() => router.push('/pro')} hitSlop={{ top: 4, bottom: 4 }} accessibilityRole="button" accessibilityLabel={`${label}, ${t('pro.title')}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: th.outline, backgroundColor: th.surface, borderRadius: 18, paddingHorizontal: 12, minHeight: 40, marginRight: 8, marginBottom: 8, opacity: pressed ? 0.7 : 1 })}>
      <Text style={{ color: th.muted, fontFamily: F.medium }}>{label}</Text>
      <ProBadge />
    </Pressable>
  );
}
