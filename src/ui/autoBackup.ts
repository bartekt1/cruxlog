import { Directory, File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { exportBackup, importBackup, latestChange } from '../db/backup';
import { backupDue, backupFileName, backupTime, expiredBackups, packBackup, sortBackups, unpackBackup } from '../domain/autoBackup';
import { useSettings } from './settingsStore';

const filesIn = (dir: Directory): File[] => dir.list().filter((x): x is File => x instanceof File);

export type FolderBackup = { name: string; at: number; size: number; file: File };

/** The copies in the folder, newest first. */
export function listBackups(dirUri: string): FolderBackup[] {
  const files = filesIn(new Directory(dirUri));
  const byName = new Map(files.map((f) => [f.name, f]));
  return sortBackups([...byName.keys()]).map((name) => ({ name, at: backupTime(name) ?? 0, size: byName.get(name)!.size ?? 0, file: byName.get(name)! }));
}

/** Writes a new copy into the folder, then deletes the oldest so only 5 stay. A half-written file is removed. */
export async function writeBackup(db: SQLiteDatabase, dirUri: string): Promise<{ name: string; bytes: number; count: number }> {
  const dir = new Directory(dirUri);
  if (!dir.exists) throw new Error('The folder is no longer there. Choose it again.');
  const bytes = packBackup(JSON.stringify(await exportBackup(db)));
  const name = backupFileName(Date.now());
  for (const f of filesIn(dir)) if (f.name === name) f.delete(); // two copies in the same minute: the newer one replaces
  const file = dir.createFile(name, 'application/gzip');
  try {
    file.write(bytes);
    if ((file.size ?? 0) < bytes.length) throw new Error('The copy was written only in part.');
  } catch (e) {
    try { file.delete(); } catch { /* nothing more to do */ }
    throw e;
  }
  const all = filesIn(dir);
  const old = new Set(expiredBackups(all.map((f) => f.name)));
  for (const f of all) if (old.has(f.name)) { try { f.delete(); } catch { /* an old copy that stays is harmless */ } }
  return { name, bytes: bytes.length, count: sortBackups(filesIn(dir).map((f) => f.name)).length };
}

/** Merges a copy from the folder into the database (newer entries win, nothing is deleted). */
export async function restoreBackup(db: SQLiteDatabase, file: File): Promise<number> {
  const data = unpackBackup(new Uint8Array(await file.arrayBuffer()));
  return importBackup(db, data);
}

let running = false;

/** The automatic copy: when one is due, writes it and records the result in the settings. Never throws. */
export async function autoBackupIfDue(db: SQLiteDatabase): Promise<void> {
  const s = useSettings.getState();
  if (!s.backupDir || running) return;
  const now = Date.now();
  if (!backupDue({ now, lastAt: s.autoBackupAt, changedAt: await latestChange(db), lastTryAt: s.autoBackupTryAt })) return;
  running = true;
  try {
    await writeBackup(db, s.backupDir);
    useSettings.getState().setAutoBackupResult(Date.now(), '');
  } catch (e) {
    useSettings.getState().setAutoBackupResult(Date.now(), (e as Error).message || 'error');
  } finally {
    running = false;
  }
}
