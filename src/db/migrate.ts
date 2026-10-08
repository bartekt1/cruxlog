import type { SQLiteDatabase } from 'expo-sqlite';

// Every table has a UUID-style text id and created/updated/deleted timestamps (ms),
// so a later cloud sync does not require reshaping the data.
const COMMON = `created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER`;
const CATALOG = `source TEXT NOT NULL DEFAULT 'user', status TEXT NOT NULL DEFAULT 'private', created_by TEXT`;

const MIGRATIONS: string[] = [
  `
  CREATE TABLE region (id TEXT PRIMARY KEY, name TEXT NOT NULL, country TEXT NOT NULL DEFAULT '', ${COMMON});
  CREATE TABLE crag (
    id TEXT PRIMARY KEY, region_id TEXT REFERENCES region(id), name TEXT NOT NULL, lat REAL, lng REAL,
    description TEXT NOT NULL DEFAULT '', approach TEXT NOT NULL DEFAULT '', ${CATALOG}, ${COMMON});
  CREATE TABLE sector (
    id TEXT PRIMARY KEY, crag_id TEXT NOT NULL REFERENCES crag(id), name TEXT NOT NULL, lat REAL, lng REAL,
    aspect TEXT NOT NULL DEFAULT '', ${CATALOG}, ${COMMON});
  CREATE TABLE route (
    id TEXT PRIMARY KEY, sector_id TEXT NOT NULL REFERENCES sector(id), name TEXT NOT NULL,
    type TEXT NOT NULL, grade_label TEXT NOT NULL, grade_system TEXT NOT NULL, grade_index INTEGER NOT NULL,
    length_m REAL, bolts INTEGER, author TEXT NOT NULL DEFAULT '', year INTEGER, lat REAL, lng REAL,
    description TEXT NOT NULL DEFAULT '', ${CATALOG}, ${COMMON});
  CREATE TABLE pitch (
    id TEXT PRIMARY KEY, route_id TEXT NOT NULL REFERENCES route(id), number INTEGER NOT NULL,
    grade_label TEXT NOT NULL, grade_system TEXT NOT NULL, grade_index INTEGER NOT NULL,
    length_m REAL, description TEXT NOT NULL DEFAULT '', ${COMMON});
  CREATE TABLE partner (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', profile_id TEXT, ${COMMON});
  CREATE TABLE ascent (
    id TEXT PRIMARY KEY, route_id TEXT NOT NULL REFERENCES route(id), date TEXT NOT NULL, style TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 1, rating INTEGER, felt_grade_index INTEGER, notes TEXT NOT NULL DEFAULT '',
    partner_id TEXT REFERENCES partner(id), weather TEXT NOT NULL DEFAULT '', temperature_c REAL, ${COMMON});
  CREATE TABLE ascent_pitch (
    id TEXT PRIMARY KEY, ascent_id TEXT NOT NULL REFERENCES ascent(id), pitch_id TEXT NOT NULL REFERENCES pitch(id),
    leader TEXT NOT NULL DEFAULT 'self', leader_partner_id TEXT REFERENCES partner(id),
    style TEXT NOT NULL DEFAULT 'rp', ${COMMON});
  CREATE TABLE goal (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, target INTEGER, grade_index INTEGER,
    route_id TEXT REFERENCES route(id), due TEXT, done_at INTEGER, ${COMMON});
  CREATE INDEX idx_ascent_date ON ascent(date);
  CREATE INDEX idx_route_sector ON route(sector_id);
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  for (; version < MIGRATIONS.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
