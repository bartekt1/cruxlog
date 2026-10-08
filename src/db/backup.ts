import type { SQLiteDatabase } from 'expo-sqlite';

export const BACKUP_VERSION = 1;
const TABLES = ['region', 'crag', 'sector', 'route', 'pitch', 'partner', 'ascent', 'ascent_pitch', 'goal'] as const;

export type Backup = { app: 'cruxlog'; version: number; exportedAt: number; tables: Record<string, Record<string, unknown>[]> };

export async function exportBackup(db: SQLiteDatabase): Promise<Backup> {
  const tables: Backup['tables'] = {};
  for (const t of TABLES) tables[t] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${t}`);
  return { app: 'cruxlog', version: BACKUP_VERSION, exportedAt: Date.now(), tables };
}

/** Merges a backup into the database. Rows are matched by id and the newer updated_at wins. */
export async function importBackup(db: SQLiteDatabase, data: unknown): Promise<number> {
  const b = data as Backup;
  if (!b || b.app !== 'cruxlog' || typeof b.version !== 'number' || !b.tables) throw new Error('Not a Cruxlog backup');
  if (b.version > BACKUP_VERSION) throw new Error('Backup comes from a newer app version');
  let merged = 0;
  await db.withTransactionAsync(async () => {
    await db.execAsync('PRAGMA defer_foreign_keys = ON');
    for (const t of TABLES) {
      for (const row of b.tables[t] ?? []) {
        const cols = Object.keys(row);
        if (!cols.includes('id') || !cols.includes('updated_at')) continue;
        const existing = await db.getFirstAsync<{ updated_at: number }>(`SELECT updated_at FROM ${t} WHERE id = ?`, [row.id as string]);
        if (existing && existing.updated_at >= (row.updated_at as number)) continue;
        const names = cols.map((c) => `"${c.replace(/"/g, '')}"`).join(',');
        const marks = cols.map(() => '?').join(',');
        await db.runAsync(`INSERT OR REPLACE INTO ${t} (${names}) VALUES (${marks})`, cols.map((c) => row[c] as string | number | null));
        merged++;
      }
    }
  });
  return merged;
}
