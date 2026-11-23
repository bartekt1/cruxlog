import { Directory, File, FileMode } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { exportBackup, importBackup, latestChange } from '../db/backup';
import { activePhotos, latestPhotoChange } from '../db/repo';
import { backupDue, backupFileName, packBackup, peekBackup, PEEK_BYTES, photosDue, sameBytes, unpackBackup } from '../domain/autoBackup';
import { addCopy, dropCopies, expiredCopies, withFoundCopies, mergeScan, readPhotoMarker, withPhotoMarker, type FolderCopy } from '../domain/backupIndex';
import { BACKUP_PHOTO_DIR, missingIds, photoFileName } from '../domain/photos';
import { getBackupIndex, setBackupIndex } from './backupIndexStore';
import { photoFile } from './photos';
import { useSettings } from './settingsStore';
import { AppError } from '../domain/errors';
import { errorMessage } from './errors';

// Google Drive gives files no readable names through the system folder access, only opaque addresses. So nothing here
// looks for a file by name: the app keeps the addresses of what it wrote (backupIndex), and when it has to look through
// a folder it recognises its own files by their content.

export type FolderBackup = FolderCopy;

const isFile = (x: unknown): x is File => x instanceof File;
const isDirectory = (x: unknown): x is Directory => x instanceof Directory;

/**
 * A file of ours? Checks it is a Cruxlog backup (gzipped or plain) from its first bytes, which on Google Drive is much faster
 * than reading the whole file; a file whose start does not tell is read whole, as before.
 */
async function identifyCopy(file: File): Promise<FolderCopy | null> {
  try {
    const size = file.size ?? 0;
    if (size < 3 || size > 60_000_000) return null;
    let head: Uint8Array | null = null;
    try {
      const handle = file.open(FileMode.ReadOnly);
      try { head = handle.readBytes(Math.min(size, PEEK_BYTES)); } finally { handle.close(); }
    } catch { /* fall back to reading the whole file */ }
    const peeked = head ? peekBackup(head) : null;
    if (peeked) return { uri: file.uri, at: peeked.at, size };
    if (head && !(head[0] === 0x1f && head[1] === 0x8b) && head[0] !== 0x7b) return null; // neither gzip nor JSON
    const data = unpackBackup(new Uint8Array(await file.arrayBuffer())) as { app?: unknown; exportedAt?: unknown };
    if (data?.app !== 'cruxlog') return null;
    return { uri: file.uri, at: typeof data.exportedAt === 'number' ? data.exportedAt : file.modificationTime ?? 0, size };
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Whether a file just written into the folder holds all of `bytes`. Google Drive reports the size of a new file late (it
 * keeps the file and uploads it in the background), so a short size is asked again a few times, then the file is read back.
 */
async function fullyWritten(uri: string, bytes: Uint8Array): Promise<boolean> {
  for (let i = 0; i < 6; i++) {
    if ((new File(uri).size ?? 0) >= bytes.length) return true;
    await sleep(400);
  }
  try {
    return sameBytes(new Uint8Array(await new File(uri).arrayBuffer()), bytes);
  } catch {
    return false;
  }
}

/** The photo id written inside a photo file, read from its first bytes; null for any other file. */
function photoIdOf(file: File): string | null {
  try {
    const handle = file.open(FileMode.ReadOnly);
    try { return readPhotoMarker(handle.readBytes(128)); } finally { handle.close(); }
  } catch {
    return null;
  }
}

/** Looks through the folder once: which files are backups, which subfolder holds photos and which photo is where. */
export async function scanFolder(dirUri: string): Promise<void> {
  const dir = new Directory(dirUri);
  const copies: FolderCopy[] = [];
  const photos: Record<string, string> = {};
  let photoDir: string | null = null;
  for (const item of dir.list()) {
    if (isFile(item)) {
      const copy = await identifyCopy(item);
      if (copy) copies.push(copy);
    } else if (isDirectory(item)) {
      let found = 0;
      for (const f of item.list().filter(isFile)) {
        const id = photoIdOf(f);
        if (id) { photos[id] = f.uri; found++; }
      }
      if (found && !photoDir) photoDir = item.uri;
    }
  }
  setBackupIndex(mergeScan(getBackupIndex(), { copies, photos, photoDir }));
}

/** Looks through the folder the first time (earlier copies and photos are then known). */
async function ensureScanned(dirUri: string): Promise<void> {
  if (getBackupIndex().scanned) return;
  try { await scanFolder(dirUri); } catch { /* not important enough to stop a backup */ }
}

/** Looks for copies only (the files at the top of the folder), not the photos: quick even on a new phone with many photos. */
async function scanCopies(dirUri: string): Promise<void> {
  const copies: FolderCopy[] = [];
  for (const item of new Directory(dirUri).list()) {
    if (!isFile(item)) continue;
    const copy = await identifyCopy(item);
    if (copy) copies.push(copy);
  }
  setBackupIndex(withFoundCopies(getBackupIndex(), copies));
}

/**
 * The copies in the folder, newest first. Looked up in the folder each time (copies only, from their first bytes; photos when
 * they are restored), so copies another phone made in the same folder show too.
 */
export async function listBackups(dirUri: string): Promise<FolderBackup[]> {
  await scanCopies(dirUri);
  return getBackupIndex().copies;
}

/** Writes a new copy into the folder, then deletes the oldest so only 5 stay. A half-written file is removed. */
export async function writeBackup(db: SQLiteDatabase, dirUri: string): Promise<{ name: string; bytes: number; count: number }> {
  const dir = new Directory(dirUri);
  if (!dir.exists) throw new AppError('errors.folderGone');
  await ensureScanned(dirUri);
  const bytes = packBackup(JSON.stringify(await exportBackup(db)));
  const at = Date.now();
  const name = backupFileName(at);
  const file = dir.createFile(name, 'application/gzip');
  try {
    file.write(bytes);
    if (!(await fullyWritten(file.uri, bytes))) throw new AppError('errors.partialCopy');
  } catch (e) {
    try { file.delete(); } catch { /* nothing more to do */ }
    throw e;
  }
  let index = addCopy(getBackupIndex(), { uri: file.uri, at, size: bytes.length });
  const deleted: string[] = [];
  for (const old of expiredCopies(index)) {
    try { new File(old.uri).delete(); deleted.push(old.uri); } catch { /* it stays in the list and is tried again next time */ }
  }
  index = dropCopies(index, deleted);
  setBackupIndex(index);
  return { name, bytes: bytes.length, count: index.copies.length };
}

/** Merges a copy from the folder into the database (newer entries win, nothing is deleted). */
export async function restoreBackup(db: SQLiteDatabase, copy: FolderBackup, onProgress?: (done: number, total: number) => void): Promise<number> {
  return importBackup(db, unpackBackup(new Uint8Array(await new File(copy.uri).arrayBuffer())), onProgress);
}

/**
 * Copies the photos the folder does not have yet into its photo subfolder. Every photo is written once and never again
 * (the file carries its id inside, see withPhotoMarker). Returns how many were copied.
 */
export async function syncPhotos(db: SQLiteDatabase, dirUri: string): Promise<number> {
  const dir = new Directory(dirUri);
  if (!dir.exists) throw new AppError('errors.folderGone');
  await ensureScanned(dirUri);
  const wanted = (await activePhotos(db)).map((p) => p.id).filter((id) => photoFile(id).exists);
  if (!wanted.length) return 0;
  let index = getBackupIndex();
  let target = index.photoDir ? new Directory(index.photoDir) : null;
  if (!target || !target.exists) { // the subfolder is new, or was removed: nothing is known to be in it
    target = dir.createDirectory(BACKUP_PHOTO_DIR);
    index = { ...index, photoDir: target.uri, photos: {} };
    setBackupIndex(index);
  }
  const todo = missingIds(wanted, Object.keys(index.photos));
  for (const id of todo) {
    const bytes = withPhotoMarker(photoFile(id).bytesSync(), id);
    const file = target.createFile(photoFileName(id), 'image/jpeg');
    try {
      file.write(bytes);
      if (!(await fullyWritten(file.uri, bytes))) throw new AppError('errors.partialPhoto');
    } catch (e) {
      try { file.delete(); } catch { /* nothing more to do */ }
      throw e;
    }
    index = { ...index, photos: { ...index.photos, [id]: file.uri } };
    setBackupIndex(index); // saved after each photo, so a break in the middle loses nothing
  }
  return todo.length;
}

/**
 * Brings back the picture files that the database knows but this phone lacks, from the folder. Returns how many.
 * `onProgress` hears how many of the missing ones were handled (total 0 while the folder is still being looked through).
 */
export async function restorePhotos(db: SQLiteDatabase, dirUri: string, onProgress?: (done: number, total: number) => void): Promise<number> {
  const missing = (await activePhotos(db)).filter((p) => !photoFile(p.id).exists);
  if (!missing.length) return 0;
  onProgress?.(0, 0);
  if (missing.some((p) => !getBackupIndex().photos[p.id])) await scanFolder(dirUri);
  const where = getBackupIndex().photos;
  let restored = 0;
  let done = 0;
  onProgress?.(0, missing.length);
  for (const p of missing) {
    onProgress?.(done++, missing.length);
    const uri = where[p.id];
    if (!uri) continue;
    try {
      const local = photoFile(p.id);
      const bytes = new Uint8Array(await new File(uri).arrayBuffer());
      local.create({ overwrite: true });
      local.write(bytes);
      restored++;
    } catch { /* this one stays missing; the rest are still restored */ }
  }
  onProgress?.(missing.length, missing.length);
  return restored;
}

let queue: Promise<unknown> = Promise.resolve();
let pending = 0;

/**
 * Runs backup work one piece at a time: the copy at startup, the one when the app comes back, "Back up now", the list
 * and a restore all read and write the same folder index, so two at once could lose entries or copy a photo twice.
 */
export function withBackupLock<T>(fn: () => Promise<T>): Promise<T> {
  pending++;
  const run = queue.catch(() => {}).then(fn).finally(() => { pending--; });
  queue = run;
  return run;
}

/** Writes a copy now and then the new photos. The copy's result is recorded in the settings; a photo failure does not undo it. */
export function backupNow(db: SQLiteDatabase, dirUri: string): Promise<{ copy: { name: string; bytes: number; count: number }; photos: number | Error }> {
  return withBackupLock(async () => {
    const settings = useSettings.getState();
    let copy;
    try {
      copy = await writeBackup(db, dirUri);
      settings.setAutoBackupResult(Date.now(), '');
    } catch (e) {
      settings.setAutoBackupResult(Date.now(), errorMessage(e));
      throw e;
    }
    try {
      const photos = await syncPhotos(db, dirUri);
      settings.setPhotosSynced(Date.now());
      return { copy, photos };
    } catch (e) {
      settings.setAutoBackupResult(Date.now(), `photos:${errorMessage(e)}`);
      return { copy, photos: e as Error };
    }
  });
}

/** The automatic copy: when one is due, writes it and records the result in the settings. Never throws. */
export async function autoBackupIfDue(db: SQLiteDatabase): Promise<void> {
  if (!useSettings.getState().backupDir || pending) return; // something is already running; the next start or return tries again
  await withBackupLock(async () => {
    const s = useSettings.getState();
    if (!s.backupDir) return;
    const now = Date.now();
    const dbDue = backupDue({ now, lastAt: s.autoBackupAt, changedAt: await latestChange(db), lastTryAt: s.autoBackupTryAt });
    const photos = photosDue({ now, changedAt: await latestPhotoChange(db), syncedAt: s.photosSyncedAt, failed: s.autoBackupError !== '', lastTryAt: s.autoBackupTryAt });
    if (dbDue) {
      try {
        await writeBackup(db, s.backupDir);
        s.setAutoBackupResult(Date.now(), '');
      } catch (e) {
        s.setAutoBackupResult(Date.now(), errorMessage(e));
        return;
      }
    }
    if (!dbDue && !photos) return;
    try {
      await syncPhotos(db, s.backupDir);
      s.setPhotosSynced(Date.now());
    } catch (e) {
      s.setAutoBackupResult(Date.now(), `photos:${errorMessage(e)}`);
    }
  }).catch(() => { /* never disturbs the app; the error is in the settings */ });
}
