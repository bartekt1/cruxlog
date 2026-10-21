import type { SQLiteDatabase } from 'expo-sqlite';
import { type GradeSystem, type RouteType } from '../domain/grades';
import { fold } from '../domain/text';
import { areaIdFor, type AreaNames } from './areas';
import { newId, now } from './ids';
import { findByName, ROUTE_COLS, sectorIdFor, type RouteRow } from './shared';
import { AppError } from '../domain/errors';

/** Type-ahead route search over route, sector and crag names, ignoring case and Polish letters. */
type SearchIndex = { key: number; rows: RouteRow[]; names: string[]; hay: string[] };
const searchIndexes = new WeakMap<SQLiteDatabase, SearchIndex>();

/**
 * All routes with their folded names, kept in memory between keystrokes (a big import has 15 000 routes).
 * Rebuilt after any write: total_changes() counts every row this connection inserted, updated or deleted.
 */
async function searchIndex(db: SQLiteDatabase): Promise<SearchIndex> {
  const k = await db.getFirstAsync<{ key: number }>('SELECT total_changes() AS key');
  const cached = searchIndexes.get(db);
  if (cached && cached.key === k?.key) return cached;
  const rows = await db.getAllAsync<RouteRow>(
    `SELECT ${ROUTE_COLS}
     FROM route r JOIN sector s ON s.id = r.sector_id JOIN crag c ON c.id = s.crag_id
     WHERE r.deleted_at IS NULL AND s.deleted_at IS NULL AND c.deleted_at IS NULL`,
  );
  const index = {
    key: k?.key ?? -1, rows,
    names: rows.map((r) => fold(r.name)),
    hay: rows.map((r) => fold(`${r.name} ${r.sector_name} ${r.crag_name}`)),
  };
  searchIndexes.set(db, index);
  return index;
}

export type RouteStatus = 'all' | 'todo' | 'tried' | 'sent';
export type RouteFilter = {
  query: string;
  /** Inclusive ladder indices; null = no limit. */
  minGrade: number | null; maxGrade: number | null;
  /** The area and everything below it; null = everywhere. */
  areaIds: string[] | null;
  status: RouteStatus;
  type: RouteType | null;
};
export type FoundRoute = RouteRow & { region_id: string | null; ascents: number; sends: number };

/**
 * Routes matching the filters, easiest first. `total` counts all matches; at most `limit` are returned.
 * todo = never climbed, tried = only attempts, sent = at least one send.
 */
export async function findRoutes(db: SQLiteDatabase, f: RouteFilter, limit = 200): Promise<{ total: number; rows: FoundRoute[] }> {
  const where = ['r.deleted_at IS NULL', 's.deleted_at IS NULL', 'c.deleted_at IS NULL'];
  const params: (string | number)[] = [];
  if (f.minGrade != null) { where.push('r.grade_index >= ?'); params.push(f.minGrade); }
  if (f.maxGrade != null) { where.push('r.grade_index <= ?'); params.push(f.maxGrade); }
  if (f.type) { where.push('r.type = ?'); params.push(f.type); }
  if (f.areaIds) {
    if (!f.areaIds.length) return { total: 0, rows: [] };
    where.push(`c.region_id IN (${f.areaIds.map(() => '?').join(',')})`);
    params.push(...f.areaIds);
  }
  const status = f.status === 'todo' ? 'WHERE ascents = 0' : f.status === 'tried' ? 'WHERE ascents > 0 AND sends = 0' : f.status === 'sent' ? 'WHERE sends > 0' : '';
  const words = fold(f.query).split(' ').filter(Boolean);
  const sql = (select: string, tail: string) => `SELECT ${select} FROM (
       SELECT ${ROUTE_COLS}, c.region_id, COALESCE(x.ascents, 0) AS ascents, COALESCE(x.sends, 0) AS sends
       FROM route r JOIN sector s ON s.id = r.sector_id JOIN crag c ON c.id = s.crag_id
       LEFT JOIN (SELECT route_id, COUNT(*) AS ascents, SUM(style <> 'attempt') AS sends FROM ascent WHERE deleted_at IS NULL GROUP BY route_id) x
         ON x.route_id = r.id
       WHERE ${where.join(' AND ')}
     ) ${status} ${tail}`;
  // Without a name the database does the limiting; a name is matched in JS (ignoring case and Polish letters).
  if (!words.length) {
    const total = await db.getFirstAsync<{ n: number }>(sql('COUNT(*) AS n', ''), params);
    const rows = await db.getAllAsync<FoundRoute>(sql('*', 'ORDER BY grade_index, name LIMIT ?'), [...params, limit]);
    return { total: total?.n ?? 0, rows };
  }
  const all = await db.getAllAsync<FoundRoute>(sql('*', 'ORDER BY grade_index, name'), params);
  const hits = all.filter((r) => { const hay = fold(`${r.name} ${r.sector_name} ${r.crag_name}`); return words.every((w) => hay.includes(w)); });
  return { total: hits.length, rows: hits.slice(0, limit) };
}

/** Builds the search index ahead of the first keystroke (call when a screen with route search opens). */
export async function warmSearch(db: SQLiteDatabase): Promise<void> {
  await searchIndex(db);
}

/** Routes whose name, sector or crag contain every word of the query; names starting with it first. */
export async function searchRoutes(db: SQLiteDatabase, query: string, limit = 8): Promise<RouteRow[]> {
  const words = fold(query).split(' ').filter(Boolean);
  if (!words.length) return [];
  const q = words.join(' ');
  const { rows, names, hay } = await searchIndex(db);
  const hits: number[] = [];
  for (let i = 0; i < rows.length; i++) if (words.every((w) => hay[i].includes(w))) hits.push(i);
  const starts = (i: number) => (names[i].startsWith(q) ? 0 : 1);
  return hits
    .sort((a, b) => starts(a) - starts(b) || names[a].localeCompare(names[b]))
    .slice(0, limit)
    .map((i) => rows[i]);
}

/** Routes the user climbed most recently, newest first. */
export async function recentRoutes(db: SQLiteDatabase, limit = 5): Promise<RouteRow[]> {
  return db.getAllAsync<RouteRow>(
    `SELECT ${ROUTE_COLS}
     FROM route r JOIN sector s ON s.id = r.sector_id JOIN crag c ON c.id = s.crag_id
     JOIN (SELECT route_id, MAX(date || created_at) AS last FROM ascent WHERE deleted_at IS NULL GROUP BY route_id) a ON a.route_id = r.id
     WHERE r.deleted_at IS NULL
     ORDER BY a.last DESC LIMIT ?`,
    [limit],
  );
}

export async function getRoute(db: SQLiteDatabase, id: string): Promise<RouteRow | null> {
  return db.getFirstAsync<RouteRow>(
    `SELECT ${ROUTE_COLS}
     FROM route r JOIN sector s ON s.id = r.sector_id JOIN crag c ON c.id = s.crag_id
     WHERE r.id = ? AND r.deleted_at IS NULL`,
    [id],
  );
}

export type NewRoute = {
  cragName: string; sectorName: string; name: string; type: RouteType; gradeLabel: string; gradeSystem: GradeSystem; gradeIndex: number;
  /** Region, area and group of a new crag (also given to an existing crag that has none). */
  areas?: AreaNames;
};

/** A user-created route: private by default, ready to be proposed to the catalog later. */
export async function addUserRoute(db: SQLiteDatabase, r: NewRoute): Promise<string> {
  let routeId = '';
  await db.withTransactionAsync(async () => { routeId = await insertUserRoute(db, r, now()); });
  return routeId;
}

/** addUserRoute inside a transaction the caller runs (see saveAscent). */
export async function insertUserRoute(db: SQLiteDatabase, r: NewRoute, t: number): Promise<string> {
  const routeId = newId();
  let crag = await findByName(db, 'SELECT id, name FROM crag WHERE deleted_at IS NULL', [], r.cragName);
  if (!crag) {
    crag = { id: newId() };
    const regionId = r.areas ? await areaIdFor(db, r.areas, t) : null;
    await db.runAsync('INSERT INTO crag (id, region_id, name, created_at, updated_at) VALUES (?,?,?,?,?)', [crag.id, regionId, r.cragName, t, t]);
  } else if (r.areas?.region.trim()) {
    // An existing crag without an area gets the one typed with the route; an existing area is never changed here.
    const cur = await db.getFirstAsync<{ region_id: string | null }>('SELECT region_id FROM crag WHERE id = ?', [crag.id]);
    if (cur && !cur.region_id) {
      await db.runAsync('UPDATE crag SET region_id = ?, updated_at = ? WHERE id = ?', [await areaIdFor(db, r.areas, t), t, crag.id]);
    }
  }
  const sectorId = await sectorIdFor(db, crag.id, r.sectorName, t);
  await db.runAsync(
    `INSERT INTO route (id, sector_id, name, type, grade_label, grade_system, grade_index, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [routeId, sectorId, r.name, r.type, r.gradeLabel, r.gradeSystem, r.gradeIndex, t, t],
  );
  return routeId;
}

export type RouteInput = {
  sectorName: string; name: string; type: RouteType; gradeLabel: string; gradeSystem: GradeSystem; gradeIndex: number;
  /** Left unchanged when not given. */
  lengthM?: number | null; bolts?: number | null;
};

/** Adds a route to a crag without an ascent; an empty sector name puts it in a sector named like the crag. */
export async function createRoute(db: SQLiteDatabase, cragId: string, r: RouteInput): Promise<string> {
  const t = now();
  const id = newId();
  await db.withTransactionAsync(async () => {
    const crag = await db.getFirstAsync<{ name: string }>('SELECT name FROM crag WHERE id = ? AND deleted_at IS NULL', [cragId]);
    if (!crag) throw new AppError('errors.notFound');
    const sectorId = await sectorIdFor(db, cragId, r.sectorName.trim() || crag.name, t);
    await db.runAsync(
      `INSERT INTO route (id, sector_id, name, type, grade_label, grade_system, grade_index, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, sectorId, r.name, r.type, r.gradeLabel, r.gradeSystem, r.gradeIndex, t, t],
    );
  });
  return id;
}

/** Updates a route; a new sector name moves it to that sector of the same crag (created if needed). */
export async function updateRoute(db: SQLiteDatabase, id: string, r: RouteInput): Promise<void> {
  const t = now();
  await db.withTransactionAsync(async () => {
    const cur = await db.getFirstAsync<{ crag_id: string }>('SELECT s.crag_id FROM route r JOIN sector s ON s.id = r.sector_id WHERE r.id = ?', [id]);
    if (!cur) throw new AppError('errors.notFound');
    const sectorId = await sectorIdFor(db, cur.crag_id, r.sectorName, t);
    await db.runAsync(
      'UPDATE route SET sector_id = ?, name = ?, type = ?, grade_label = ?, grade_system = ?, grade_index = ?, updated_at = ? WHERE id = ?',
      [sectorId, r.name, r.type, r.gradeLabel, r.gradeSystem, r.gradeIndex, t, id]);
    if (r.lengthM !== undefined) await db.runAsync('UPDATE route SET length_m = ? WHERE id = ?', [r.lengthM, id]);
    if (r.bolts !== undefined) await db.runAsync('UPDATE route SET bolts = ? WHERE id = ?', [r.bolts, id]);
  });
}

export type CragRouteRow = RouteRow & { ascents: number; sends: number };

/** Routes of a crag, by sector, with how many times the user climbed and sent each. */
export async function listCragRoutes(db: SQLiteDatabase, cragId: string): Promise<CragRouteRow[]> {
  return db.getAllAsync<CragRouteRow>(
    `SELECT ${ROUTE_COLS},
            (SELECT COUNT(*) FROM ascent a WHERE a.route_id = r.id AND a.deleted_at IS NULL) AS ascents,
            (SELECT COUNT(*) FROM ascent a WHERE a.route_id = r.id AND a.deleted_at IS NULL AND a.style <> 'attempt') AS sends
     FROM route r JOIN sector s ON s.id = r.sector_id JOIN crag c ON c.id = s.crag_id
     WHERE c.id = ? AND r.deleted_at IS NULL AND s.deleted_at IS NULL
     ORDER BY s.name, r.name`,
    [cragId],
  );
}
