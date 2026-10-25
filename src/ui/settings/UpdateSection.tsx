import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { shouldOffer } from '../../domain/updates';
import { FoldSection } from '../Fold';
import { Button } from '../kit';
import { fetchLatestRelease, installedCode, installedName, offerRelease } from '../updates';
import type { Run } from './run';

/** Settings › the app's version and a button to look for a newer one. */
export function UpdateSection({ run, busy }: { run: Run; busy: boolean }) {
  const { t } = useTranslation();
  const check = () => run(async () => {
    const r = await fetchLatestRelease();
    if (r && shouldOffer(r, installedCode(), null)) return offerRelease(r, false);
    Alert.alert(t('updates.title'), r && installedCode() == null ? t('updates.devBuild', { version: r.name }) : t('updates.upToDate'));
  });
  return (
    <FoldSection title={t('updates.section')} summary={t('updates.current', { version: installedName() })}>
      <Button label={t('updates.check')} variant="plain" onPress={check} disabled={busy} />
    </FoldSection>
  );
}
