import type { SQLiteDatabase } from 'expo-sqlite';
import type { ImportPlan } from '../domain/importPlan';
import { fold } from '../domain/text';
import { areaIdFor } from './areas';
import { now } from './ids';

type Kept = { crags: Set<string>; sectors: Set<string>; routes: Set<string> };

/**
 * After a re-import with a new structure, imported sectors, crags and areas that the plan no longer
 * mentions and that hold nothing are deleted. Anything the user added to them keeps them alive.
 */
async function removeEmptyImports(db: SQLiteDatabase, kept: Kept, t: number): Promise<void> {
  // The file is the list of routes for its crags: imported routes it no longer has are removed,
  // unless you logged an ascent on them. Routes you added yourself are never touched.
  const planCrags = [...kept.crags];
  for (let i = 0; i < planCrags.length; i += 500) {
    const chunk = planCrags.slice(i, i + 500);
    for (const r of await db.getAllAsync<{ id: string }>(
      `SELECT r.id FROM route r JOIN sector s ON s.id = r.sector_id
       WHERE r.deleted_at IS NULL AND r.id LIKE 'imp:route:%' AND s.crag_id IN (${chunk.map(() => '?').join(',')})
       AND NOT EXISTS (SELECT 1 FROM ascent a WHERE a.route_id = r.id AND a.deleted_at IS NULL)`, chunk)) {
      if (!kept.routes.has(r.id)) await db.runAsync('UPDATE route SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, r.id]);
    }
  }
  for (const s of await db.getAllAsync<{ id: string }>(
    `SELECT id FROM sector s WHERE s.deleted_at IS NULL AND s.id LIKE 'imp:sector:%'
     AND NOT EXISTS (SELECT 1 FROM route r WHERE r.sector_id = s.id AND r.deleted_at IS NULL)`)) {
    if (!kept.sectors.has(s.id)) await db.runAsync('UPDATE sector SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, s.id]);
  }
  for (const c of await db.getAllAsync<{ id: string }>(
    `SELECT id FROM crag c WHERE c.deleted_at IS NULL AND c.id LIKE 'imp:crag:%'
     AND NOT EXISTS (SELECT 1 FROM sector s WHERE s.crag_id = c.id AND s.deleted_at IS NULL)`)) {
    if (!kept.crags.has(c.id)) await db.runAsync('UPDATE crag SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, c.id]);
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

type Ids = { crag: Map<string, string>; sector: Map<string, string>; route: Map<string, string>; taken: number };

/**
 * Which rows the plan's crags, sectors and routes write to. A key already imported keeps its row (imp:<kind>:<key>).
 * A new key takes over a crag the app already has under the same name (only when exactly one crag has it), and in such
 * a crag the sector and the route of the same name, so a file made by hand replaces earlier data and keeps the ascents,
 * photos and topo lines on it. Everything else gets a new imp: row. `taken` counts routes taken over this way.
 */
async function resolveIds(db: SQLiteDatabase, plan: ImportPlan): Promise<Ids> {
  const imp = (kind: string, key: string) => `imp:${kind}:${key}`;
  const crags = await db.getAllAsync<{ id: string; name: string; import_key: string | null }>('SELECT id, name, import_key FROM crag WHERE deleted_at IS NULL');
  const sectors = await db.getAllAsync<{ id: string; crag_id: string; name: string; import_key: string | null }>(
    'SELECT id, crag_id, name, import_key FROM sector WHERE deleted_at IS NULL');
  const routes = await db.getAllAsync<{ id: string; sector_id: string; crag_id: string; name: string; import_key: string | null }>(
    'SELECT r.id, r.sector_id, s.crag_id, r.name, r.import_key FROM route r JOIN sector s ON s.id = r.sector_id WHERE r.deleted_at IS NULL AND s.deleted_at IS NULL');
  const live = new Set([...crags, ...sectors, ...routes].map((x) => x.id));
  // Rows that carry a key of the file already (taken over by an earlier import), by kind.
  const keyed = (rows: { id: string; import_key: string | null }[]) => new Map(rows.filter((x) => x.import_key).map((x) => [x.import_key!, x.id]));
  const cragByKey = keyed(crags);
  const sectorByKey = keyed(sectors);
  const routeByKey = keyed(routes);
  const byFold = <T extends { name: string }>(rows: T[], group: (x: T) => string) => {
    const m = new Map<string, T[]>();
    for (const x of rows) { const k = `${group(x)}|${fold(x.name)}`; m.set(k, [...(m.get(k) ?? []), x]); }
    return m;
  };
  const cragsByName = byFold(crags, () => '');
  const sectorsByName = byFold(sectors, (x) => x.crag_id);
  const routesBySector = byFold(routes, (x) => x.sector_id);
  const routesByCrag = byFold(routes, (x) => x.crag_id);
  const one = <T extends { id: string }>(rows: T[] | undefined) => (rows?.length === 1 ? rows[0].id : null);

  const ids: Ids = { crag: new Map(), sector: new Map(), route: new Map(), taken: 0 };
  const takenOver = new Set<string>(); // an existing row is taken by one plan row at most
  const claim = (id: string | null | undefined) => (id && !takenOver.has(id) ? (takenOver.add(id), id) : null);
  /** Each kind in two passes: rows that already carry the plan's key first, so none of them is taken by name for another key. */
  function assign<T extends { key: string }>(items: T[], kind: string, byKey: Map<string, string>, out: Map<string, string>, byName: (x: T) => string | null) {
    for (const x of items) {
      const own = imp(kind, x.key);
      const known = claim(live.has(own) ? own : byKey.get(x.key));
      if (known) out.set(x.key, known);
    }
    for (const x of items) if (!out.has(x.key)) out.set(x.key, claim(byName(x)) ?? imp(kind, x.key));
  }
  assign(plan.crags, 'crag', cragByKey, ids.crag, (c) => one(cragsByName.get(`|${fold(c.name)}`)));
  assign(plan.sectors, 'sector', sectorByKey, ids.sector, (x) => one(sectorsByName.get(`${ids.crag.get(x.cragKey)}|${fold(x.name)}`)));
  const cragOfSector = new Map(plan.sectors.map((x) => [x.key, x.cragKey]));
  assign(plan.routes, 'route', routeByKey, ids.route, (r) => {
    // Same sector first; a route that moved to another wall of the same crag is still found by its name in the crag.
    const found = one(routesBySector.get(`${ids.sector.get(r.sectorKey)}|${fold(r.name)}`))
      ?? one(routesByCrag.get(`${ids.crag.get(cragOfSector.get(r.sectorKey)!)}|${fold(r.name)}`));
    if (found && !takenOver.has(found)) ids.taken++;
    return found;
  });
  return ids;
}

const IMPORTED_ROUTES_TO_REMOVE = `FROM route r WHERE r.deleted_at IS NULL AND r.id LIKE 'imp:route:%'
  AND NOT EXISTS (SELECT 1 FROM ascent a WHERE a.route_id = r.id AND a.deleted_at IS NULL)`;

/** What "remove imported data" would delete: imported routes without your ascents, and the crags left empty by that. */
export async function importedUsage(db: SQLiteDatabase): Promise<{ crags: number; routes: number }> {
  const routes = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n ${IMPORTED_ROUTES_TO_REMOVE}`);
  const crags = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM crag c WHERE c.deleted_at IS NULL AND c.id LIKE 'imp:crag:%'
     AND NOT EXISTS (SELECT 1 FROM route r JOIN sector s ON s.id = r.sector_id
       WHERE s.crag_id = c.id AND r.deleted_at IS NULL AND s.deleted_at IS NULL
       AND (r.id NOT LIKE 'imp:route:%' OR EXISTS (SELECT 1 FROM ascent a WHERE a.route_id = r.id AND a.deleted_at IS NULL)))`);
  return { crags: crags?.n ?? 0, routes: routes?.n ?? 0 };
}

/**
 * Removes everything that came from CSV imports, so another file can replace it. Kept: routes with your ascents
 * (and their crags and areas) and everything you added yourself. Empty imported sectors, crags and areas go too.
 */
export async function removeImported(db: SQLiteDatabase): Promise<void> {
  const t = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE route SET deleted_at = ?, updated_at = ? WHERE id IN (SELECT r.id ${IMPORTED_ROUTES_TO_REMOVE})`, [t, t]);
    await removeEmptyImports(db, { crags: new Set(), sectors: new Set(), routes: new Set() }, t);
  });
}

/** Runs one statement for many rows, prepared once (thousands of rows in a big import). */
async function runMany(db: SQLiteDatabase, sql: string, rows: (string | number | null)[][]): Promise<void> {
  if (!rows.length) return;
  const stmt = await db.prepareAsync(sql);
  try {
    for (const row of rows) await stmt.executeAsync(row);
  } finally {
    await stmt.finalizeAsync();
  }
}

/**
 * Writes a validated import plan. Re-importing the same keys updates existing rows; see resolveIds for rows taken over by name.
 * An empty optional field in the file keeps what the row already has (a description, length, bolts…), and a position set on
 * the phone is never replaced.
 */
export async function applyImport(db: SQLiteDatabase, plan: ImportPlan): Promise<{ crags: number; sectors: number; routes: number; taken: number }> {
  if (plan.errors.length) throw new Error('Import plan has errors');
  const t = now();
  const memo = new Map<string, string>();
  let taken = 0;
  await db.withTransactionAsync(async () => {
    const ids = await resolveIds(db, plan);
    taken = ids.taken;
    const crags: (string | number | null)[][] = [];
    for (const c of plan.crags) {
      const regionId = await areaIdFor(db, { region: c.region, area: c.area, group: c.group }, t, 'import', memo);
      const pos = c.lat != null && c.lng != null ? (c.approx ? 'approx' : 'file') : '';
      crags.push([ids.crag.get(c.key)!, regionId, c.name, c.lat, c.lng, c.description, c.approach, t, t, pos, c.key]);
    }
    await runMany(db,
      `INSERT INTO crag (id, region_id, name, lat, lng, description, approach, source, status, created_at, updated_at, pos_source, import_key)
       VALUES (?,?,?,?,?,?,?,'import','private',?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET region_id=excluded.region_id, name=excluded.name, import_key=excluded.import_key,
         lat=CASE WHEN crag.pos_source = 'user' OR excluded.lat IS NULL THEN crag.lat ELSE excluded.lat END,
         lng=CASE WHEN crag.pos_source = 'user' OR excluded.lat IS NULL THEN crag.lng ELSE excluded.lng END,
         pos_source=CASE WHEN crag.pos_source = 'user' OR excluded.lat IS NULL THEN crag.pos_source ELSE excluded.pos_source END,
         description=CASE WHEN excluded.description = '' THEN crag.description ELSE excluded.description END,
         approach=CASE WHEN excluded.approach = '' THEN crag.approach ELSE excluded.approach END,
         updated_at=excluded.updated_at, deleted_at=NULL`,
      crags);
    await runMany(db,
      `INSERT INTO sector (id, crag_id, name, lat, lng, aspect, source, status, created_at, updated_at, import_key)
       VALUES (?,?,?,?,?,?,'import','private',?,?,?)
       ON CONFLICT(id) DO UPDATE SET crag_id=excluded.crag_id, name=excluded.name, import_key=excluded.import_key, updated_at=excluded.updated_at, deleted_at=NULL`,
      plan.sectors.map((x) => [ids.sector.get(x.key)!, ids.crag.get(x.cragKey)!, x.name, x.lat, x.lng, x.aspect, t, t, x.key]));
    await runMany(db,
      `INSERT INTO route (id, sector_id, name, type, grade_label, grade_system, grade_index, length_m, bolts, author, year, lat, lng,
         description, source, status, created_at, updated_at, import_key)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'import','private',?,?,?)
       ON CONFLICT(id) DO UPDATE SET sector_id=excluded.sector_id, name=excluded.name, type=excluded.type, import_key=excluded.import_key,
         grade_label=excluded.grade_label, grade_system=excluded.grade_system, grade_index=excluded.grade_index,
         length_m=COALESCE(excluded.length_m, route.length_m), bolts=COALESCE(excluded.bolts, route.bolts),
         author=CASE WHEN excluded.author = '' THEN route.author ELSE excluded.author END, year=COALESCE(excluded.year, route.year),
         description=CASE WHEN excluded.description = '' THEN route.description ELSE excluded.description END,
         updated_at=excluded.updated_at, deleted_at=NULL`,
      plan.routes.map((r) => [ids.route.get(r.key)!, ids.sector.get(r.sectorKey)!, r.name, r.type, r.gradeLabel, r.gradeSystem, r.gradeIndex,
        r.lengthM, r.bolts, r.author, r.year, r.lat, r.lng, r.description, t, t, r.key]));
    await removeEmptyImports(db, { crags: new Set(ids.crag.values()), sectors: new Set(ids.sector.values()), routes: new Set(ids.route.values()) }, t);
  });
  return { crags: plan.crags.length, sectors: plan.sectors.length, routes: plan.routes.length, taken };
}
