import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F } from './fonts';
import { IconButton, type IconName } from './icons';
import { Text } from './Text';
import { useTheme } from './theme';

export type MenuItem = { icon: IconName; label: string; onPress: () => void };

/** A "⋯" button that opens its actions in a sheet at the bottom of the screen, within reach of the thumb. */
export function MenuButton({ label, items, size = 24 }: { label: string; items: MenuItem[]; size?: number }) {
  const th = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const pick = (item: MenuItem) => { setOpen(false); item.onPress(); };
  return (
    <>
      <IconButton name="ellipsis-vertical" size={size} label={label} onPress={() => setOpen(true)} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}
          accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
          <Pressable onPress={() => {}} style={{ backgroundColor: th.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 8, paddingBottom: 8 + insets.bottom }}>
            <Text accessibilityRole="header" numberOfLines={1} style={{ color: th.muted, fontFamily: F.semi, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 20, paddingVertical: 8 }}>{label}</Text>
            {items.map((item) => (
              <Pressable key={item.label} onPress={() => pick(item)} accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, minHeight: 52, backgroundColor: pressed ? th.soft : 'transparent' })}>
                <Ionicons name={item.icon} size={22} color={th.accent} />
                <Text style={{ color: th.ink, fontFamily: F.medium, fontSize: 16, flex: 1 }}>{item.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button"
              style={({ pressed }) => ({ alignItems: 'center', justifyContent: 'center', minHeight: 52, marginTop: 4, borderTopWidth: 1, borderTopColor: th.line, opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ color: th.muted, fontFamily: F.semi, fontSize: 16 }}>{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
