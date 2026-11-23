import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { selfUpdates } from '../../domain/flavor';
import { shouldOffer } from '../../domain/updates';
import { FLAVOR } from '../flavor';
import { Text } from '../Text';
import { useTheme } from '../theme';
import { FoldSection } from '../Fold';
import { Button } from '../kit';
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
  }, t('busy.checkingUpdates'));
  return (
    <FoldSection title={t('updates.section')} summary={t('updates.current', { version: installedName() })}>
      {/* The store build is updated by Google Play and the DEV build by hand; only the GitHub APK looks for updates itself. */}
      {selfUpdates(FLAVOR)
        ? <Button label={t('updates.check')} variant="plain" onPress={check} disabled={busy} />
        : <Text style={{ color: th.muted, marginTop: 4 }}>{t(FLAVOR === 'store' ? 'updates.byStore' : 'updates.devFlavor')}</Text>}
    </FoldSection>
  );
}
