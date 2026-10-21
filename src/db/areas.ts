import type { SQLiteDatabase } from 'expo-sqlite';
import { areaChain, childLevel, levelAt, type Area, type AreaLevel, type AreaNames } from '../domain/areas';
import { fold } from '../domain/text';
import { newId, now } from './ids';
import { findByName, type NamedRow } from './shared';

export type { AreaNames };

async function childAreaId(db: SQLiteDatabase, parentId: string | null, level: AreaLevel, name: string, t: number, source: string): Promise<string> {
  const ex = await findByName(db, 'SELECT id, name FROM region WHERE deleted_at IS NULL AND level = ? AND parent_id IS ?', [level, parentId as string], name);
  if (ex) return ex.id;
  const id = newId();
  await db.runAsync('INSERT INTO region (id, name, parent_id, level, source, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [id, name.trim(), parentId, level, source, t, t]);
  return id;
}


/**
 * Finds or creates the chain region → area → groups and returns the deepest id (null without a region).
 * Names match ignoring case and Polish letters; a missing area stops the chain at the region.
 * `memo` remembers ids of chains already resolved, which keeps big imports fast.
 */
export async function areaIdFor(db: SQLiteDatabase, names: AreaNames, t: number, source = 'user', memo?: Map<string, string>): Promise<string | null> {
  let id: string | null = null;
  const chain = areaChain(names);
  for (let depth = 0; depth < chain.length; depth++) {
    const key = JSON.stringify(chain.slice(0, depth + 1).map(fold));
    const known = memo?.get(key);
    id = known ?? await childAreaId(db, id, levelAt(depth), chain[depth], t, source);
    memo?.set(key, id);
  }
  return id;
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
  for (const a of areas) {
    const want = levelAt(depth(a));
    if (a.level !== want) await db.runAsync('UPDATE region SET level = ?, updated_at = ? WHERE id = ?', [want, t, a.id]);
  }
}
