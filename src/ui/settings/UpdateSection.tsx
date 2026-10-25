import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { shouldOffer } from '../../domain/updates';
import { Button, Label } from '../kit';
import { Text } from '../Text';
import { useTheme } from '../theme';
import { fetchLatestRelease, installedCode, installedName, offerRelease } from '../updates';
import type { Run } from './run';

/** Settings › the app's version and a button to look for a newer one. */
export function UpdateSection({ run, busy }: { run: Run; busy: boolean }) {
  const { t } = useTranslation();
  const th = useTheme();
  const check = () => run(async () => {
    const r = await fetchLatestRelease();
    if (r && shouldOffer(r, installedCode(), null)) return offerRelease(r, false);
    Alert.alert(t('updates.title'), r && installedCode() == null ? t('updates.devBuild', { version: r.name }) : t('updates.upToDate'));
  });
  return (
    <>
      <Label>{t('updates.section')}</Label>
      <Text style={{ color: th.muted }}>{t('updates.current', { version: installedName() })}</Text>
      <Button label={t('updates.check')} variant="plain" onPress={check} disabled={busy} />
    </>
  );
}
