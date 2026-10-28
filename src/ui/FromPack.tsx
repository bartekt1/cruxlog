import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';
import { ask } from './confirm';
import { runOrAlert } from './errors';
import { Button } from './kit';
import { useSettings } from './settingsStore';
import { Text } from './Text';
import { useTheme } from './theme';

/**
 * In place of "Delete" for something from a pack or an import: it is not deleted one by one (the whole pack is, in Settings).
 * `onReport` sends a report that it no longer exists (crags, sectors and routes); it resolves false when one is already waiting.
 */
export function FromPack({ note, name, onReport }: { note: string; name: string; onReport?: () => Promise<boolean> }) {
  const th = useTheme();
  const { t } = useTranslation();
  const { shareEdits } = useSettings();
  const report = async () => {
    if (!onReport || !(await ask(t('fromPack.reportTitle', { name }), t('fromPack.reportQuestion'), t('fromPack.reportYes'), t('common.cancel')))) return;
    await runOrAlert(async () => {
      const sent = await onReport();
      Alert.alert(t('fromPack.reportTitleDone'), sent ? (shareEdits ? t('fromPack.reported') : t('fromPack.reportedOff')) : t('fromPack.alreadyReported'));
    });
  };
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ color: th.muted }}>{note}</Text>
      {onReport ? <Button label={t('fromPack.report')} variant="plain" onPress={report} /> : null}
    </View>
  );
}
