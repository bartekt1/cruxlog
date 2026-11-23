import type { SQLiteDatabase } from 'expo-sqlite';
import { HIDE_BOULDERS } from './migrate';
import { AppError } from '../domain/errors';

// Backup versions; every older one still imports:
// 1 the first; 2 region.source (version 1 regions came from CSV); 3 region.parent_id and level (older ones import as
// top-level regions); 4 crag.pos_source; 5 the photo table (older backups have no photos); 6 the topo_line table;
// 7 import_key on crag, sector and route (older backups have none; the next import matches those rows by name);
// 8 the trip, trip_crag and trip_route tables (older backups have no trips); 9 the pack table and crag.pack_id;
// 10 the checklist_item table (older backups have no checklist).
export const BACKUP_VERSION = 10;
const TABLES = ['region', 'crag', 'sector', 'route', 'pitch', 'partner', 'ascent', 'ascent_pitch', 'goal', 'photo', 'topo_line', 'trip', 'trip_crag', 'trip_route', 'pack', 'checklist_item'] as const;

/** When anything in the backed-up tables last changed (also deletions); null for an empty database. */
export async function latestChange(db: SQLiteDatabase): Promise<number | null> {
  const parts = TABLES.map((t) => `SELECT MAX(updated_at) AS m FROM ${t}`).join(' UNION ALL ');
  const row = await db.getFirstAsync<{ m: number | null }>(`SELECT MAX(m) AS m FROM (${parts})`);
  return row?.m ?? null;
}

export type Backup = { app: 'cruxlog'; version: number; exportedAt: number; tables: Record<string, Record<string, unknown>[]> };

export async function exportBackup(db: SQLiteDatabase): Promise<Backup> {
  const tables: Backup['tables'] = {};
  for (const t of TABLES) tables[t] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${t}`);
  return { app: 'cruxlog', version: BACKUP_VERSION, exportedAt: Date.now(), tables };
}

/** Rows written per INSERT: few enough to stay well under SQLite's limit of bound values. */
const MAX_VALUES = 900;

/**
 * Merges a backup into the database. Rows are matched by id and the newer updated_at wins.
 * Each table's existing ids are read at once and rows are written several per statement: on a phone every query costs a
 * few milliseconds, and a backup holds thousands of rows (packs included). `onProgress` hears rows handled out of all.
 */
export async function importBackup(db: SQLiteDatabase, data: unknown, onProgress?: (done: number, total: number) => void): Promise<number> {
  const b = data as Backup;
  if (!b || b.app !== 'cruxlog' || typeof b.version !== 'number' || !b.tables) throw new AppError('settings.notBackup');
  if (b.version > BACKUP_VERSION) throw new AppError('errors.newerBackup');
  const total = TABLES.reduce((n, t) => n + (Array.isArray(b.tables[t]) ? b.tables[t].length : 0), 0);
  let done = 0;
  let merged = 0;
  onProgress?.(0, total);
  await db.withTransactionAsync(async () => {
    await db.execAsync('PRAGMA defer_foreign_keys = ON');
    for (const t of TABLES) {
      const rows = Array.isArray(b.tables[t]) ? b.tables[t] : [];
      if (!rows.length) continue;
      // Only columns this table has: a hand-edited or odd file must not stop the whole restore.
      const known = new Set((await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name));
      const have = new Map((await db.getAllAsync<{ id: string; updated_at: number }>(`SELECT id, updated_at FROM ${t}`)).map((r) => [r.id, r.updated_at]));
      // Rows to write, grouped by their columns (normally one group per table).
      const groups = new Map<string, { cols: string[]; rows: Record<string, unknown>[] }>();
      for (const original of rows) {
        const row = t === 'region' && b.version < 2 && !('source' in original) ? { ...original, source: 'import' } : original;
        const cols = Object.keys(row).filter((c) => known.has(c));
        if (!cols.includes('id') || !cols.includes('updated_at')) continue;
        const existing = have.get(row.id as string);
        if (existing != null && existing >= (row.updated_at as number)) continue;
        have.set(row.id as string, row.updated_at as number); // a repeated id in the file: the newer one wins, as before
        const key = cols.join(',');
        const group = groups.get(key) ?? groups.set(key, { cols, rows: [] }).get(key)!;
        group.rows.push(row);
      }
      for (const { cols, rows: todo } of groups.values()) {
        const names = cols.map((c) => `"${c}"`).join(',');
        const one = `(${cols.map(() => '?').join(',')})`;
        const per = Math.max(1, Math.floor(MAX_VALUES / cols.length));
        for (let i = 0; i < todo.length; i += per) {
          const chunk = todo.slice(i, i + per);
          await db.runAsync(`INSERT OR REPLACE INTO ${t} (${names}) VALUES ${chunk.map(() => one).join(',')}`,
            chunk.flatMap((row) => cols.map((c) => row[c] as string | number | null)));
          merged += chunk.length;
        }
      }
      done += rows.length;
      onProgress?.(done, total);
    }
    await db.execAsync(HIDE_BOULDERS); // a backup from before boulders were removed may bring some back
  });
  return merged;
}
