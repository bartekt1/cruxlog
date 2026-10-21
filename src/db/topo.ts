import type { SQLiteDatabase } from 'expo-sqlite';
import { type GradeSystem, type RouteType } from '../domain/grades';
import { parsePoints, stringifyPoints, type Pt, type TopoMode } from '../domain/topo';
import { newId, now } from './ids';
import { getPhoto, type PhotoRow } from './photos';
import { listCragRoutes } from './routes';
import type { RouteRow } from './shared';

export type TopoLineRow = {
  id: string; photo_id: string; route_id: string; mode: TopoMode; points: Pt[];
  route_name: string; grade_index: number; grade_label: string; grade_system: GradeSystem; type: RouteType;
};

/** The lines drawn on one photo, with their routes; lines of deleted routes are left out. */
export async function listTopoLines(db: SQLiteDatabase, photoId: string): Promise<TopoLineRow[]> {
  const rows = await db.getAllAsync<Omit<TopoLineRow, 'points'> & { points: string }>(
    `SELECT t.id, t.photo_id, t.route_id, t.mode, t.points, r.name AS route_name, r.grade_index, r.grade_label, r.grade_system, r.type
     FROM topo_line t JOIN route r ON r.id = t.route_id
     WHERE t.photo_id = ? AND t.deleted_at IS NULL AND r.deleted_at IS NULL`,
    [photoId]);
  return rows.map((r) => ({ ...r, points: parsePoints(r.points) }));
}

/** The routes that can be drawn on a photo: those of its wall (sector), or of the whole crag for a crag photo. */
export async function topoRoutes(db: SQLiteDatabase, photo: PhotoRow): Promise<RouteRow[]> {
  if (photo.owner_type === 'sector') {
    const sector = await db.getFirstAsync<{ crag_id: string }>('SELECT crag_id FROM sector WHERE id = ?', [photo.owner_id]);
    return sector ? (await listCragRoutes(db, sector.crag_id)).filter((r) => r.sector_id === photo.owner_id) : [];
  }
  if (photo.owner_type === 'crag') return listCragRoutes(db, photo.owner_id);
  return [];
}

/** Saves the line of a route on a photo: one line per route and photo, so saving again replaces it. */
export async function saveTopoLine(db: SQLiteDatabase, line: { photoId: string; routeId: string; mode: TopoMode; points: Pt[] }): Promise<string> {
  const t = now();
  const points = stringifyPoints(line.points);
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM topo_line WHERE photo_id = ? AND route_id = ? AND deleted_at IS NULL', [line.photoId, line.routeId]);
  if (existing) {
    await db.runAsync('UPDATE topo_line SET mode = ?, points = ?, updated_at = ? WHERE id = ?', [line.mode, points, t, existing.id]);
    return existing.id;
  }
  const id = newId();
  await db.runAsync('INSERT INTO topo_line (id, photo_id, route_id, mode, points, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [id, line.photoId, line.routeId, line.mode, points, t, t]);
  return id;
}

export async function deleteTopoLine(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.runAsync('UPDATE topo_line SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, id]);
}

/** The photos a route is drawn on, each with all its lines (so the route can be shown among its neighbours). */
export async function routeTopos(db: SQLiteDatabase, routeId: string): Promise<{ photo: PhotoRow; lines: TopoLineRow[] }[]> {
  const rows = await db.getAllAsync<{ photo_id: string }>(
    `SELECT DISTINCT t.photo_id FROM topo_line t JOIN photo p ON p.id = t.photo_id
     WHERE t.route_id = ? AND t.deleted_at IS NULL AND p.deleted_at IS NULL ORDER BY p.created_at`, [routeId]);
  const out: { photo: PhotoRow; lines: TopoLineRow[] }[] = [];
  for (const r of rows) {
    const photo = await getPhoto(db, r.photo_id);
    if (photo) out.push({ photo, lines: await listTopoLines(db, photo.id) });
  }
  return out;
}
