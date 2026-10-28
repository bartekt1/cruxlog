import type { SQLiteDatabase } from 'expo-sqlite';
import { Alert } from 'react-native';
import { countOutbox, deleteOutbox, listOutbox } from '../db/repo';
import { AppError } from '../domain/errors';
import { newDeviceCode, proposalBody, PROPOSALS_URL } from '../domain/proposals';
import i18n from '../i18n';
import { useSettings } from './settingsStore';

let sending = false;

/**
 * Sends the waiting changes to the shared working sheet, 200 at a time, and forgets each batch the sheet confirmed.
 * Started by the app (`manual` false) it stays quiet on failure and first shows the one-time note: nothing is sent
 * before the user saw it. From the Settings button (`manual`) a failure is thrown. Returns how many were sent.
 */
export async function sendProposals(db: SQLiteDatabase, manual = false): Promise<number> {
  if (!PROPOSALS_URL) { if (manual) throw new AppError('proposals.notReady'); return 0; }
  const s = useSettings.getState();
  if (!s.shareEdits && !manual) return 0;
  if (sending || !(await countOutbox(db))) return 0;
  if (!s.shareNoticeShown) {
    if (!manual) { showNotice(db); return 0; }
    s.setShareNoticeShown();
  }
  let device = s.deviceCode;
  if (!device) { device = newDeviceCode(); s.setDeviceCode(device); }
  sending = true;
  let sent = 0;
  try {
    for (let round = 0; round < 20; round++) {
      const batch = await listOutbox(db, 200);
      if (!batch.length) break;
      let res: Response;
      try {
        res = await fetch(PROPOSALS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(proposalBody(batch, device)) });
      } catch {
        throw new AppError('proposals.offline');
      }
      const answer = await res.json().catch(() => null) as { ok?: boolean; added?: number } | null;
      if (!res.ok || !answer?.ok) throw new AppError('proposals.failed', { status: res.status });
      await deleteOutbox(db, batch.map((e) => e.id));
      sent += batch.length;
    }
  } catch (e) {
    if (manual) throw e;
  } finally {
    sending = false;
  }
  return sent;
}

/** The one-time note before the first sending: OK sends, "Do not send" switches sending off. */
function showNotice(db: SQLiteDatabase): void {
  const s = useSettings.getState();
  Alert.alert(i18n.t('proposals.noticeTitle'), i18n.t('proposals.noticeBody'), [
    { text: i18n.t('proposals.noticeOff'), style: 'cancel', onPress: () => { s.setShareEdits(false); s.setShareNoticeShown(); } },
    { text: i18n.t('proposals.noticeOk'), onPress: () => { s.setShareNoticeShown(); sendProposals(db).catch(() => {}); } },
  ], { cancelable: false });
}
