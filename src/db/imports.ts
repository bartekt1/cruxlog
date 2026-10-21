import type { SQLiteDatabase } from 'expo-sqlite';
import { emptyPlan, type ImportPlan } from '../domain/importPlan';
import { areaIdFor } from './areas';
import { now } from './ids';

/**
 * After a re-import with a new structure, imported sectors, crags and areas that the plan no longer
 * mentions and that hold nothing are deleted. Anything the user added to them keeps them alive.
 */
async function removeEmptyImports(db: SQLiteDatabase, plan: ImportPlan, t: number): Promise<void> {
  const keep = (kind: string, keys: string[]) => new Set(keys.map((k) => `imp:${kind}:${k}`));
  // The file is the list of routes for its crags: imported routes it no longer has are removed,
  // unless you logged an ascent on them. Routes you added yourself are never touched.
  const routes = keep('route', plan.routes.map((x) => x.key));
  const planCrags = [...keep('crag', plan.crags.map((x) => x.key))];
  for (let i = 0; i < planCrags.length; i += 500) {
    const chunk = planCrags.slice(i, i + 500);
    for (const r of await db.getAllAsync<{ id: string }>(
      `SELECT r.id FROM route r JOIN sector s ON s.id = r.sector_id
       WHERE r.deleted_at IS NULL AND r.id LIKE 'imp:route:%' AND s.crag_id IN (${chunk.map(() => '?').join(',')})
       AND NOT EXISTS (SELECT 1 FROM ascent a WHERE a.route_id = r.id AND a.deleted_at IS NULL)`, chunk)) {
      if (!routes.has(r.id)) await db.runAsync('UPDATE route SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, r.id]);
    }
  }
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
    await removeEmptyImports(db, emptyPlan(), t);
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

/** Writes a validated import plan. Re-importing the same keys updates existing rows. */
export async function applyImport(db: SQLiteDatabase, plan: ImportPlan): Promise<{ crags: number; sectors: number; routes: number }> {
  if (plan.errors.length) throw new Error('Import plan has errors');
  const t = now();
  const memo = new Map<string, string>();
  const idOf = (kind: string, key: string) => `imp:${kind}:${key}`;
  await db.withTransactionAsync(async () => {
    const crags: (string | number | null)[][] = [];
    for (const c of plan.crags) {
      const regionId = await areaIdFor(db, { region: c.region, area: c.area, group: c.group }, t, 'import', memo);
      crags.push([idOf('crag', c.key), regionId, c.name, c.lat, c.lng, c.description, c.approach, t, t, c.lat != null && c.lng != null ? 'file' : '']);
    }
    await runMany(db,
      `INSERT INTO crag (id, region_id, name, lat, lng, description, approach, source, status, created_at, updated_at, pos_source)
       VALUES (?,?,?,?,?,?,?,'import','private',?,?,?)
       ON CONFLICT(id) DO UPDATE SET region_id=excluded.region_id, name=excluded.name,
         lat=CASE WHEN crag.pos_source = 'user' OR excluded.lat IS NULL THEN crag.lat ELSE excluded.lat END,
         lng=CASE WHEN crag.pos_source = 'user' OR excluded.lat IS NULL THEN crag.lng ELSE excluded.lng END,
         pos_source=CASE WHEN crag.pos_source = 'user' OR excluded.lat IS NULL THEN crag.pos_source ELSE 'file' END,
         description=excluded.description, approach=excluded.approach, updated_at=excluded.updated_at, deleted_at=NULL`,
      crags);
    await runMany(db,
      `INSERT INTO sector (id, crag_id, name, lat, lng, aspect, source, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,'import','private',?,?)
       ON CONFLICT(id) DO UPDATE SET crag_id=excluded.crag_id, name=excluded.name, lat=excluded.lat, lng=excluded.lng,
         aspect=excluded.aspect, updated_at=excluded.updated_at, deleted_at=NULL`,
      plan.sectors.map((x) => [idOf('sector', x.key), idOf('crag', x.cragKey), x.name, x.lat, x.lng, x.aspect, t, t]));
    await runMany(db,
      `INSERT INTO route (id, sector_id, name, type, grade_label, grade_system, grade_index, length_m, bolts, author, year, lat, lng,
         description, source, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'import','private',?,?)
       ON CONFLICT(id) DO UPDATE SET sector_id=excluded.sector_id, name=excluded.name, type=excluded.type,
         grade_label=excluded.grade_label, grade_system=excluded.grade_system, grade_index=excluded.grade_index,
         length_m=excluded.length_m, bolts=excluded.bolts, author=excluded.author, year=excluded.year, lat=excluded.lat,
         lng=excluded.lng, description=excluded.description, updated_at=excluded.updated_at, deleted_at=NULL`,
      plan.routes.map((r) => [idOf('route', r.key), idOf('sector', r.sectorKey), r.name, r.type, r.gradeLabel, r.gradeSystem, r.gradeIndex,
        r.lengthM, r.bolts, r.author, r.year, r.lat, r.lng, r.description, t, t]));
    await removeEmptyImports(db, plan, t);
  });
  return { crags: plan.crags.length, sectors: plan.sectors.length, routes: plan.routes.length };
}
