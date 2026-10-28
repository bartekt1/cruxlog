import type { SQLiteDatabase } from 'expo-sqlite';
import { sameName } from '../domain/text';
import { areaIdFor, type AreaNames } from './areas';
import { AppError } from '../domain/errors';
import { newId, now } from './ids';
import { cragSnapshot, recordChange, routeSnapshot, sectorSnapshot } from './proposals';
import { count, findByName, sectorIdFor, type NamedRow, type PosSource } from './shared';

export type CragChoice = { id: string; name: string; region_id: string | null; region_name: string | null; routes: number; lat: number | null; lng: number | null; pos_source: PosSource };

export async function listCragChoices(db: SQLiteDatabase): Promise<CragChoice[]> {
  return db.getAllAsync<CragChoice>(
    `SELECT c.id, c.name, c.region_id, g.name AS region_name, c.lat, c.lng, c.pos_source,
            (SELECT COUNT(*) FROM route r JOIN sector s ON s.id = r.sector_id WHERE s.crag_id = c.id AND r.deleted_at IS NULL) AS routes
     FROM crag c LEFT JOIN region g ON g.id = c.region_id AND g.deleted_at IS NULL
     WHERE c.deleted_at IS NULL ORDER BY c.name`);
}

export type CragRow = {
  id: string; name: string; lat: number | null; lng: number | null; pos_source: PosSource; routes: number; source: string;
  /** The crag's own area (the deepest: group, area or region). */
  region_id: string | null; region_name: string | null;
};

export async function listCrags(db: SQLiteDatabase): Promise<CragRow[]> {
  return db.getAllAsync<CragRow>(
    `SELECT c.id, c.name, c.lat, c.lng, c.pos_source, c.source, g.id AS region_id, g.name AS region_name,
            (SELECT COUNT(*) FROM route r JOIN sector s ON s.id = r.sector_id
             WHERE s.crag_id = c.id AND r.deleted_at IS NULL) AS routes
     FROM crag c LEFT JOIN region g ON g.id = c.region_id AND g.deleted_at IS NULL
     WHERE c.deleted_at IS NULL ORDER BY g.name IS NULL, g.name, c.name`,
  );
}

/** Sets (or clears, with null) where a crag is, e.g. from the phone's GPS under the crag or a pin on the map. */
export async function setCragLocation(db: SQLiteDatabase, id: string, at: { lat: number; lng: number } | null): Promise<void> {
  await db.withTransactionAsync(async () => {
    const before = await cragSnapshot(db, id);
    await db.runAsync('UPDATE crag SET lat = ?, lng = ?, pos_source = ?, updated_at = ? WHERE id = ?', [at?.lat ?? null, at?.lng ?? null, at ? 'user' : '', now(), id]);
    await recordChange(db, 'crag_position', before, await cragSnapshot(db, id));
  });
}

export type CragPosition = { key: string; name: string; lat: number; lng: number; approx?: boolean };

/**
 * Sets crag positions from a file: by crag key (ID_skały of an imported crag) or else by name when exactly one crag has it.
 * A position the user set on the phone is kept. Returns how many crags got a position, how many were kept,
 * and the rows that matched none (or more than one) crag.
 */
export async function applyCragPositions(db: SQLiteDatabase, rows: CragPosition[]): Promise<{ updated: number; kept: number; unmatched: CragPosition[] }> {
  const t = now();
  const crags = await db.getAllAsync<{ id: string; name: string; pos_source: PosSource; import_key: string | null }>(
    'SELECT id, name, pos_source, import_key FROM crag WHERE deleted_at IS NULL');
  const byId = new Set(crags.map((c) => c.id));
  const byKey = new Map(crags.filter((c) => c.import_key).map((c) => [c.import_key!, c.id]));
  const own = new Set(crags.filter((c) => c.pos_source === 'user').map((c) => c.id));
  let updated = 0;
  let kept = 0;
  const unmatched: CragPosition[] = [];
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      let id: string | null = !r.key ? null : byId.has(`imp:crag:${r.key}`) ? `imp:crag:${r.key}` : byKey.get(r.key) ?? null;
      if (!id) {
        const same = crags.filter((c) => sameName(c.name, r.name));
        id = same.length === 1 ? same[0].id : null;
      }
      if (!id) { unmatched.push(r); continue; }
      if (own.has(id)) { kept++; continue; }
      await db.runAsync('UPDATE crag SET lat = ?, lng = ?, pos_source = ?, updated_at = ? WHERE id = ?', [r.lat, r.lng, r.approx ? 'approx' : 'file', t, id]);
      updated++;
    }
  });
  return { updated, kept, unmatched };
}

export type CragDetail = {
  id: string; name: string; description: string; approach: string; region: string | null; region_id: string | null; source: string;
  lat: number | null; lng: number | null; pos_source: PosSource;
};

export async function getCrag(db: SQLiteDatabase, id: string): Promise<CragDetail | null> {
  return db.getFirstAsync<CragDetail>(
    `SELECT c.id, c.name, c.description, c.approach, c.source, c.lat, c.lng, c.pos_source, g.name AS region, g.id AS region_id
     FROM crag c LEFT JOIN region g ON g.id = c.region_id AND g.deleted_at IS NULL WHERE c.id = ? AND c.deleted_at IS NULL`,
    [id],
  );
}

/** What a delete would take with it, shown in the confirmation. */
export type Usage = { sectors: number; routes: number; ascents: number };

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
  await db.withTransactionAsync(async () => {
    await recordChange(db, 'route_delete', null, await routeSnapshot(db, id));
    await deleteRoutesWhere(db, 'r.id = ?', id, t);
  });
}

export async function deleteSector(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.withTransactionAsync(async () => {
    await recordChange(db, 'sector_delete', null, await sectorSnapshot(db, id));
    await deleteRoutesWhere(db, 's.id = ?', id, t);
    await db.runAsync('UPDATE sector SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, id]);
  });
}

export async function deleteCrag(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.withTransactionAsync(async () => {
    await recordChange(db, 'crag_delete', null, await cragSnapshot(db, id));
    await deleteRoutesWhere(db, 's.crag_id = ?', id, t);
    await db.runAsync('UPDATE sector SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL AND crag_id = ?', [t, t, id]);
    await db.runAsync('UPDATE crag SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, id]);
  });
}

export type CragInput = { name: string; areas: AreaNames; description: string; approach: string; sectorNames?: string[] };

/** Creates a crag (no id) or updates one; region, area and group are found or created by name. Returns the crag id. */
export async function saveCrag(db: SQLiteDatabase, id: string | null, c: CragInput): Promise<string> {
  const t = now();
  const cragId = id ?? newId();
  await db.withTransactionAsync(async () => {
    const before = id ? await cragSnapshot(db, id) : null;
    const regionId = await areaIdFor(db, c.areas, t);
    if (id) {
      await db.runAsync('UPDATE crag SET name = ?, region_id = ?, description = ?, approach = ?, updated_at = ? WHERE id = ?',
        [c.name, regionId, c.description, c.approach, t, id]);
    } else {
      await db.runAsync('INSERT INTO crag (id, region_id, name, description, approach, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
        [cragId, regionId, c.name, c.description, c.approach, t, t]);
    }
    for (const s of c.sectorNames ?? []) await sectorIdFor(db, cragId, s, t);
    await recordChange(db, id ? 'crag_edit' : 'crag_new', before, await cragSnapshot(db, cragId));
  });
  return cragId;
}

export type SectorRow = { id: string; name: string; source: string };

/** All sectors of a crag, also those without routes yet. */
export async function listSectors(db: SQLiteDatabase, cragId: string): Promise<SectorRow[]> {
  return db.getAllAsync<SectorRow>('SELECT id, name, source FROM sector WHERE crag_id = ? AND deleted_at IS NULL ORDER BY name', [cragId]);
}

/** Adds a sector to a crag; returns the existing one when the name already exists (ignoring case and Polish letters). */
export async function addSector(db: SQLiteDatabase, cragId: string, name: string): Promise<string> {
  const t = now();
  let id = '';
  await db.withTransactionAsync(async () => {
    const existed = await findByName(db, 'SELECT id, name FROM sector WHERE crag_id = ? AND deleted_at IS NULL', [cragId], name);
    id = await sectorIdFor(db, cragId, name, t);
    if (!existed) await recordChange(db, 'sector_new', null, await sectorSnapshot(db, id));
  });
  return id;
}

export async function getSector(db: SQLiteDatabase, id: string): Promise<NamedRow | null> {
  return db.getFirstAsync<NamedRow>('SELECT id, name, source, crag_id AS parent_id FROM sector WHERE id = ? AND deleted_at IS NULL', [id]);
}

/** Renames a sector; a name another sector of the same crag already has is refused (names are how sectors are found). */
export async function renameSector(db: SQLiteDatabase, id: string, name: string): Promise<void> {
  const same = await findByName(db, 'SELECT id, name FROM sector WHERE deleted_at IS NULL AND id <> ? AND crag_id = (SELECT crag_id FROM sector WHERE id = ?)', [id, id], name);
  if (same) throw new AppError('errors.nameTaken', { name: name.trim() });
  await db.withTransactionAsync(async () => {
    const before = await sectorSnapshot(db, id);
    await db.runAsync('UPDATE sector SET name = ?, updated_at = ? WHERE id = ?', [name, now(), id]);
    await recordChange(db, 'sector_edit', before, await sectorSnapshot(db, id));
  });
}

export async function listSectorNames(db: SQLiteDatabase, cragId: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>('SELECT name FROM sector WHERE crag_id = ? AND deleted_at IS NULL ORDER BY name', [cragId]);
  return rows.map((r) => r.name);
}
