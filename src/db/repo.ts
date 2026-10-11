import type { SQLiteDatabase } from 'expo-sqlite';
import { type AscentStyle, type GradeSystem, type RouteType } from '../domain/grades';
import type { ImportPlan } from '../domain/csvImport';
import { childLevel, type Area, type AreaLevel } from '../domain/areas';
import { sameName, suggest } from '../domain/text';
import { newId, now } from './ids';

export type RouteRow = {
  id: string; name: string; type: RouteType; grade_label: string; grade_system: GradeSystem; grade_index: number;
  sector_id: string; sector_name: string; sector_source: string; crag_id: string; crag_name: string;
  /** 'user' for routes the user created; imported ones are edited through the CSV file. */
  source: string;
};

const ROUTE_COLS = `r.id, r.name, r.type, r.grade_label, r.grade_system, r.grade_index, r.source,
  s.id AS sector_id, s.name AS sector_name, s.source AS sector_source, c.id AS crag_id, c.name AS crag_name`;

export type AscentRow = {
  id: string; date: string; style: AscentStyle; attempts: number; rating: number | null; notes: string;
  route_id: string; route_name: string; type: RouteType; grade_index: number; grade_label: string; grade_system: GradeSystem;
  crag_name: string; partner_name: string | null;
};

export async function listAscents(db: SQLiteDatabase): Promise<AscentRow[]> {
  return db.getAllAsync<AscentRow>(
    `SELECT a.id, a.date, a.style, a.attempts, a.rating, a.notes, r.id AS route_id, r.name AS route_name, r.type,
            r.grade_index, r.grade_label, r.grade_system, c.name AS crag_name, p.name AS partner_name
     FROM ascent a JOIN route r ON r.id = a.route_id JOIN sector s ON s.id = r.sector_id JOIN crag c ON c.id = s.crag_id
     LEFT JOIN partner p ON p.id = a.partner_id
     WHERE a.deleted_at IS NULL ORDER BY a.date DESC, a.created_at DESC`,
  );
}

/** Finds an existing row whose name matches ignoring case and Polish letters. */
async function findByName(db: SQLiteDatabase, sql: string, params: string[], name: string): Promise<{ id: string } | null> {
  const rows = await db.getAllAsync<{ id: string; name: string }>(sql, params);
  return rows.find((r) => sameName(r.name, name)) ?? null;
}

/** Type-ahead route search over route, sector and crag names, ignoring case and Polish letters. */
export async function searchRoutes(db: SQLiteDatabase, query: string, limit = 8): Promise<RouteRow[]> {
  const all = await db.getAllAsync<RouteRow>(
    `SELECT ${ROUTE_COLS}
     FROM route r JOIN sector s ON s.id = r.sector_id JOIN crag c ON c.id = s.crag_id
     WHERE r.deleted_at IS NULL`,
  );
  return suggest(all, query, (r) => r.name, (r) => [r.sector_name, r.crag_name], limit);
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

export type CragChoice = { id: string; name: string; region_id: string | null; region_name: string | null; routes: number };

export async function listCragChoices(db: SQLiteDatabase): Promise<CragChoice[]> {
  return db.getAllAsync<CragChoice>(
    `SELECT c.id, c.name, c.region_id, g.name AS region_name,
            (SELECT COUNT(*) FROM route r JOIN sector s ON s.id = r.sector_id WHERE s.crag_id = c.id AND r.deleted_at IS NULL) AS routes
     FROM crag c LEFT JOIN region g ON g.id = c.region_id AND g.deleted_at IS NULL
     WHERE c.deleted_at IS NULL ORDER BY c.name`);
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
    `SELECT a.id, a.date, a.style, a.attempts, a.rating, a.notes, r.id AS route_id, r.name AS route_name, r.type,
            r.grade_index, r.grade_label, r.grade_system, c.name AS crag_name, p.name AS partner_name
     FROM ascent a JOIN route r ON r.id = a.route_id JOIN sector s ON s.id = r.sector_id JOIN crag c ON c.id = s.crag_id
     LEFT JOIN partner p ON p.id = a.partner_id
     WHERE a.route_id = ? AND a.deleted_at IS NULL ORDER BY a.date DESC, a.created_at DESC`,
    [routeId],
  );
}

export type NewAscent = {
  routeId: string; date: string; style: AscentStyle; attempts: number; rating: number | null;
  notes: string; partnerName: string; weather: string;
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
  const id = newId();
  const t = now();
  await db.withTransactionAsync(async () => {
    const pid = await partnerId(db, a.partnerName, t);
    await db.runAsync(
      `INSERT INTO ascent (id, route_id, date, style, attempts, rating, notes, partner_id, weather, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, a.routeId, a.date, a.style, a.attempts, a.rating, a.notes, pid, a.weather, t, t],
    );
  });
  return id;
}

export async function updateAscent(db: SQLiteDatabase, id: string, a: NewAscent): Promise<void> {
  const t = now();
  await db.withTransactionAsync(async () => {
    const pid = await partnerId(db, a.partnerName, t);
    await db.runAsync(
      `UPDATE ascent SET route_id = ?, date = ?, style = ?, attempts = ?, rating = ?, notes = ?, partner_id = ?, weather = ?, updated_at = ?
       WHERE id = ?`,
      [a.routeId, a.date, a.style, a.attempts, a.rating, a.notes, pid, a.weather, t, id],
    );
  });
}

/** Soft delete: the row stays (with deleted_at) so backups and a later sync carry the deletion. */
export async function deleteAscent(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.runAsync('UPDATE ascent SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, id]);
}

export type AscentDetail = AscentRow & { weather: string; route: RouteRow };

export async function getAscent(db: SQLiteDatabase, id: string): Promise<AscentDetail | null> {
  const a = await db.getFirstAsync<AscentRow & { weather: string }>(
    `SELECT a.id, a.date, a.style, a.attempts, a.rating, a.notes, a.weather, r.id AS route_id, r.name AS route_name, r.type,
            r.grade_index, r.grade_label, r.grade_system, c.name AS crag_name, p.name AS partner_name
     FROM ascent a JOIN route r ON r.id = a.route_id JOIN sector s ON s.id = r.sector_id JOIN crag c ON c.id = s.crag_id
     LEFT JOIN partner p ON p.id = a.partner_id
     WHERE a.id = ? AND a.deleted_at IS NULL`,
    [id],
  );
  if (!a) return null;
  const route = await getRoute(db, a.route_id);
  return route ? { ...a, route } : null;
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
  const t = now();
  const routeId = newId();
  await db.withTransactionAsync(async () => {
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
  });
  return routeId;
}

export type CragRow = {
  id: string; name: string; lat: number | null; lng: number | null; routes: number; source: string;
  /** The crag's own area (the deepest: group, area or region). */
  region_id: string | null; region_name: string | null;
};

export async function listCrags(db: SQLiteDatabase): Promise<CragRow[]> {
  return db.getAllAsync<CragRow>(
    `SELECT c.id, c.name, c.lat, c.lng, c.source, g.id AS region_id, g.name AS region_name,
            (SELECT COUNT(*) FROM route r JOIN sector s ON s.id = r.sector_id
             WHERE s.crag_id = c.id AND r.deleted_at IS NULL) AS routes
     FROM crag c LEFT JOIN region g ON g.id = c.region_id AND g.deleted_at IS NULL
     WHERE c.deleted_at IS NULL ORDER BY g.name IS NULL, g.name, c.name`,
  );
}

export type CragDetail = { id: string; name: string; description: string; approach: string; region: string | null; region_id: string | null; source: string };

export async function getCrag(db: SQLiteDatabase, id: string): Promise<CragDetail | null> {
  return db.getFirstAsync<CragDetail>(
    `SELECT c.id, c.name, c.description, c.approach, c.source, g.name AS region, g.id AS region_id
     FROM crag c LEFT JOIN region g ON g.id = c.region_id AND g.deleted_at IS NULL WHERE c.id = ? AND c.deleted_at IS NULL`,
    [id],
  );
}

// ---- Editing the user's own crags, sectors, routes and regions ----

/** What a delete would take with it, shown in the confirmation. */
export type Usage = { sectors: number; routes: number; ascents: number };

const count = async (db: SQLiteDatabase, sql: string, params: string[]) => (await db.getFirstAsync<{ n: number }>(sql, params))?.n ?? 0;

async function usage(db: SQLiteDatabase, routeFilter: string, sectorFilter: string | null, id: string): Promise<Usage> {
  return {
    sectors: sectorFilter ? await count(db, `SELECT COUNT(*) AS n FROM sector s WHERE s.deleted_at IS NULL AND ${sectorFilter}`, [id]) : 0,
    routes: await count(db, `SELECT COUNT(*) AS n FROM route r JOIN sector s ON s.id = r.sector_id WHERE r.deleted_at IS NULL AND ${routeFilter}`, [id]),
    ascents: await count(db,
      `SELECT COUNT(*) AS n FROM ascent a JOIN route r ON r.id = a.route_id JOIN sector s ON s.id = r.sector_id
       WHERE a.deleted_at IS NULL AND r.deleted_at IS NULL AND ${routeFilter}`, [id]),
  };
}

export const cragUsage = (db: SQLiteDatabase, id: string) => usage(db, 's.crag_id = ?', 's.crag_id = ?', id);
export const sectorUsage = (db: SQLiteDatabase, id: string) => usage(db, 's.id = ?', null, id);
export const routeUsage = (db: SQLiteDatabase, id: string) => usage(db, 'r.id = ?', null, id);

/** Soft-deletes routes matching the filter, with their pitches and ascents. */
async function deleteRoutesWhere(db: SQLiteDatabase, routeFilter: string, id: string, t: number) {
  const routeIds = `SELECT r.id FROM route r JOIN sector s ON s.id = r.sector_id WHERE ${routeFilter}`;
  await db.runAsync(`UPDATE ascent SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL AND route_id IN (${routeIds})`, [t, t, id]);
  await db.runAsync(`UPDATE pitch SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL AND route_id IN (${routeIds})`, [t, t, id]);
  await db.runAsync(`UPDATE route SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL AND id IN (${routeIds})`, [t, t, id]);
}

export async function deleteRoute(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.withTransactionAsync(() => deleteRoutesWhere(db, 'r.id = ?', id, t));
}

export async function deleteSector(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.withTransactionAsync(async () => {
    await deleteRoutesWhere(db, 's.id = ?', id, t);
    await db.runAsync('UPDATE sector SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, id]);
  });
}

export async function deleteCrag(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.withTransactionAsync(async () => {
    await deleteRoutesWhere(db, 's.crag_id = ?', id, t);
    await db.runAsync('UPDATE sector SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL AND crag_id = ?', [t, t, id]);
    await db.runAsync('UPDATE crag SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, id]);
  });
}

export type AreaNames = { region: string; area: string; group: string };

async function childAreaId(db: SQLiteDatabase, parentId: string | null, level: AreaLevel, name: string, t: number, source: string): Promise<string> {
  const ex = await findByName(db, 'SELECT id, name FROM region WHERE deleted_at IS NULL AND level = ? AND parent_id IS ?', [level, parentId as string], name);
  if (ex) return ex.id;
  const id = newId();
  await db.runAsync('INSERT INTO region (id, name, parent_id, level, source, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [id, name.trim(), parentId, level, source, t, t]);
  return id;
}

/**
 * Finds or creates the chain region → area → group and returns the deepest id (null without a region).
 * Names match ignoring case and Polish letters; a missing area stops the chain at the region.
 */
export async function areaIdFor(db: SQLiteDatabase, names: AreaNames, t: number, source = 'user'): Promise<string | null> {
  if (!names.region.trim()) return null;
  let id = await childAreaId(db, null, 'region', names.region, t, source);
  if (!names.area.trim()) return id;
  id = await childAreaId(db, id, 'area', names.area, t, source);
  if (!names.group.trim()) return id;
  return childAreaId(db, id, 'group', names.group, t, source);
}

async function sectorIdFor(db: SQLiteDatabase, cragId: string, name: string, t: number): Promise<string> {
  const ex = await findByName(db, 'SELECT id, name FROM sector WHERE crag_id = ? AND deleted_at IS NULL', [cragId], name);
  if (ex) return ex.id;
  const id = newId();
  await db.runAsync('INSERT INTO sector (id, crag_id, name, created_at, updated_at) VALUES (?,?,?,?,?)', [id, cragId, name, t, t]);
  return id;
}

export type CragInput = { name: string; areas: AreaNames; description: string; approach: string; sectorNames?: string[] };

/** Creates a crag (no id) or updates one; region, area and group are found or created by name. Returns the crag id. */
export async function saveCrag(db: SQLiteDatabase, id: string | null, c: CragInput): Promise<string> {
  const t = now();
  const cragId = id ?? newId();
  await db.withTransactionAsync(async () => {
    const regionId = await areaIdFor(db, c.areas, t);
    if (id) {
      await db.runAsync('UPDATE crag SET name = ?, region_id = ?, description = ?, approach = ?, updated_at = ? WHERE id = ?',
        [c.name, regionId, c.description, c.approach, t, id]);
    } else {
      await db.runAsync('INSERT INTO crag (id, region_id, name, description, approach, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
        [cragId, regionId, c.name, c.description, c.approach, t, t]);
    }
    for (const s of c.sectorNames ?? []) await sectorIdFor(db, cragId, s, t);
  });
  return cragId;
}

export type RouteInput = { sectorName: string; name: string; type: RouteType; gradeLabel: string; gradeSystem: GradeSystem; gradeIndex: number };

export type SectorRow = { id: string; name: string; source: string };

/** All sectors of a crag, also those without routes yet. */
export async function listSectors(db: SQLiteDatabase, cragId: string): Promise<SectorRow[]> {
  return db.getAllAsync<SectorRow>('SELECT id, name, source FROM sector WHERE crag_id = ? AND deleted_at IS NULL ORDER BY name', [cragId]);
}

/** Adds a sector to a crag; returns the existing one when the name already exists (ignoring case and Polish letters). */
export async function addSector(db: SQLiteDatabase, cragId: string, name: string): Promise<string> {
  return sectorIdFor(db, cragId, name, now());
}

/** Adds a route to a crag without an ascent; an empty sector name puts it in a sector named like the crag. */
export async function createRoute(db: SQLiteDatabase, cragId: string, r: RouteInput): Promise<string> {
  const t = now();
  const id = newId();
  await db.withTransactionAsync(async () => {
    const crag = await db.getFirstAsync<{ name: string }>('SELECT name FROM crag WHERE id = ? AND deleted_at IS NULL', [cragId]);
    if (!crag) throw new Error('Crag not found');
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
    if (!cur) throw new Error('Route not found');
    const sectorId = await sectorIdFor(db, cur.crag_id, r.sectorName, t);
    await db.runAsync(
      'UPDATE route SET sector_id = ?, name = ?, type = ?, grade_label = ?, grade_system = ?, grade_index = ?, updated_at = ? WHERE id = ?',
      [sectorId, r.name, r.type, r.gradeLabel, r.gradeSystem, r.gradeIndex, t, id]);
  });
}

export type NamedRow = { id: string; name: string; source: string; parent_id: string | null };

export async function getSector(db: SQLiteDatabase, id: string): Promise<NamedRow | null> {
  return db.getFirstAsync<NamedRow>('SELECT id, name, source, crag_id AS parent_id FROM sector WHERE id = ? AND deleted_at IS NULL', [id]);
}

export async function renameSector(db: SQLiteDatabase, id: string, name: string): Promise<void> {
  await db.runAsync('UPDATE sector SET name = ?, updated_at = ? WHERE id = ?', [name, now(), id]);
}

export async function listSectorNames(db: SQLiteDatabase, cragId: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>('SELECT name FROM sector WHERE crag_id = ? AND deleted_at IS NULL ORDER BY name', [cragId]);
  return rows.map((r) => r.name);
}

export type AreaRow = Area & { source: string };

export async function listAreas(db: SQLiteDatabase): Promise<AreaRow[]> {
  return db.getAllAsync<AreaRow>('SELECT id, name, level, parent_id, source FROM region WHERE deleted_at IS NULL ORDER BY name');
}

export async function getArea(db: SQLiteDatabase, id: string): Promise<(NamedRow & { level: AreaLevel }) | null> {
  return db.getFirstAsync<NamedRow & { level: AreaLevel }>('SELECT id, name, source, parent_id, level FROM region WHERE id = ? AND deleted_at IS NULL', [id]);
}

/** Adds an area below `parentId` (a region at the top); the level follows the parent. Reuses an existing name. */
export async function addArea(db: SQLiteDatabase, parentId: string | null, name: string): Promise<string> {
  const parent = parentId ? await getArea(db, parentId) : null;
  const level = childLevel(parent);
  if (!level) throw new Error('A group cannot contain areas');
  return childAreaId(db, parentId, level, name, now(), 'user');
}

export async function renameArea(db: SQLiteDatabase, id: string, name: string): Promise<void> {
  await db.runAsync('UPDATE region SET name = ?, updated_at = ? WHERE id = ?', [name, now(), id]);
}

/** Deletes an area only: its crags and sub-areas move up to its parent (or lose their area at the top). */
export async function deleteArea(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.withTransactionAsync(async () => {
    const cur = await db.getFirstAsync<{ parent_id: string | null; level: AreaLevel }>('SELECT parent_id, level FROM region WHERE id = ?', [id]);
    const parent = cur?.parent_id ?? null;
    await db.runAsync('UPDATE crag SET region_id = ?, updated_at = ? WHERE region_id = ?', [parent, t, id]);
    await db.runAsync('UPDATE region SET parent_id = ?, updated_at = ? WHERE parent_id = ? AND deleted_at IS NULL', [parent, t, id]);
    await db.runAsync('UPDATE region SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, id]);
    await relevelAreas(db, t);
  });
}

/** Sets each area's level from its depth (region, area, group) after areas moved up. */
async function relevelAreas(db: SQLiteDatabase, t: number): Promise<void> {
  const areas = await listAreas(db);
  const byId = new Map(areas.map((a) => [a.id, a]));
  const depth = (a: AreaRow, seen = new Set<string>()): number => {
    const p = a.parent_id ? byId.get(a.parent_id) : undefined;
    if (!p || seen.has(a.id)) return 0;
    seen.add(a.id);
    return 1 + depth(p, seen);
  };
  const levels: AreaLevel[] = ['region', 'area', 'group'];
  for (const a of areas) {
    const want = levels[Math.min(depth(a), 2)];
    if (a.level !== want) await db.runAsync('UPDATE region SET level = ?, updated_at = ? WHERE id = ?', [want, t, a.id]);
  }
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

export type GoalRow = { id: string; kind: string; title: string; target: number | null; done_at: number | null };

export async function listGoals(db: SQLiteDatabase): Promise<GoalRow[]> {
  return db.getAllAsync<GoalRow>('SELECT id, kind, title, target, done_at FROM goal WHERE deleted_at IS NULL ORDER BY done_at IS NOT NULL, created_at DESC');
}

export async function addGoal(db: SQLiteDatabase, kind: 'count' | 'project' | 'wishlist', title: string, target: number | null): Promise<void> {
  const t = now();
  await db.runAsync('INSERT INTO goal (id, kind, title, target, created_at, updated_at) VALUES (?,?,?,?,?,?)', [newId(), kind, title, target, t, t]);
}

export async function setGoalDone(db: SQLiteDatabase, id: string, done: boolean): Promise<void> {
  const t = now();
  await db.runAsync('UPDATE goal SET done_at = ?, updated_at = ? WHERE id = ?', [done ? t : null, t, id]);
}

export async function deleteGoal(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.runAsync('UPDATE goal SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, id]);
}

/**
 * After a re-import with a new structure, imported sectors, crags and areas that the plan no longer
 * mentions and that hold nothing are deleted. Anything the user added to them keeps them alive.
 */
async function removeEmptyImports(db: SQLiteDatabase, plan: ImportPlan, t: number): Promise<void> {
  const keep = (kind: string, keys: string[]) => new Set(keys.map((k) => `imp:${kind}:${k}`));
  const sectors = keep('sector', plan.sectors.map((x) => x.key));
  const crags = keep('crag', plan.crags.map((x) => x.key));
  for (const s of await db.getAllAsync<{ id: string }>(
    `SELECT id FROM sector s WHERE s.deleted_at IS NULL AND s.id LIKE 'imp:sector:%'
     AND NOT EXISTS (SELECT 1 FROM route r WHERE r.sector_id = s.id AND r.deleted_at IS NULL)`)) {
    if (!sectors.has(s.id)) await db.runAsync('UPDATE sector SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, s.id]);
  }
  for (const c of await db.getAllAsync<{ id: string }>(
    `SELECT id FROM crag c WHERE c.deleted_at IS NULL AND c.id LIKE 'imp:crag:%'
     AND NOT EXISTS (SELECT 1 FROM sector s WHERE s.crag_id = c.id AND s.deleted_at IS NULL)`)) {
    if (!crags.has(c.id)) await db.runAsync('UPDATE crag SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, c.id]);
  }
  for (let removed = true; removed;) {
    const empty = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM region g WHERE g.deleted_at IS NULL AND g.source = 'import'
       AND NOT EXISTS (SELECT 1 FROM crag c WHERE c.region_id = g.id AND c.deleted_at IS NULL)
       AND NOT EXISTS (SELECT 1 FROM region k WHERE k.parent_id = g.id AND k.deleted_at IS NULL)`);
    for (const g of empty) await db.runAsync('UPDATE region SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, g.id]);
    removed = empty.length > 0;
  }
}

/** Writes a validated import plan. Re-importing the same keys updates existing rows. */
export async function applyImport(db: SQLiteDatabase, plan: ImportPlan): Promise<{ crags: number; sectors: number; routes: number; pitches: number }> {
  if (plan.errors.length) throw new Error('Import plan has errors');
  const t = now();
  const areaIds = new Map<string, string | null>();
  const idOf = (kind: string, key: string) => `imp:${kind}:${key}`;
  await db.withTransactionAsync(async () => {
    for (const c of plan.crags) {
      const names = { region: c.region, area: c.area, group: c.group };
      const pathKey = JSON.stringify(names);
      if (!areaIds.has(pathKey)) areaIds.set(pathKey, await areaIdFor(db, names, t, 'import'));
      const regionId = areaIds.get(pathKey) ?? null;
      await db.runAsync(
        `INSERT INTO crag (id, region_id, name, lat, lng, description, approach, source, status, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,'import','private',?,?)
         ON CONFLICT(id) DO UPDATE SET region_id=excluded.region_id, name=excluded.name, lat=excluded.lat, lng=excluded.lng,
           description=excluded.description, approach=excluded.approach, updated_at=excluded.updated_at, deleted_at=NULL`,
        [idOf('crag', c.key), regionId, c.name, c.lat, c.lng, c.description, c.approach, t, t],
      );
    }
    for (const s of plan.sectors) {
      await db.runAsync(
        `INSERT INTO sector (id, crag_id, name, lat, lng, aspect, source, status, created_at, updated_at)
         VALUES (?,?,?,?,?,?,'import','private',?,?)
         ON CONFLICT(id) DO UPDATE SET crag_id=excluded.crag_id, name=excluded.name, lat=excluded.lat, lng=excluded.lng,
           aspect=excluded.aspect, updated_at=excluded.updated_at, deleted_at=NULL`,
        [idOf('sector', s.key), idOf('crag', s.cragKey), s.name, s.lat, s.lng, s.aspect, t, t],
      );
    }
    for (const r of plan.routes) {
      await db.runAsync(
        `INSERT INTO route (id, sector_id, name, type, grade_label, grade_system, grade_index, length_m, bolts, author, year, lat, lng,
           description, source, status, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'import','private',?,?)
         ON CONFLICT(id) DO UPDATE SET sector_id=excluded.sector_id, name=excluded.name, type=excluded.type,
           grade_label=excluded.grade_label, grade_system=excluded.grade_system, grade_index=excluded.grade_index,
           length_m=excluded.length_m, bolts=excluded.bolts, author=excluded.author, year=excluded.year, lat=excluded.lat,
           lng=excluded.lng, description=excluded.description, updated_at=excluded.updated_at, deleted_at=NULL`,
        [idOf('route', r.key), idOf('sector', r.sectorKey), r.name, r.type, r.gradeLabel, r.gradeSystem, r.gradeIndex, r.lengthM, r.bolts,
          r.author, r.year, r.lat, r.lng, r.description, t, t],
      );
    }
    for (const p of plan.pitches) {
      await db.runAsync(
        `INSERT INTO pitch (id, route_id, number, grade_label, grade_system, grade_index, length_m, description, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET grade_label=excluded.grade_label, grade_system=excluded.grade_system,
           grade_index=excluded.grade_index, length_m=excluded.length_m, description=excluded.description,
           updated_at=excluded.updated_at, deleted_at=NULL`,
        [idOf('pitch', `${p.routeKey}#${p.number}`), idOf('route', p.routeKey), p.number, p.gradeLabel, p.gradeSystem, p.gradeIndex, p.lengthM, p.description, t, t],
      );
    }
    await removeEmptyImports(db, plan, t);
  });
  return { crags: plan.crags.length, sectors: plan.sectors.length, routes: plan.routes.length, pitches: plan.pitches.length };
}
