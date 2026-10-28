import type { SQLiteDatabase } from 'expo-sqlite';
import { pathNames, type Area } from '../domain/areas';
import { cragRow, describeChanges, routeRow, type CragFacts, type OutboxEntry, type ProposalKind, type ProposalRow } from '../domain/proposals';
import { newId, now } from './ids';

// The user's changes to crags, sectors and routes, kept until they are sent to the shared working sheet (src/ui/proposals.ts).
// The functions that change crags, sectors and routes take a snapshot before and record the change after, in their transaction.

async function cragFacts(db: SQLiteDatabase, id: string): Promise<CragFacts | null> {
  const c = await db.getFirstAsync<{ region_id: string | null; name: string; lat: number | null; lng: number | null; pos_source: string; description: string; approach: string; import_key: string | null }>(
    'SELECT region_id, name, lat, lng, pos_source, description, approach, import_key FROM crag WHERE id = ?', [id]);
  if (!c) return null;
  const areas = await db.getAllAsync<Area>('SELECT id, name, level, parent_id FROM region WHERE deleted_at IS NULL');
  return { ...pathNames(areas, c.region_id), name: c.name, lat: c.lat, lng: c.lng, approx: c.pos_source === 'approx', description: c.description, approach: c.approach, key: c.import_key };
}

/** A thing the user changed: the app's id of it and of its crag, and its row in template columns. */
export type Snapshot = { id: string; cragId: string; row: ProposalRow };

/** A crag as template columns, or null when there is none. */
export async function cragSnapshot(db: SQLiteDatabase, id: string): Promise<Snapshot | null> {
  const c = await cragFacts(db, id);
  return c ? { id, cragId: id, row: cragRow(c) } : null;
}

/** A sector as its crag's columns plus Sektor. */
export async function sectorSnapshot(db: SQLiteDatabase, id: string): Promise<Snapshot | null> {
  const s = await db.getFirstAsync<{ crag_id: string; name: string }>('SELECT crag_id, name FROM sector WHERE id = ?', [id]);
  const c = s ? await cragSnapshot(db, s.crag_id) : null;
  return c && s ? { id, cragId: s.crag_id, row: { ...c.row, Sektor: s.name } } : null;
}

/** A route with its crag, as template columns. */
export async function routeSnapshot(db: SQLiteDatabase, id: string): Promise<Snapshot | null> {
  const r = await db.getFirstAsync<{ crag_id: string; sector: string; name: string; type: string; grade_label: string; grade_system: string; length_m: number | null; bolts: number | null; author: string; year: number | null; description: string; import_key: string | null }>(
    `SELECT s.crag_id, s.name AS sector, r.name, r.type, r.grade_label, r.grade_system, r.length_m, r.bolts, r.author, r.year, r.description, r.import_key
     FROM route r JOIN sector s ON s.id = r.sector_id WHERE r.id = ?`, [id]);
  const c = r ? await cragFacts(db, r.crag_id) : null;
  if (!r || !c) return null;
  return {
    id, cragId: r.crag_id,
    row: routeRow(c, {
      sector: r.sector, name: r.name, type: r.type, gradeLabel: r.grade_label, gradeSystem: r.grade_system, lengthM: r.length_m, bolts: r.bolts,
      author: r.author, year: r.year, description: r.description, key: r.import_key,
    }),
  };
}

/**
 * Records a change: `after` is the thing now. An edit that changed nothing is not recorded.
 * Call it inside the transaction that made the change.
 */
export async function recordChange(db: SQLiteDatabase, kind: ProposalKind, before: Snapshot | null, after: Snapshot | null): Promise<void> {
  if (!after) return;
  const edit = kind.endsWith('_edit') || kind === 'crag_position';
  const changes = edit ? describeChanges(before?.row ?? null, after.row) : '';
  if (edit && !changes) return;
  await db.runAsync('INSERT INTO outbox (id, created_at, kind, row, changes, entity_id, crag_id) VALUES (?,?,?,?,?,?,?)',
    [newId(), now(), kind, JSON.stringify(after.row), changes, after.id, after.cragId]);
}

const NEW_KIND = { crag: 'crag_new', sector: 'sector_new', route: 'route_new' } as const;

/**
 * Records that a crag, sector or route (as it was, `before`) is being deleted. Its changes not sent yet are dropped (for a crag
 * also those of its sectors and routes); when its addition was among them, the sheet never heard of it and nothing is sent.
 */
export async function recordDeletion(db: SQLiteDatabase, what: 'crag' | 'sector' | 'route', before: Snapshot | null): Promise<void> {
  if (!before) return;
  const filter = what === 'crag' ? 'crag_id = ?' : 'entity_id = ?';
  const unsentNew = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM outbox WHERE ${filter} AND kind = ?`, [before.id, NEW_KIND[what]]);
  const inside = what === 'sector'
    ? ` OR entity_id IN (SELECT r.id FROM route r WHERE r.sector_id = ?)`
    : '';
  await db.runAsync(`DELETE FROM outbox WHERE ${filter}${inside}`, what === 'sector' ? [before.id, before.id] : [before.id]);
  if (!unsentNew?.n) await recordChange(db, `${what}_delete`, null, before);
}

/** The oldest changes waiting to be sent. */
export async function listOutbox(db: SQLiteDatabase, limit = 200): Promise<OutboxEntry[]> {
  const rows = await db.getAllAsync<{ id: string; created_at: number; kind: ProposalKind; row: string; changes: string; entity_id: string | null; crag_id: string | null }>(
    'SELECT id, created_at, kind, row, changes, entity_id, crag_id FROM outbox ORDER BY created_at, rowid LIMIT ?', [limit]);
  return rows.map((r) => ({ id: r.id, created_at: r.created_at, kind: r.kind, row: JSON.parse(r.row) as ProposalRow, changes: r.changes, entityId: r.entity_id ?? '', cragId: r.crag_id ?? '' }));
}

export async function countOutbox(db: SQLiteDatabase): Promise<number> {
  return (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM outbox'))?.n ?? 0;
}

/** Forgets changes once the sheet has them. */
export async function deleteOutbox(db: SQLiteDatabase, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await db.runAsync(`DELETE FROM outbox WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
}
