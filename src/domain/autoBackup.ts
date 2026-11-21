// Rules for the automatic backup into a folder: file names, which old files to delete, when a new copy is due.
import { Gunzip, gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate';

export const BACKUP_KEEP = 5;
export const BACKUP_INTERVAL_DAYS = 7;
/** After a failed try the app waits this long before it tries again. */
export const RETRY_AFTER_MS = 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

/** e.g. cruxlog-2026-10-20-0812.json.gz (local time). */
export function backupFileName(at: number): string {
  const d = new Date(at);
  return `cruxlog-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json.gz`;
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

/**
 * Whether new photos should be copied now: they changed since the last copy (photos go soon after they appear,
 * not once a week), unless the last try failed less than RETRY_AFTER_MS ago.
 */
export function photosDue(x: { now: number; changedAt: number | null; syncedAt: number | null; failed: boolean; lastTryAt: number | null }): boolean {
  const failedRecently = x.failed && x.lastTryAt != null && x.now - x.lastTryAt < RETRY_AFTER_MS;
  return x.changedAt != null && (x.syncedAt == null || x.changedAt > x.syncedAt) && !failedRecently;
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

/** How many first bytes of a file `peekBackup` needs: the backup's header is at the very start. */
export const PEEK_BYTES = 4096;

/**
 * Recognises a Cruxlog backup from its first bytes only (see PEEK_BYTES), gzipped or plain, without reading the whole file:
 * exportBackup writes `{"app":"cruxlog","version":…,"exportedAt":…` first. Returns when it was made, or null for any other file.
 */
export function peekBackup(head: Uint8Array): { at: number } | null {
  let text = '';
  if (head.length > 2 && head[0] === 0x1f && head[1] === 0x8b) {
    try {
      const parts: Uint8Array[] = [];
      const g = new Gunzip((chunk) => { parts.push(chunk); });
      g.push(head, false);
      text = parts.map((p) => strFromU8(p)).join('');
    } catch {
      return null;
    }
  } else {
    text = strFromU8(head.subarray(0, Math.min(head.length, 512)));
  }
  const m = /^\{"app":"cruxlog","version":\d+,"exportedAt":(\d+)/.exec(text);
  return m ? { at: Number(m[1]) } : null;
}

/** Reads a backup file's bytes, gzipped or plain; throws when it is not JSON. */
export function unpackBackup(bytes: Uint8Array): unknown {
  const gz = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  return JSON.parse(strFromU8(gz ? gunzipSync(bytes) : bytes));
}
