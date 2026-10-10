import type { SQLiteDatabase } from 'expo-sqlite';
import { type AscentStyle, type GradeSystem, type RouteType } from '../domain/grades';
import type { ImportPlan } from '../domain/csvImport';
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
  route_id: string; route_name: string; type: RouteType; grade_index: number; crag_name: string; partner_name: string | null;
};

export async function listAscents(db: SQLiteDatabase): Promise<AscentRow[]> {
  return db.getAllAsync<AscentRow>(
    `SELECT a.id, a.date, a.style, a.attempts, a.rating, a.notes, r.id AS route_id, r.name AS route_name, r.type,
            r.grade_index, c.name AS crag_name, p.name AS partner_name
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

export type CragChoice = { id: string; name: string; region_name: string | null };

export async function listCragChoices(db: SQLiteDatabase): Promise<CragChoice[]> {
  return db.getAllAsync<CragChoice>(
    `SELECT c.id, c.name, g.name AS region_name FROM crag c LEFT JOIN region g ON g.id = c.region_id AND g.deleted_at IS NULL
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
            r.grade_index, c.name AS crag_name, p.name AS partner_name
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
            r.grade_index, c.name AS crag_name, p.name AS partner_name
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
  /** Used only when the crag is new. */
  regionName?: string;
};

/** A user-created route: private by default, ready to be proposed to the catalog later. */
export async function addUserRoute(db: SQLiteDatabase, r: NewRoute): Promise<string> {
  const t = now();
  const routeId = newId();
  await db.withTransactionAsync(async () => {
    let crag = await findByName(db, 'SELECT id, name FROM crag WHERE deleted_at IS NULL', [], r.cragName);
    if (!crag) {
      crag = { id: newId() };
      const regionId = await regionIdFor(db, r.regionName ?? '', t);
      await db.runAsync('INSERT INTO crag (id, region_id, name, created_at, updated_at) VALUES (?,?,?,?,?)', [crag.id, regionId, r.cragName, t, t]);
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
  region_id: string | null; region_name: string | null; region_source: string | null;
};

export async function listCrags(db: SQLiteDatabase): Promise<CragRow[]> {
  return db.getAllAsync<CragRow>(
    `SELECT c.id, c.name, c.lat, c.lng, c.source, g.id AS region_id, g.name AS region_name, g.source AS region_source,
            (SELECT COUNT(*) FROM route r JOIN sector s ON s.id = r.sector_id
             WHERE s.crag_id = c.id AND r.deleted_at IS NULL) AS routes
     FROM crag c LEFT JOIN region g ON g.id = c.region_id AND g.deleted_at IS NULL
     WHERE c.deleted_at IS NULL ORDER BY g.name IS NULL, g.name, c.name`,
  );
}

export type CragDetail = { id: string; name: string; description: string; approach: string; region: string | null; source: string };

export async function getCrag(db: SQLiteDatabase, id: string): Promise<CragDetail | null> {
  return db.getFirstAsync<CragDetail>(
    `SELECT c.id, c.name, c.description, c.approach, c.source, g.name AS region
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

async function regionIdFor(db: SQLiteDatabase, name: string, t: number): Promise<string | null> {
  const n = name.trim();
  if (!n) return null;
  const ex = await findByName(db, 'SELECT id, name FROM region WHERE deleted_at IS NULL', [], n);
  if (ex) return ex.id;
  const id = newId();
  await db.runAsync('INSERT INTO region (id, name, created_at, updated_at) VALUES (?,?,?,?)', [id, n, t, t]);
  return id;
}

async function sectorIdFor(db: SQLiteDatabase, cragId: string, name: string, t: number): Promise<string> {
  const ex = await findByName(db, 'SELECT id, name FROM sector WHERE crag_id = ? AND deleted_at IS NULL', [cragId], name);
  if (ex) return ex.id;
  const id = newId();
  await db.runAsync('INSERT INTO sector (id, crag_id, name, created_at, updated_at) VALUES (?,?,?,?,?)', [id, cragId, name, t, t]);
  return id;
}

export type CragInput = { name: string; regionName: string; description: string; approach: string };

/** Creates a crag (no id) or updates one; the region is found or created by name. Returns the crag id. */
export async function saveCrag(db: SQLiteDatabase, id: string | null, c: CragInput): Promise<string> {
  const t = now();
  const cragId = id ?? newId();
  await db.withTransactionAsync(async () => {
    const regionId = await regionIdFor(db, c.regionName, t);
    if (id) {
      await db.runAsync('UPDATE crag SET name = ?, region_id = ?, description = ?, approach = ?, updated_at = ? WHERE id = ?',
        [c.name, regionId, c.description, c.approach, t, id]);
    } else {
      await db.runAsync('INSERT INTO crag (id, region_id, name, description, approach, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
        [cragId, regionId, c.name, c.description, c.approach, t, t]);
    }
  });
  return cragId;
}

export type RouteInput = { sectorName: string; name: string; type: RouteType; gradeLabel: string; gradeSystem: GradeSystem; gradeIndex: number };

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

export type RegionRow = { id: string; name: string; source: string; crags: number };

export async function listRegions(db: SQLiteDatabase): Promise<RegionRow[]> {
  return db.getAllAsync<RegionRow>(
    `SELECT g.id, g.name, g.source, (SELECT COUNT(*) FROM crag c WHERE c.region_id = g.id AND c.deleted_at IS NULL) AS crags
     FROM region g WHERE g.deleted_at IS NULL ORDER BY g.name`);
}

export async function getRegion(db: SQLiteDatabase, id: string): Promise<NamedRow | null> {
  return db.getFirstAsync<NamedRow>('SELECT id, name, source, NULL AS parent_id FROM region WHERE id = ? AND deleted_at IS NULL', [id]);
}

export async function renameRegion(db: SQLiteDatabase, id: string, name: string): Promise<void> {
  await db.runAsync('UPDATE region SET name = ?, updated_at = ? WHERE id = ?', [name, now(), id]);
}

/** Deletes a region only; its crags stay, without a region. */
export async function deleteRegion(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE crag SET region_id = NULL, updated_at = ? WHERE region_id = ?', [t, id]);
    await db.runAsync('UPDATE region SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, id]);
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

/** Writes a validated import plan. Re-importing the same keys updates existing rows. */
export async function applyImport(db: SQLiteDatabase, plan: ImportPlan): Promise<{ crags: number; sectors: number; routes: number; pitches: number }> {
  if (plan.errors.length) throw new Error('Import plan has errors');
  const t = now();
  const regionIds = new Map<string, string>();
  const idOf = (kind: string, key: string) => `imp:${kind}:${key}`;
  await db.withTransactionAsync(async () => {
    for (const c of plan.crags) {
      let regionId: string | null = null;
      if (c.region) {
        regionId = regionIds.get(c.region) ?? null;
        if (!regionId) {
          const ex = await db.getFirstAsync<{ id: string }>('SELECT id FROM region WHERE name = ? AND deleted_at IS NULL', [c.region]);
          regionId = ex?.id ?? newId();
          if (!ex) await db.runAsync("INSERT INTO region (id, name, country, source, created_at, updated_at) VALUES (?,?,?,'import',?,?)", [regionId, c.region, c.country, t, t]);
          regionIds.set(c.region, regionId);
        }
      }
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
  });
  return { crags: plan.crags.length, sectors: plan.sectors.length, routes: plan.routes.length, pitches: plan.pitches.length };
}
