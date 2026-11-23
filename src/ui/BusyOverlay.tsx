import { ActivityIndicator, Modal, View } from 'react-native';
import { useBusy } from './busy';
import { F } from './fonts';
import { Text } from './Text';
import { useTheme } from './theme';

/** A card in the middle of the screen while a long action runs: what it does and, when known, how far it got. Blocks taps. */
export function BusyOverlay() {
  const th = useTheme();
  const { text, done, total } = useBusy();
  if (!text) return null;
  const ratio = total ? Math.min(1, done / total) : 0;
  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={() => { /* cannot be cancelled */ }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: th.scrim }}>
        <View accessible accessibilityLiveRegion="polite" accessibilityLabel={total ? `${text} ${done} / ${total}` : text}
          style={{ width: '100%', maxWidth: 360, padding: 20, gap: 14, borderRadius: 16, backgroundColor: th.surface, borderWidth: 1, borderColor: th.line, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={th.accent} />
          <Text style={{ color: th.ink, fontFamily: F.semi, fontSize: 17, textAlign: 'center' }}>{text}</Text>
          {total ? (
            <View style={{ alignSelf: 'stretch', gap: 6 }}>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: th.soft, overflow: 'hidden' }}>
                <View style={{ height: 10, width: `${ratio * 100}%`, backgroundColor: th.accent }} />
              </View>
              <Text style={{ color: th.muted, fontFamily: F.cond, fontSize: 15, textAlign: 'center' }}>{done} / {total}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
