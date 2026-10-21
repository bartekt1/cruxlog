import type { SQLiteDatabase } from 'expo-sqlite';
import { now } from './ids';

export type PhotoOwner = 'ascent' | 'crag' | 'sector';
export type PhotoRow = { id: string; owner_type: PhotoOwner; owner_id: string; width: number; height: number; bytes: number; position: number };

/** The photos of one ascent, in the order they were added. */
export async function listPhotos(db: SQLiteDatabase, ownerType: PhotoOwner, ownerId: string): Promise<PhotoRow[]> {
  return db.getAllAsync<PhotoRow>(
    'SELECT id, owner_type, owner_id, width, height, bytes, position FROM photo WHERE owner_type = ? AND owner_id = ? AND deleted_at IS NULL ORDER BY position, created_at',
    [ownerType, ownerId]);
}

export type NewPhoto = { id: string; width: number; height: number; bytes: number };

/** Adds photos after the ones already there. The picture files are saved by the caller, under the same ids. */
export async function addPhotos(db: SQLiteDatabase, ownerType: PhotoOwner, ownerId: string, photos: NewPhoto[]): Promise<void> {
  if (!photos.length) return;
  const t = now();
  const last = await db.getFirstAsync<{ p: number | null }>(
    'SELECT MAX(position) AS p FROM photo WHERE owner_type = ? AND owner_id = ? AND deleted_at IS NULL', [ownerType, ownerId]);
  let position = (last?.p ?? -1) + 1;
  await db.withTransactionAsync(async () => {
    for (const p of photos) {
      await db.runAsync('INSERT INTO photo (id, owner_type, owner_id, width, height, bytes, position, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [p.id, ownerType, ownerId, p.width, p.height, p.bytes, position++, t, t]);
    }
  });
}

/** Soft delete. The files go when the app next tidies up (see cleanOrphanPhotos). */
export async function removePhotos(db: SQLiteDatabase, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const t = now();
  const marks = ids.map(() => '?').join(',');
  await db.runAsync(`UPDATE photo SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL AND id IN (${marks})`, [t, t, ...ids]);
  await db.runAsync(`UPDATE topo_line SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL AND photo_id IN (${marks})`, [t, t, ...ids]); // lines drawn on them go too
}

/** Photos that count: not deleted, and their ascent is not deleted either (a route, sector or crag delete removes ascents). */
export async function activePhotos(db: SQLiteDatabase): Promise<PhotoRow[]> {
  return db.getAllAsync<PhotoRow>(
    `SELECT p.id, p.owner_type, p.owner_id, p.width, p.height, p.bytes, p.position FROM photo p
     WHERE p.deleted_at IS NULL AND (
       (p.owner_type = 'ascent' AND EXISTS (SELECT 1 FROM ascent a WHERE a.id = p.owner_id AND a.deleted_at IS NULL)) OR
       (p.owner_type = 'crag' AND EXISTS (SELECT 1 FROM crag c WHERE c.id = p.owner_id AND c.deleted_at IS NULL)) OR
       (p.owner_type = 'sector' AND EXISTS (SELECT 1 FROM sector s WHERE s.id = p.owner_id AND s.deleted_at IS NULL)))
     ORDER BY p.created_at`);
}

/** The photos of several owners of one kind (e.g. all sectors of a crag) in one go, in each owner's order. */
export async function listPhotosOf(db: SQLiteDatabase, ownerType: PhotoOwner, ownerIds: string[]): Promise<Map<string, PhotoRow[]>> {
  const byOwner = new Map<string, PhotoRow[]>();
  if (!ownerIds.length) return byOwner;
  const rows = await db.getAllAsync<PhotoRow>(
    `SELECT id, owner_type, owner_id, width, height, bytes, position FROM photo
     WHERE owner_type = ? AND deleted_at IS NULL AND owner_id IN (${ownerIds.map(() => '?').join(',')}) ORDER BY position, created_at`,
    [ownerType, ...ownerIds]);
  for (const r of rows) byOwner.set(r.owner_id, [...(byOwner.get(r.owner_id) ?? []), r]);
  return byOwner;
}

/** When photos last changed (added, removed); null when there never were any. */
export async function latestPhotoChange(db: SQLiteDatabase): Promise<number | null> {
  const row = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(updated_at) AS m FROM photo');
  return row?.m ?? null;
}

/** One photo, if it is not deleted. */
export async function getPhoto(db: SQLiteDatabase, id: string): Promise<PhotoRow | null> {
  return db.getFirstAsync<PhotoRow>('SELECT id, owner_type, owner_id, width, height, bytes, position FROM photo WHERE id = ? AND deleted_at IS NULL', [id]);
}
