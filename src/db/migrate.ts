import type { SQLiteDatabase } from 'expo-sqlite';

// Every table has a UUID-style text id and created/updated/deleted timestamps (ms),
// so a later cloud sync does not require reshaping the data.
const COMMON = `created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER`;
const CATALOG = `source TEXT NOT NULL DEFAULT 'user', status TEXT NOT NULL DEFAULT 'private', created_by TEXT`;

/** Soft-deletes boulder routes and their ascents; also run after restoring an older backup. Used by migration 4, so do not change it. */
export const HIDE_BOULDERS = `
  UPDATE ascent SET deleted_at = CAST(strftime('%s','now') AS INTEGER) * 1000, updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
    WHERE deleted_at IS NULL AND route_id IN (SELECT id FROM route WHERE type = 'boulder');
  UPDATE route SET deleted_at = CAST(strftime('%s','now') AS INTEGER) * 1000, updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
    WHERE deleted_at IS NULL AND type = 'boulder';
`;

// Append only. Never edit an entry that has shipped.
export const MIGRATIONS: string[] = [
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
  // 2: regions remember where they came from, so only the user's own can be edited. Until now only CSV import created regions.
  `
  ALTER TABLE region ADD COLUMN source TEXT NOT NULL DEFAULT 'user';
  UPDATE region SET source = 'import';
  CREATE INDEX idx_sector_crag ON sector(crag_id);
  `,
  // 3: areas nest: region → area ("rejon") → group. Existing regions stay top-level regions.
  `
  ALTER TABLE region ADD COLUMN parent_id TEXT REFERENCES region(id);
  ALTER TABLE region ADD COLUMN level TEXT NOT NULL DEFAULT 'region';
  CREATE INDEX idx_region_parent ON region(parent_id);
  `,
  // 4: the app has no boulders any more; old boulder routes and their ascents are hidden (soft-deleted, not erased).
  `
  ${HIDE_BOULDERS}
  `,
  // 5: where a crag's position came from: 'user' (set on the phone, never overwritten by a file), 'file' (an import)
  // or 'approx' (estimated from nearby crags of the same group); '' when it has none. Earlier positions count as the user's.
  `
  ALTER TABLE crag ADD COLUMN pos_source TEXT NOT NULL DEFAULT '';
  UPDATE crag SET pos_source = 'user' WHERE lat IS NOT NULL AND lng IS NOT NULL;
  `,
  // 6: photos. owner_type says what the photo belongs to ('ascent' now; crag and sector come later), owner_id is that row's id.
  // The picture itself is a file named after the photo id in the app's own folder; width, height and bytes describe that file.
  `
  CREATE TABLE photo (
    id TEXT PRIMARY KEY, owner_type TEXT NOT NULL, owner_id TEXT NOT NULL,
    width INTEGER NOT NULL, height INTEGER NOT NULL, bytes INTEGER NOT NULL, position INTEGER NOT NULL DEFAULT 0, ${COMMON});
  CREATE INDEX idx_photo_owner ON photo(owner_type, owner_id);
  `,
  // 7: topo lines: one route drawn on one wall or crag photo. points is JSON [[x,y],…] relative to the photo (0..1);
  // mode 'bolts' = start, bolts, anchor (drawn as a smooth curve), 'free' = drawn by finger.
  `
  CREATE TABLE topo_line (
    id TEXT PRIMARY KEY, photo_id TEXT NOT NULL, route_id TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'bolts', points TEXT NOT NULL, ${COMMON});
  CREATE INDEX idx_topo_photo ON topo_line(photo_id);
  CREATE INDEX idx_topo_route ON topo_line(route_id);
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
