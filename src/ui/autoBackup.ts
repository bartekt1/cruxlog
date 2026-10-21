import { Directory, File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { exportBackup, importBackup, latestChange } from '../db/backup';
import { activePhotos, latestPhotoChange } from '../db/repo';
import { backupDue, backupFileName, backupTime, expiredBackups, packBackup, RETRY_AFTER_MS, sortBackups, unpackBackup } from '../domain/autoBackup';
import { BACKUP_PHOTO_DIR, missingIds, photoFileName, photoIdFromFile } from '../domain/photos';
import { photoFile } from './photos';
import { useSettings } from './settingsStore';

const filesIn = (dir: Directory): File[] => dir.list().filter((x): x is File => x instanceof File);

/** The photos subfolder of the backup folder; created when `create` is set, else null if it is not there. */
function photoFolder(dir: Directory, create: boolean): Directory | null {
  const found = dir.list().find((x): x is Directory => x instanceof Directory && x.name === BACKUP_PHOTO_DIR);
  return found ?? (create ? dir.createDirectory(BACKUP_PHOTO_DIR) : null);
}

/** Copies the photos that are not yet in the folder's photo subfolder. Each photo is written once and never again. Returns how many were copied. */
export async function syncPhotos(db: SQLiteDatabase, dirUri: string): Promise<number> {
  const dir = new Directory(dirUri);
  if (!dir.exists) throw new Error('The folder is no longer there. Choose it again.');
  const wanted = (await activePhotos(db)).map((p) => p.id).filter((id) => photoFile(id).exists);
  if (!wanted.length) return 0;
  const target = photoFolder(dir, true)!;
  const present = target.list().filter((x): x is File => x instanceof File).map((f) => photoIdFromFile(f.name)).filter((x): x is string => x != null);
  const todo = missingIds(wanted, present);
  for (const id of todo) {
    const bytes = photoFile(id).bytesSync();
    const file = target.createFile(photoFileName(id), 'image/jpeg');
    try {
      file.write(bytes);
      if ((file.size ?? 0) < bytes.length) throw new Error('A photo was written only in part.');
    } catch (e) {
      try { file.delete(); } catch { /* nothing more to do */ }
      throw e;
    }
  }
  return todo.length;
}

/** Brings back the picture files that the database knows but this phone lacks, from the folder. Returns how many. */
export async function restorePhotos(db: SQLiteDatabase, dirUri: string): Promise<number> {
  const source = photoFolder(new Directory(dirUri), false);
  if (!source) return 0;
  const files = new Map(source.list().filter((x): x is File => x instanceof File).map((f) => [f.name, f]));
  let restored = 0;
  for (const p of await activePhotos(db)) {
    const local = photoFile(p.id);
    const from = files.get(photoFileName(p.id));
    if (local.exists || !from) continue;
    local.create({ overwrite: true });
    local.write(new Uint8Array(await from.arrayBuffer()));
    restored++;
  }
  return restored;
}

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
  const dbDue = backupDue({ now, lastAt: s.autoBackupAt, changedAt: await latestChange(db), lastTryAt: s.autoBackupTryAt });
  // New photos are copied soon after they appear (not once a week), unless the last try failed less than an hour ago.
  const photoChange = await latestPhotoChange(db);
  const failedRecently = s.autoBackupError !== '' && s.autoBackupTryAt != null && now - s.autoBackupTryAt < RETRY_AFTER_MS;
  const photosDue = photoChange != null && (s.photosSyncedAt == null || photoChange > s.photosSyncedAt) && !failedRecently;
  if (!dbDue && !photosDue) return;
  running = true;
  try {
    if (dbDue) {
      try {
        await writeBackup(db, s.backupDir);
        useSettings.getState().setAutoBackupResult(Date.now(), '');
      } catch (e) {
        useSettings.getState().setAutoBackupResult(Date.now(), (e as Error).message || 'error');
        return;
      }
    }
    try {
      await syncPhotos(db, s.backupDir);
      useSettings.getState().setPhotosSynced(Date.now());
    } catch (e) {
      useSettings.getState().setAutoBackupResult(Date.now(), `photos:${(e as Error).message || 'error'}`);
    }
  } finally {
    running = false;
  }
}
