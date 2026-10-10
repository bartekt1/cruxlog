/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import { BACKUP_VERSION, exportBackup, importBackup } from '../src/db/backup';
import { MIGRATIONS, migrate } from '../src/db/migrate';
import { addAscent, addGoal, addUserRoute, applyImport, listAscents, listCrags, listGoals, searchRoutes, type NewRoute } from '../src/db/repo';
import { buildImportPlan } from '../src/domain/csvImport';
import { parseGrade } from '../src/domain/grades';
import { openTestDb } from './helpers/sqlite';

async function freshDb(): Promise<SQLiteDatabase> {
  const db = openTestDb();
  await migrate(db);
  return db;
}

const route = (over: Partial<NewRoute> = {}): NewRoute => ({
  cragName: 'Test Crag', sectorName: 'Main', name: 'Test Route 1', type: 'sport',
  gradeLabel: 'VI.3', gradeSystem: 'kr', gradeIndex: parseGrade('VI.3', 'kr', 'sport')!, ...over,
});

const ascent = (routeId: string, over: Partial<Parameters<typeof addAscent>[1]> = {}) => ({
  routeId, date: '2026-10-10', style: 'rp' as const, attempts: 2, rating: 4, notes: '', partnerName: 'Anna', weather: '', ...over,
});

const count = async (db: SQLiteDatabase, table: string) => (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))!.n;

const samples = () => {
  const read = (f: string) => readFileSync(join(__dirname, '..', 'samples', f), 'utf8');
  return buildImportPlan({ crags: read('crags.csv'), sectors: read('sectors.csv'), routes: read('routes.csv'), pitches: read('pitches.csv') });
};

describe('migrate', () => {
  it('creates the schema on a fresh database and records the version', async () => {
    const db = await freshDb();
    const v = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(v?.user_version).toBe(MIGRATIONS.length);
    const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    expect(tables.map((t) => t.name)).toEqual(expect.arrayContaining(['ascent', 'crag', 'goal', 'partner', 'pitch', 'route', 'sector']));
  });
  it('is a no-op when run again and keeps data', async () => {
    const db = await freshDb();
    await addGoal(db, 'project', 'Keep me', null);
    await migrate(db);
    expect(await count(db, 'goal')).toBe(1);
  });
});

describe('repo', () => {
  it('reuses crag, sector and partner by name', async () => {
    const db = await freshDb();
    const r1 = await addUserRoute(db, route());
    const r2 = await addUserRoute(db, route({ name: 'Test Route 2' }));
    await addAscent(db, ascent(r1));
    await addAscent(db, ascent(r2, { partnerName: ' Anna ' }));
    expect(await count(db, 'crag')).toBe(1);
    expect(await count(db, 'sector')).toBe(1);
    expect(await count(db, 'partner')).toBe(1);
  });
  it('lists ascents newest first with route and crag details', async () => {
    const db = await freshDb();
    const r = await addUserRoute(db, route());
    await addAscent(db, ascent(r, { date: '2026-09-01' }));
    await addAscent(db, ascent(r, { date: '2026-10-01', style: 'attempt', partnerName: '' }));
    const rows = await listAscents(db);
    expect(rows.map((a) => a.date)).toEqual(['2026-10-01', '2026-09-01']);
    expect(rows[0]).toMatchObject({ route_name: 'Test Route 1', crag_name: 'Test Crag', style: 'attempt', partner_name: null });
    expect(rows[1]).toMatchObject({ partner_name: 'Anna', attempts: 2, rating: 4 });
  });
  it('rolls back the ascent and its new partner when the insert fails', async () => {
    const db = await freshDb();
    await expect(addAscent(db, ascent('missing-route'))).rejects.toThrow();
    expect(await count(db, 'ascent')).toBe(0);
    expect(await count(db, 'partner')).toBe(0);
  });
  it('searches by route, sector and crag name and hides deleted routes', async () => {
    const db = await freshDb();
    const r = await addUserRoute(db, route());
    await addUserRoute(db, route({ cragName: 'Other', sectorName: 'Wall', name: 'Zebra' }));
    expect((await searchRoutes(db, 'route 1')).map((x) => x.name)).toEqual(['Test Route 1']);
    expect((await searchRoutes(db, 'other')).map((x) => x.name)).toEqual(['Zebra']);
    expect((await searchRoutes(db, 'wall')).map((x) => x.name)).toEqual(['Zebra']);
    await db.runAsync('UPDATE route SET deleted_at = 1 WHERE id = ?', [r]);
    expect((await searchRoutes(db, 'test')).map((x) => x.name)).toEqual([]);
  });
  it('counts routes per crag', async () => {
    const db = await freshDb();
    await addUserRoute(db, route());
    await addUserRoute(db, route({ name: 'Test Route 2' }));
    expect(await listCrags(db)).toEqual([expect.objectContaining({ name: 'Test Crag', routes: 2 })]);
  });
  it('stores goals', async () => {
    const db = await freshDb();
    await addGoal(db, 'count', '200 sends', 200);
    expect(await listGoals(db)).toEqual([expect.objectContaining({ kind: 'count', title: '200 sends', target: 200 })]);
  });
  it('imports the sample CSV files idempotently', async () => {
    const db = await freshDb();
    const plan = samples();
    expect(plan.errors).toEqual([]);
    const first = await applyImport(db, plan);
    await applyImport(db, plan);
    expect(await count(db, 'crag')).toBe(first.crags);
    expect(await count(db, 'route')).toBe(first.routes);
    expect(await count(db, 'pitch')).toBe(first.pitches);
  });
});

describe('backup', () => {
  async function seeded() {
    const db = await freshDb();
    await applyImport(db, samples());
    const r = await addUserRoute(db, route());
    await addAscent(db, ascent(r));
    await addGoal(db, 'project', 'Project', null);
    return db;
  }

  it('restores everything into an empty database', async () => {
    const source = await seeded();
    const backup = JSON.parse(JSON.stringify(await exportBackup(source)));
    expect(backup.version).toBe(BACKUP_VERSION);
    const target = await freshDb();
    const merged = await importBackup(target, backup);
    expect(merged).toBeGreaterThan(0);
    expect(await listAscents(target)).toEqual(await listAscents(source));
    expect(await listCrags(target)).toEqual(await listCrags(source));
    expect(await listGoals(target)).toEqual(await listGoals(source));
  });
  it('does not duplicate when imported twice and keeps newer local edits', async () => {
    const db = await seeded();
    const backup = await exportBackup(db);
    await db.runAsync("UPDATE goal SET title = 'Edited', updated_at = updated_at + 1000");
    expect(await importBackup(db, backup)).toBe(0);
    expect((await listGoals(db))[0].title).toBe('Edited');
  });
  it('rejects files that are not a backup or come from a newer version', async () => {
    const db = await freshDb();
    await expect(importBackup(db, { hello: 'world' })).rejects.toThrow();
    await expect(importBackup(db, null)).rejects.toThrow();
    await expect(importBackup(db, { app: 'cruxlog', version: BACKUP_VERSION + 1, exportedAt: 0, tables: {} })).rejects.toThrow();
  });
});
