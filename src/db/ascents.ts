import type { SQLiteDatabase } from 'expo-sqlite';
import { type AscentStyle, type GradeSystem, type RouteType } from '../domain/grades';
import { addRouteGoal, completeRouteGoals } from './goals';
import { deletePhotoRows, insertPhotoRows, type NewPhoto } from './photos';
import { newId, now } from './ids';
import { getRoute, insertUserRoute, type NewRoute } from './routes';
import { findByName, type RouteRow } from './shared';

export type AscentRow = {
  id: string; date: string; style: AscentStyle; attempts: number; rating: number | null; notes: string;
  /** The grade the climber felt (ladder index), or null when it matches the route's. */
  felt_grade_index: number | null;
  route_id: string; route_name: string; type: RouteType; grade_index: number; grade_label: string; grade_system: GradeSystem;
  crag_name: string; partner_name: string | null;
  /** How many photos the ascent has. */
  photos: number;
};

// The columns of AscentRow (getAscent adds the weather), shared by the ascent lists.
const ASCENT_SELECT = `SELECT a.id, a.date, a.style, a.attempts, a.rating, a.notes, a.felt_grade_index, a.weather, r.id AS route_id, r.name AS route_name,
    r.type, r.grade_index, r.grade_label, r.grade_system, c.name AS crag_name, p.name AS partner_name,
    (SELECT COUNT(*) FROM photo ph WHERE ph.owner_type = 'ascent' AND ph.owner_id = a.id AND ph.deleted_at IS NULL) AS photos
  FROM ascent a JOIN route r ON r.id = a.route_id JOIN sector s ON s.id = r.sector_id JOIN crag c ON c.id = s.crag_id
  LEFT JOIN partner p ON p.id = a.partner_id`;

export async function listAscents(db: SQLiteDatabase): Promise<AscentRow[]> {
  return db.getAllAsync<AscentRow>(
    `${ASCENT_SELECT}
     WHERE a.deleted_at IS NULL ORDER BY a.date DESC, a.created_at DESC`,
  );
}

/** Partner names, the most frequent first. */
export async function listPartners(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT p.name FROM partner p LEFT JOIN ascent a ON a.partner_id = p.id AND a.deleted_at IS NULL
     WHERE p.deleted_at IS NULL GROUP BY p.id ORDER BY COUNT(a.id) DESC, p.name`);
  return rows.map((r) => r.name);
}

/** All of the user's ascents of one route, newest first. */
export async function listRouteAscents(db: SQLiteDatabase, routeId: string): Promise<AscentRow[]> {
  return db.getAllAsync<AscentRow>(
    `${ASCENT_SELECT}
     WHERE a.route_id = ? AND a.deleted_at IS NULL ORDER BY a.date DESC, a.created_at DESC`,
    [routeId],
  );
}

/** Whether there is any ascent (for the backup reminder). */
export async function hasAscents(db: SQLiteDatabase): Promise<boolean> {
  return (await db.getFirstAsync<{ x: number }>('SELECT 1 AS x FROM ascent WHERE deleted_at IS NULL LIMIT 1')) != null;
}

export type NewAscent = {
  routeId: string; date: string; style: AscentStyle; attempts: number; rating: number | null;
  notes: string; partnerName: string; weather: string;
  /** Own grade (ladder index); null or left out = same as the route. */
  feltGradeIndex?: number | null;
};

async function partnerId(db: SQLiteDatabase, partnerName: string, t: number): Promise<string | null> {
  const name = partnerName.trim();
  if (!name) return null;
  const existing = await findByName(db, 'SELECT id, name FROM partner WHERE deleted_at IS NULL', [], name);
  if (existing) return existing.id;
  const id = newId();
  await db.runAsync('INSERT INTO partner (id, name, created_at, updated_at) VALUES (?,?,?,?)', [id, name, t, t]);
  return id;
}

export async function addAscent(db: SQLiteDatabase, a: NewAscent): Promise<string> {
  return (await saveAscent(db, { id: null, routeId: a.routeId, ascent: a })).ascentId;
}

export async function updateAscent(db: SQLiteDatabase, id: string, a: NewAscent): Promise<void> {
  await saveAscent(db, { id, routeId: a.routeId, ascent: a });
}

/** Inserts (no id) or updates an ascent; runs inside the caller's transaction. */
async function writeAscent(db: SQLiteDatabase, id: string | null, a: NewAscent, t: number): Promise<string> {
  const pid = await partnerId(db, a.partnerName, t);
  if (id) {
    await db.runAsync(
      `UPDATE ascent SET route_id = ?, date = ?, style = ?, attempts = ?, rating = ?, felt_grade_index = ?, notes = ?, partner_id = ?, weather = ?,
         updated_at = ? WHERE id = ?`,
      [a.routeId, a.date, a.style, a.attempts, a.rating, a.feltGradeIndex ?? null, a.notes, pid, a.weather, t, id],
    );
    return id;
  }
  const newOne = newId();
  await db.runAsync(
    `INSERT INTO ascent (id, route_id, date, style, attempts, rating, felt_grade_index, notes, partner_id, weather, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [newOne, a.routeId, a.date, a.style, a.attempts, a.rating, a.feltGradeIndex ?? null, a.notes, pid, a.weather, t, t],
  );
  return newOne;
}

export type AscentSave = {
  /** null = a new ascent. */
  id: string | null;
  /** The chosen route, or `newRoute` to create one with the ascent. */
  routeId?: string; newRoute?: NewRoute;
  ascent: Omit<NewAscent, 'routeId'>;
  /** Photo rows to remove and to add (the files are already in place). */
  removePhotoIds?: string[]; addPhotos?: NewPhoto[];
  /** Also make the route a project (an attempt on a new ascent). */
  asProject?: boolean;
};

/**
 * Saves an ascent with everything that goes with it (a new route, photo rows, the project goal) in one transaction:
 * either all of it is written or nothing, so pressing Save again after an error never makes a second ascent.
 */
export async function saveAscent(db: SQLiteDatabase, s: AscentSave): Promise<{ ascentId: string; routeId: string }> {
  const t = now();
  let out = { ascentId: '', routeId: '' };
  await db.withTransactionAsync(async () => {
    const routeId = s.routeId ?? (s.newRoute ? await insertUserRoute(db, s.newRoute, t) : null);
    if (!routeId) throw new Error('No route');
    const ascentId = await writeAscent(db, s.id, { ...s.ascent, routeId }, t);
    await deletePhotoRows(db, s.removePhotoIds ?? [], t);
    await insertPhotoRows(db, 'ascent', ascentId, s.addPhotos ?? [], t);
    if (s.asProject) await addRouteGoal(db, routeId, 'project');
    await completeRouteGoals(db, t);
    out = { ascentId, routeId };
  });
  return out;
}

/** Soft delete: the row stays (with deleted_at) so backups and a later sync carry the deletion. */
export async function deleteAscent(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE ascent SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, id]);
    await db.runAsync("UPDATE photo SET deleted_at = ?, updated_at = ? WHERE owner_type = 'ascent' AND owner_id = ? AND deleted_at IS NULL", [t, t, id]);
  });
}

export type AscentDetail = AscentRow & { weather: string; route: RouteRow };

export async function getAscent(db: SQLiteDatabase, id: string): Promise<AscentDetail | null> {
  const a = await db.getFirstAsync<AscentRow & { weather: string }>(
    `${ASCENT_SELECT}
     WHERE a.id = ? AND a.deleted_at IS NULL`,
    [id],
  );
  if (!a) return null;
  const route = await getRoute(db, a.route_id);
  return route ? { ...a, route } : null;
}
