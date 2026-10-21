// Pieces shared by the query modules below; screens import from ./repo.
import type { SQLiteDatabase } from 'expo-sqlite';
import { type GradeSystem, type RouteType } from '../domain/grades';
import { sameName } from '../domain/text';
import { newId } from './ids';

export type RouteRow = {
  id: string; name: string; type: RouteType; grade_label: string; grade_system: GradeSystem; grade_index: number;
  sector_id: string; sector_name: string; sector_source: string; crag_id: string; crag_name: string;
  /** 'user' for routes the user created; imported ones are edited through the CSV file. */
  source: string;
  length_m: number | null; bolts: number | null;
};

export const ROUTE_COLS = `r.id, r.name, r.type, r.grade_label, r.grade_system, r.grade_index, r.source, r.length_m, r.bolts,
  s.id AS sector_id, s.name AS sector_name, s.source AS sector_source, c.id AS crag_id, c.name AS crag_name`;


/** Finds an existing row whose name matches ignoring case and Polish letters. */
export async function findByName(db: SQLiteDatabase, sql: string, params: string[], name: string): Promise<{ id: string } | null> {
  const rows = await db.getAllAsync<{ id: string; name: string }>(sql, params);
  return rows.find((r) => sameName(r.name, name)) ?? null;
}

/** Where a crag's position came from; see migration 5. */
export type PosSource = '' | 'user' | 'file' | 'approx';

export const count = async (db: SQLiteDatabase, sql: string, params: string[]) => (await db.getFirstAsync<{ n: number }>(sql, params))?.n ?? 0;

export async function sectorIdFor(db: SQLiteDatabase, cragId: string, name: string, t: number): Promise<string> {
  const ex = await findByName(db, 'SELECT id, name FROM sector WHERE crag_id = ? AND deleted_at IS NULL', [cragId], name);
  if (ex) return ex.id;
  const id = newId();
  await db.runAsync('INSERT INTO sector (id, crag_id, name, created_at, updated_at) VALUES (?,?,?,?,?)', [id, cragId, name, t, t]);
  return id;
}

export type NamedRow = { id: string; name: string; source: string; parent_id: string | null };
