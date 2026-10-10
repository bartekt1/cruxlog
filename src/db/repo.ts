import type { SQLiteDatabase } from 'expo-sqlite';
import { type AscentStyle, type GradeSystem, type RouteType } from '../domain/grades';
import type { ImportPlan } from '../domain/csvImport';
import { newId, now } from './ids';

export type RouteRow = {
  id: string; name: string; type: RouteType; grade_label: string; grade_system: GradeSystem; grade_index: number;
  sector_name: string; crag_name: string;
};

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

export async function searchRoutes(db: SQLiteDatabase, query: string): Promise<RouteRow[]> {
  return db.getAllAsync<RouteRow>(
    `SELECT r.id, r.name, r.type, r.grade_label, r.grade_system, r.grade_index, s.name AS sector_name, c.name AS crag_name
     FROM route r JOIN sector s ON s.id = r.sector_id JOIN crag c ON c.id = s.crag_id
     WHERE r.deleted_at IS NULL AND (r.name LIKE ? OR c.name LIKE ? OR s.name LIKE ?)
     ORDER BY r.name LIMIT 50`,
    [`%${query.trim()}%`, `%${query.trim()}%`, `%${query.trim()}%`],
  );
}

export type NewAscent = {
  routeId: string; date: string; style: AscentStyle; attempts: number; rating: number | null;
  notes: string; partnerName: string; weather: string;
};

export async function addAscent(db: SQLiteDatabase, a: NewAscent): Promise<string> {
  const id = newId();
  const t = now();
  await db.withTransactionAsync(async () => {
    let partnerId: string | null = null;
    const name = a.partnerName.trim();
    if (name) {
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM partner WHERE name = ? AND deleted_at IS NULL', [name]);
      partnerId = existing?.id ?? newId();
      if (!existing) {
        await db.runAsync('INSERT INTO partner (id, name, created_at, updated_at) VALUES (?,?,?,?)', [partnerId, name, t, t]);
      }
    }
    await db.runAsync(
      `INSERT INTO ascent (id, route_id, date, style, attempts, rating, notes, partner_id, weather, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, a.routeId, a.date, a.style, a.attempts, a.rating, a.notes, partnerId, a.weather, t, t],
    );
  });
  return id;
}

export type NewRoute = { cragName: string; sectorName: string; name: string; type: RouteType; gradeLabel: string; gradeSystem: GradeSystem; gradeIndex: number };

/** A user-created route: private by default, ready to be proposed to the catalog later. */
export async function addUserRoute(db: SQLiteDatabase, r: NewRoute): Promise<string> {
  const t = now();
  const routeId = newId();
  await db.withTransactionAsync(async () => {
    let crag = await db.getFirstAsync<{ id: string }>('SELECT id FROM crag WHERE name = ? AND deleted_at IS NULL', [r.cragName]);
    if (!crag) {
      crag = { id: newId() };
      await db.runAsync('INSERT INTO crag (id, name, created_at, updated_at) VALUES (?,?,?,?)', [crag.id, r.cragName, t, t]);
    }
    let sector = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM sector WHERE crag_id = ? AND name = ? AND deleted_at IS NULL', [crag.id, r.sectorName]);
    if (!sector) {
      sector = { id: newId() };
      await db.runAsync('INSERT INTO sector (id, crag_id, name, created_at, updated_at) VALUES (?,?,?,?,?)', [sector.id, crag.id, r.sectorName, t, t]);
    }
    await db.runAsync(
      `INSERT INTO route (id, sector_id, name, type, grade_label, grade_system, grade_index, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [routeId, sector.id, r.name, r.type, r.gradeLabel, r.gradeSystem, r.gradeIndex, t, t],
    );
  });
  return routeId;
}

export type CragRow = { id: string; name: string; lat: number | null; lng: number | null; routes: number };

export async function listCrags(db: SQLiteDatabase): Promise<CragRow[]> {
  return db.getAllAsync<CragRow>(
    `SELECT c.id, c.name, c.lat, c.lng,
            (SELECT COUNT(*) FROM route r JOIN sector s ON s.id = r.sector_id
             WHERE s.crag_id = c.id AND r.deleted_at IS NULL) AS routes
     FROM crag c WHERE c.deleted_at IS NULL ORDER BY c.name`,
  );
}

export type GoalRow = { id: string; kind: string; title: string; target: number | null; done_at: number | null };

export async function listGoals(db: SQLiteDatabase): Promise<GoalRow[]> {
  return db.getAllAsync<GoalRow>('SELECT id, kind, title, target, done_at FROM goal WHERE deleted_at IS NULL ORDER BY created_at DESC');
}

export async function addGoal(db: SQLiteDatabase, kind: 'count' | 'project' | 'wishlist', title: string, target: number | null): Promise<void> {
  const t = now();
  await db.runAsync('INSERT INTO goal (id, kind, title, target, created_at, updated_at) VALUES (?,?,?,?,?,?)', [newId(), kind, title, target, t, t]);
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
          if (!ex) await db.runAsync('INSERT INTO region (id, name, country, created_at, updated_at) VALUES (?,?,?,?,?)', [regionId, c.region, c.country, t, t]);
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
