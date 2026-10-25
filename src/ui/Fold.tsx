import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { F } from './fonts';
import { HIT } from './kit';
import { Text } from './Text';
import { useTheme } from './theme';

/** A settings section that folds: closed it shows its title and one line of state (`summary`), tapped it opens. */
export function FoldSection({ title, summary, warn, children }: { title: string; summary: string; warn?: boolean; children: ReactNode }) {
  const th = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginTop: 12, backgroundColor: th.surface, borderWidth: 1, borderColor: th.line, borderRadius: 14 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, minHeight: 56, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ color: th.ink, fontFamily: F.display, fontSize: 19, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
          {summary ? <Text numberOfLines={1} style={{ color: warn ? th.warn : th.muted, fontSize: 13 }}>{summary}</Text> : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={th.muted} />
      </Pressable>
      {open ? <View style={{ paddingHorizontal: 14, paddingBottom: 14, marginTop: -12 }}>{children}</View> : null}
    </View>
  );
}

/** A one-line description with the full one behind "More". */
export function MoreText({ short, long }: { short: string; long: string }) {
  const th = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={{ color: th.muted }}>{open ? long : short}</Text>
      <Pressable onPress={() => setOpen(!open)} hitSlop={HIT} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
        <Text style={{ color: th.accent, fontFamily: F.semi, fontSize: 13 }}>{open ? t('common.less') : t('common.more')}</Text>
      </Pressable>
    </View>
  );
}
