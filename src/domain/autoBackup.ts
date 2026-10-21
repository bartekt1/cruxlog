// Rules for the automatic backup into a folder: file names, which old files to delete, when a new copy is due.
import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate';

export const BACKUP_KEEP = 5;
export const BACKUP_INTERVAL_DAYS = 7;
/** After a failed try the app waits this long before it tries again. */
export const RETRY_AFTER_MS = 60 * 60 * 1000;

const NAME = /^cruxlog-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})\.json\.gz$/;
const pad = (n: number) => String(n).padStart(2, '0');

/** e.g. cruxlog-2026-10-20-0812.json.gz (local time, so names sort by date). */
export function backupFileName(at: number): string {
  const d = new Date(at);
  return `cruxlog-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json.gz`;
}

/** When the copy was made, from its file name; null for files that are not ours. */
export function backupTime(name: string): number | null {
  const m = NAME.exec(name);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])).getTime() : null;
}

/** Our backup files, newest first. Other files in the folder are not ours and never listed. */
export function sortBackups(names: string[]): string[] {
  return names.filter((n) => NAME.test(n)).sort().reverse();
}

/** The files to delete so that only the `keep` newest remain. */
export function expiredBackups(names: string[], keep = BACKUP_KEEP): string[] {
  return sortBackups(names).slice(keep);
}

/**
 * Whether a copy is due: a folder is chosen and either none was made yet, or the interval has passed
 * and something changed since. A failed try is not repeated for an hour.
 */
export function backupDue(x: { now: number; lastAt: number | null; changedAt: number | null; lastTryAt: number | null }): boolean {
  if (x.lastTryAt != null && x.now - x.lastTryAt < RETRY_AFTER_MS) return false;
  if (x.lastAt == null) return true;
  return x.now - x.lastAt >= BACKUP_INTERVAL_DAYS * 86_400_000 && x.changedAt != null && x.changedAt > x.lastAt;
}

/** What a stored folder address points to, for a readable label: Google Drive, the phone's own storage or something else. */
export function folderKind(uri: string): 'drive' | 'device' | 'other' {
  if (uri.includes('com.google.android.apps.docs')) return 'drive';
  if (uri.includes('com.android.externalstorage.documents')) return 'device';
  return 'other';
}

/** The folder path of a phone-storage address, e.g. "Documents/Cruxlog"; '' when it cannot be read. */
export function devicePath(uri: string): string {
  try {
    const tail = decodeURIComponent(uri.split('/tree/')[1] ?? '').split('/document/')[0];
    return tail.replace(/^[^:]*:/, '');
  } catch {
    return '';
  }
}

/** A backup file is gzipped JSON (about 20 times smaller than plain JSON). */
export function packBackup(json: string): Uint8Array {
  return gzipSync(strToU8(json), { level: 6 });
}

/** Reads a backup file's bytes, gzipped or plain; throws when it is not JSON. */
export function unpackBackup(bytes: Uint8Array): unknown {
  const gz = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  return JSON.parse(strFromU8(gz ? gunzipSync(bytes) : bytes));
}
