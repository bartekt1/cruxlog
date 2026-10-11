/// <reference types="node" />
// Minimal stand-in for expo-sqlite's SQLiteDatabase on top of node:sqlite, covering the
// async methods src/db uses. Lets repo, backup and migration code run against real SQLite in Jest.
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

type Params = SQLInputValue[] | undefined;

export function openTestDb(): SQLiteDatabase {
  const db = new DatabaseSync(':memory:');
  const args = (p: Params) => (p ?? []).map((v) => (v === undefined ? null : v));
  const fake = {
    execAsync: async (sql: string) => { db.exec(sql); },
    runAsync: async (sql: string, params?: Params) => {
      const r = db.prepare(sql).run(...args(params));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, params?: Params) => (db.prepare(sql).get(...args(params)) as unknown) ?? null,
    getAllAsync: async (sql: string, params?: Params) => db.prepare(sql).all(...args(params)) as unknown[],
    withTransactionAsync: async (fn: () => Promise<void>) => {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    closeAsync: async () => { db.close(); },
  };
  return fake as unknown as SQLiteDatabase;
}
