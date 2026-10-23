import type { SQLiteDatabase } from 'expo-sqlite';
import type { TripDraft } from '../domain/trips';
import type { PosSource } from './shared';
import { newId, now } from './ids';
import { ROUTE_COLS, type RouteRow } from './shared';

export type TripRow = { id: string; name: string; start_date: string; end_date: string; message: string; crags: string; routes: number };
export type TripCrag = { id: string; name: string; region_id: string | null; lat: number | null; lng: number | null; pos_source: PosSource };
export type TripDetail = { id: string; name: string; start_date: string; end_date: string; message: string; crags: TripCrag[]; routes: RouteRow[] };

/** All trips, the latest first, with their crags' names and the number of proposed routes. */
export async function listTrips(db: SQLiteDatabase): Promise<TripRow[]> {
  return db.getAllAsync<TripRow>(
    `SELECT t.id, t.name, t.start_date, t.end_date, t.message,
       COALESCE((SELECT GROUP_CONCAT(name, ', ') FROM (SELECT c.name FROM trip_crag tc JOIN crag c ON c.id = tc.crag_id
         WHERE tc.trip_id = t.id AND tc.deleted_at IS NULL AND c.deleted_at IS NULL ORDER BY tc.position)), '') AS crags,
       (SELECT COUNT(*) FROM trip_route tr JOIN route r ON r.id = tr.route_id WHERE tr.trip_id = t.id AND tr.deleted_at IS NULL AND r.deleted_at IS NULL) AS routes
     FROM trip t WHERE t.deleted_at IS NULL ORDER BY t.start_date DESC, t.created_at DESC`);
}

/** One trip with its crags and proposed routes in the order they were picked; deleted crags and routes are left out. */
export async function getTrip(db: SQLiteDatabase, id: string): Promise<TripDetail | null> {
  const t = await db.getFirstAsync<Omit<TripDetail, 'crags' | 'routes'>>(
    'SELECT id, name, start_date, end_date, message FROM trip WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!t) return null;
  const crags = await db.getAllAsync<TripCrag>(
    `SELECT c.id, c.name, c.region_id, c.lat, c.lng, c.pos_source FROM trip_crag tc JOIN crag c ON c.id = tc.crag_id
     WHERE tc.trip_id = ? AND tc.deleted_at IS NULL AND c.deleted_at IS NULL ORDER BY tc.position`, [id]);
  const routes = await db.getAllAsync<RouteRow>(
    `SELECT ${ROUTE_COLS} FROM trip_route tr JOIN route r ON r.id = tr.route_id JOIN sector s ON s.id = r.sector_id JOIN crag c ON c.id = s.crag_id
     WHERE tr.trip_id = ? AND tr.deleted_at IS NULL AND r.deleted_at IS NULL ORDER BY tr.position`, [id]);
  return { ...t, crags, routes };
}

/** Creates a trip (no id) or updates one, with its crags and routes in the given order. Returns the trip id. */
export async function saveTrip(db: SQLiteDatabase, id: string | null, d: TripDraft): Promise<string> {
  const t = now();
  const tripId = id ?? newId();
  await db.withTransactionAsync(async () => {
    if (id) {
      await db.runAsync('UPDATE trip SET name = ?, start_date = ?, end_date = ?, message = ?, updated_at = ? WHERE id = ?',
        [d.name, d.startDate, d.endDate, d.message, t, id]);
      // The lists are written anew; the old links stay as deleted rows, so backups carry the change.
      await db.runAsync('UPDATE trip_crag SET deleted_at = ?, updated_at = ? WHERE trip_id = ? AND deleted_at IS NULL', [t, t, id]);
      await db.runAsync('UPDATE trip_route SET deleted_at = ?, updated_at = ? WHERE trip_id = ? AND deleted_at IS NULL', [t, t, id]);
    } else {
      await db.runAsync('INSERT INTO trip (id, name, start_date, end_date, message, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
        [tripId, d.name, d.startDate, d.endDate, d.message, t, t]);
    }
    for (const [i, cragId] of d.cragIds.entries()) {
      await db.runAsync('INSERT INTO trip_crag (id, trip_id, crag_id, position, created_at, updated_at) VALUES (?,?,?,?,?,?)', [newId(), tripId, cragId, i, t, t]);
    }
    for (const [i, routeId] of d.routeIds.entries()) {
      await db.runAsync('INSERT INTO trip_route (id, trip_id, route_id, position, created_at, updated_at) VALUES (?,?,?,?,?,?)', [newId(), tripId, routeId, i, t, t]);
    }
  });
  return tripId;
}

export async function deleteTrip(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE trip SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, id]);
    await db.runAsync('UPDATE trip_crag SET deleted_at = ?, updated_at = ? WHERE trip_id = ? AND deleted_at IS NULL', [t, t, id]);
    await db.runAsync('UPDATE trip_route SET deleted_at = ?, updated_at = ? WHERE trip_id = ? AND deleted_at IS NULL', [t, t, id]);
  });
}

/** The routes proposed for trips that include the given day, with the trip's name: offered first when logging an ascent. */
export async function tripRoutesOn(db: SQLiteDatabase, date: string): Promise<{ trip: string; routes: RouteRow[] } | null> {
  const trip = await db.getFirstAsync<{ id: string; name: string }>(
    'SELECT id, name FROM trip WHERE deleted_at IS NULL AND start_date <= ? AND end_date >= ? ORDER BY start_date DESC LIMIT 1', [date, date]);
  if (!trip) return null;
  const detail = await getTrip(db, trip.id);
  return detail && detail.routes.length ? { trip: trip.name, routes: detail.routes } : null;
}
