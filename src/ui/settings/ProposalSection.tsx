import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { countOutbox } from '../../db/repo';
import { PROPOSALS_URL } from '../../domain/proposals';
import { FoldSection, MoreText } from '../Fold';
import { Button } from '../kit';
import { sendProposals } from '../proposals';
import { SwitchRow } from '../rows';
import { useSettings } from '../settingsStore';
import { Text } from '../Text';
import { useTheme } from '../theme';
import type { Run } from './run';

/** Settings › the shared crag base: whether the user's changes to crags and routes are sent, how many wait, "Send now". */
export function ProposalSection({ run, busy }: { run: Run; busy: boolean }) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const { shareEdits, setShareEdits, setShareNoticeShown } = useSettings();
  const [pending, setPending] = useState(0);
  const refresh = useCallback(() => { countOutbox(db).then(setPending); }, [db]);
  useFocusEffect(refresh);

  const sendNow = () => run(async () => {
    const n = await sendProposals(db, true);
    refresh();
    return n ? t('proposals.sent', { count: n }) : t('proposals.nothing');
  });
  const summary = shareEdits ? `${t('proposals.on')} · ${t('proposals.pending', { count: pending })}` : t('proposals.off');
  return (
    <FoldSection title={t('proposals.section')} summary={summary}>
      <MoreText short={t('proposals.short')} long={t('proposals.long')} />
      <SwitchRow label={t('proposals.switch')} value={shareEdits} onChange={(on) => { setShareEdits(on); if (on) setShareNoticeShown(); }} />
      {shareEdits ? null : <Text style={{ color: th.muted, marginTop: 6 }}>{t('proposals.pending', { count: pending })}</Text>}
      {!PROPOSALS_URL ? <Text style={{ color: th.muted, marginTop: 4 }}>{t('proposals.notReadyHint')}</Text> : null}
      {shareEdits && PROPOSALS_URL ? <Button label={t('proposals.sendNow')} variant="plain" onPress={sendNow} disabled={busy || !pending} /> : null}
    </FoldSection>
  );
}
