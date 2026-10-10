---
name: db-migration
description: Change the Cruxlog SQLite schema (new table, column, index) or the JSON backup format safely. Use for any edit touching src/db/migrate.ts, src/db/backup.ts or table definitions.
---

# DB migration

Users' climbing history lives only on their phone. A broken migration loses it. Follow every step.

1. **Never edit an existing entry** of `MIGRATIONS` in `src/db/migrate.ts`. Append a new string at the end. The index + 1 becomes `PRAGMA user_version`.
2. Write the migration so it runs on a database that has real data:
   - `ALTER TABLE x ADD COLUMN y ... NOT NULL` needs a `DEFAULT`.
   - Renaming or dropping a column: create a new table, `INSERT INTO new SELECT ... FROM old`, drop old, rename new. Recreate indexes.
   - New tables get the shared columns: `id TEXT PRIMARY KEY` plus `${COMMON}` (and `${CATALOG}` for catalog data).
3. **Backup**: if you added a table, add it to `TABLES` in `src/db/backup.ts` in foreign-key order. If the backup JSON changes shape (new table, renamed column, changed meaning), bump `BACKUP_VERSION` and make `importBackup` accept the older versions (old backups must still import).
4. **Queries**: update `src/db/repo.ts` row types and SQL. Keep `deleted_at IS NULL` filters (soft delete).
5. **Tests** in `__tests__/db.test.ts` (uses `node:sqlite` via `__tests__/helpers/sqlite.ts`):
   - the existing "fresh database" test checks `user_version === MIGRATIONS.length`;
   - add a test that builds a database at the previous version with sample rows, runs `migrate`, and checks the rows survived and the new column/table works;
   - if the backup changed, extend the round-trip test.
6. Run the `verify` skill.
