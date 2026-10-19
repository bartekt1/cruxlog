/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import { BACKUP_VERSION, exportBackup, importBackup } from '../src/db/backup';
import { MIGRATIONS, migrate } from '../src/db/migrate';
import {
  addAscent, addGoal, addUserRoute, applyImport, cragUsage, deleteAscent, deleteCrag, deleteGoal, deleteArea, deleteRoute, deleteSector,
  getAscent, getCrag, getArea, getRoute, getSector, listAscents, listCragRoutes, listCrags, listGoals, listAreas, listSectorNames, addArea, areaIdFor,
  renameArea, renameSector, routeUsage, saveCrag, searchRoutes, sectorUsage, setGoalDone, updateAscent, updateRoute, type NewRoute, type RouteFilter,
  listCragChoices, listPartners, applyCragPositions, setCragLocation, listRouteAscents, recentRoutes, listSectors, addSector, createRoute, importedUsage, removeImported, findRoutes, getGoal, updateGoal, routeGoals,
} from '../src/db/repo';
import { descendantIds } from '../src/domain/areas';
import { buildImportPlan } from '../src/domain/csvImport';
import { detectFormat, parseFlatCsv, parsePositionsCsv, planFromFlatRows, type FlatRow } from '../src/domain/flatImport';
import { parseGrade } from '../src/domain/grades';
import { openTestDb } from './helpers/sqlite';

async function freshDb(): Promise<SQLiteDatabase> {
  const db = openTestDb();
  await migrate(db);
  return db;
}

const A = (region: string, area = '', group = '') => ({ region, area, group });

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
    await addGoal(db, { kind: 'project', title: 'Keep me', target: null, gradeIndex: null, routeId: null });
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
    await addGoal(db, { kind: 'count', title: '200 sends', target: 200, gradeIndex: null, routeId: null });
    expect(await listGoals(db)).toEqual([expect.objectContaining({ kind: 'count', title: '200 sends', target: 200 })]);
  });
  it('reads, edits and soft-deletes an ascent', async () => {
    const db = await freshDb();
    const r1 = await addUserRoute(db, route());
    const r2 = await addUserRoute(db, route({ name: 'Test Route 2' }));
    const id = await addAscent(db, ascent(r1, { weather: 'sunny' }));
    expect(await getAscent(db, id)).toMatchObject({ id, route_name: 'Test Route 1', weather: 'sunny', partner_name: 'Anna', route: { id: r1, sector_name: 'Main' } });

    await updateAscent(db, id, ascent(r2, { date: '2026-10-01', style: 'os', attempts: 1, partnerName: 'Bartek', rating: null }));
    expect(await getAscent(db, id)).toMatchObject({ route_name: 'Test Route 2', date: '2026-10-01', style: 'os', attempts: 1, rating: null, partner_name: 'Bartek' });

    const before = (await db.getFirstAsync<{ updated_at: number }>('SELECT updated_at FROM ascent WHERE id = ?', [id]))!.updated_at;
    await deleteAscent(db, id);
    expect(await getAscent(db, id)).toBeNull();
    expect(await listAscents(db)).toEqual([]);
    const row = await db.getFirstAsync<{ deleted_at: number; updated_at: number }>('SELECT deleted_at, updated_at FROM ascent WHERE id = ?', [id]);
    expect(row!.deleted_at).toBeGreaterThan(0);
    expect(row!.updated_at).toBeGreaterThanOrEqual(before);
  });
  it('shows a crag with its routes and the user\'s ascents per route', async () => {
    const db = await freshDb();
    const r1 = await addUserRoute(db, route());
    await addUserRoute(db, route({ sectorName: 'Left', name: 'Another' }));
    await addAscent(db, ascent(r1, { style: 'attempt' }));
    await addAscent(db, ascent(r1, { style: 'rp' }));
    const gone = await addAscent(db, ascent(r1, { style: 'os' }));
    await deleteAscent(db, gone);
    const [crag] = await listCrags(db);
    expect(await getCrag(db, crag.id)).toMatchObject({ name: 'Test Crag', region: null });
    const rows = await listCragRoutes(db, crag.id);
    expect(rows.map((r) => [r.sector_name, r.name, r.ascents, r.sends])).toEqual([['Left', 'Another', 0, 0], ['Main', 'Test Route 1', 2, 1]]);
    expect(await getRoute(db, r1)).toMatchObject({ name: 'Test Route 1', crag_name: 'Test Crag' });
  });
  it('completes, reopens and deletes goals; done goals go last', async () => {
    const db = await freshDb();
    await addGoal(db, { kind: 'project', title: 'First', target: null, gradeIndex: null, routeId: null });
    await addGoal(db, { kind: 'wishlist', title: 'Second', target: null, gradeIndex: null, routeId: null });
    const first = (await listGoals(db)).find((g) => g.title === 'First')!;
    await setGoalDone(db, first.id, true);
    expect((await listGoals(db)).map((g) => [g.title, g.done_at != null])).toEqual([['Second', false], ['First', true]]);
    await setGoalDone(db, first.id, false);
    expect((await listGoals(db)).find((g) => g.title === 'First')!.done_at).toBeNull();
    await deleteGoal(db, first.id);
    expect((await listGoals(db)).map((g) => g.title)).toEqual(['Second']);
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

describe('suggestions and history', () => {
  it('searches ignoring case and Polish letters', async () => {
    const db = await freshDb();
    await addUserRoute(db, route({ cragName: 'Łysa Skała', sectorName: 'Żleb', name: 'Rysa Ślimaka' }));
    for (const q of ['łysa', 'LYSA', 'zleb', 'slimak', 'rysa lysa']) {
      expect((await searchRoutes(db, q)).map((r) => r.name)).toEqual(['Rysa Ślimaka']);
    }
    expect(await searchRoutes(db, 'sokolica')).toEqual([]);
  });
  it('reuses a crag, sector and partner typed with different case or letters', async () => {
    const db = await freshDb();
    const r1 = await addUserRoute(db, route({ cragName: 'Łysa Skała', sectorName: 'Żleb' }));
    const r2 = await addUserRoute(db, route({ cragName: 'łysa skała', sectorName: 'zleb', name: 'Second' }));
    expect((await getRoute(db, r2))!.sector_id).toBe((await getRoute(db, r1))!.sector_id);
    await addAscent(db, ascent(r1, { partnerName: 'Anna' }));
    await addAscent(db, ascent(r2, { partnerName: 'anna' }));
    expect(await listPartners(db)).toEqual(['Anna']);
  });
  it('offers crags without routes too, with their route count', async () => {
    const db = await freshDb();
    await saveCrag(db, null, { name: 'Pusta Skała', areas: A('Jura'), description: '', approach: '' });
    await addUserRoute(db, route({ cragName: 'Okiennik' }));
    expect((await listCragChoices(db)).map((c) => [c.name, c.region_name, c.routes])).toEqual([['Okiennik', null, 1], ['Pusta Skała', 'Jura', 0]]);
  });
  it('gives an existing crag without a region the region typed with a route', async () => {
    const db = await freshDb();
    await addUserRoute(db, route({ cragName: 'Okiennik' }));
    await addUserRoute(db, route({ cragName: 'okiennik', areas: A('Jura'), name: 'Second' }));
    expect(await listCragChoices(db)).toEqual([expect.objectContaining({ name: 'Okiennik', region_name: 'Jura' })]);
  });
  it('gives a new crag the region typed with the route', async () => {
    const db = await freshDb();
    await addUserRoute(db, route({ cragName: 'Okiennik', areas: A('Jura') }));
    await addUserRoute(db, route({ cragName: 'Okiennik', areas: A('Tatry'), name: 'Second' }));
    expect(await listCragChoices(db)).toEqual([expect.objectContaining({ name: 'Okiennik', region_name: 'Jura' })]);
  });
  it('lists recently climbed routes and partners by how often you climb with them', async () => {
    const db = await freshDb();
    const a = await addUserRoute(db, route({ name: 'A' }));
    const b = await addUserRoute(db, route({ name: 'B' }));
    await addUserRoute(db, route({ name: 'Never climbed' }));
    await addAscent(db, ascent(a, { date: '2026-09-01', partnerName: 'Zosia' }));
    await addAscent(db, ascent(b, { date: '2026-10-01', partnerName: 'Bartek' }));
    await addAscent(db, ascent(a, { date: '2026-08-01', partnerName: 'Bartek' }));
    expect((await recentRoutes(db)).map((r) => r.name)).toEqual(['B', 'A']);
    expect(await listPartners(db)).toEqual(['Bartek', 'Zosia']);
  });
  it('lists the ascents of one route, newest first', async () => {
    const db = await freshDb();
    const a = await addUserRoute(db, route({ name: 'A' }));
    const b = await addUserRoute(db, route({ name: 'B' }));
    await addAscent(db, ascent(a, { date: '2026-08-01', style: 'attempt' }));
    await addAscent(db, ascent(a, { date: '2026-09-01', style: 'rp' }));
    await addAscent(db, ascent(b));
    expect((await listRouteAscents(db, a)).map((x) => [x.date, x.style])).toEqual([['2026-09-01', 'rp'], ['2026-08-01', 'attempt']]);
  });
});

describe('editing own crags, sectors, routes and regions', () => {
  it('marks old regions as imported when migrating from version 1', async () => {
    const db = openTestDb();
    await db.execAsync(MIGRATIONS[0] + 'PRAGMA user_version = 1;');
    await db.runAsync("INSERT INTO region (id, name, created_at, updated_at) VALUES ('g1', 'Jura', 1, 1)");
    await migrate(db);
    expect(await getArea(db, 'g1')).toMatchObject({ name: 'Jura', source: 'import', level: 'region', parent_id: null });
  });
  it('creates and edits a crag with a region found or created by name', async () => {
    const db = await freshDb();
    const id = await saveCrag(db, null, { name: 'Okiennik', areas: A('Jura'), description: 'opis', approach: '10 min' });
    await saveCrag(db, null, { name: 'Sokolica', areas: A('Jura'), description: '', approach: '' });
    expect(await listAreas(db)).toEqual([expect.objectContaining({ name: 'Jura', source: 'user', level: 'region' })]);
    await saveCrag(db, id, { name: 'Okiennik Wielki', areas: A(''), description: '', approach: '' });
    expect(await getCrag(db, id)).toMatchObject({ name: 'Okiennik Wielki', region: null, source: 'user' });
    expect((await listCrags(db)).map((c) => [c.name, c.region_name])).toEqual([['Sokolica', 'Jura'], ['Okiennik Wielki', null]]);
  });
  it('edits a route and moves it to another sector of the same crag', async () => {
    const db = await freshDb();
    const r = await addUserRoute(db, route());
    await updateRoute(db, r, { sectorName: 'Right', name: 'Renamed', type: 'multipitch', gradeLabel: '6b', gradeSystem: 'fr', gradeIndex: parseGrade('6b', 'fr')! });
    expect(await getRoute(db, r)).toMatchObject({ name: 'Renamed', type: 'multipitch', sector_name: 'Right', crag_name: 'Test Crag', source: 'user' });
    expect(await listSectorNames(db, (await getRoute(db, r))!.crag_id)).toEqual(['Main', 'Right']);
  });
  it('deletes a route with its ascents', async () => {
    const db = await freshDb();
    const r = await addUserRoute(db, route());
    await addAscent(db, ascent(r));
    expect(await routeUsage(db, r)).toEqual({ sectors: 0, routes: 1, ascents: 1 });
    await deleteRoute(db, r);
    expect(await getRoute(db, r)).toBeNull();
    expect(await listAscents(db)).toEqual([]);
    expect(await searchRoutes(db, 'Test')).toEqual([]);
  });
  it('renames and deletes a sector with its routes, leaving other sectors alone', async () => {
    const db = await freshDb();
    const r1 = await addUserRoute(db, route());
    const r2 = await addUserRoute(db, route({ sectorName: 'Left', name: 'Other' }));
    await addAscent(db, ascent(r1));
    const main = (await getRoute(db, r1))!.sector_id;
    await renameSector(db, main, 'Middle');
    expect(await getSector(db, main)).toMatchObject({ name: 'Middle', source: 'user' });
    expect(await sectorUsage(db, main)).toEqual({ sectors: 0, routes: 1, ascents: 1 });
    await deleteSector(db, main);
    expect(await getSector(db, main)).toBeNull();
    expect(await getRoute(db, r1)).toBeNull();
    expect(await getRoute(db, r2)).not.toBeNull();
    expect(await listAscents(db)).toEqual([]);
  });
  it('deletes a crag with everything in it', async () => {
    const db = await freshDb();
    const r1 = await addUserRoute(db, route());
    await addUserRoute(db, route({ sectorName: 'Left', name: 'Other' }));
    const keep = await addUserRoute(db, route({ cragName: 'Elsewhere', name: 'Stay' }));
    await addAscent(db, ascent(r1));
    await addAscent(db, ascent(keep));
    const crag = (await getRoute(db, r1))!.crag_id;
    expect(await cragUsage(db, crag)).toEqual({ sectors: 2, routes: 2, ascents: 1 });
    await deleteCrag(db, crag);
    expect(await getCrag(db, crag)).toBeNull();
    expect((await listCrags(db)).map((c) => c.name)).toEqual(['Elsewhere']);
    expect((await listAscents(db)).map((a) => a.route_name)).toEqual(['Stay']);
  });
  it('renames a top-level region and deletes it while keeping its crags', async () => {
    const db = await freshDb();
    const crag = await saveCrag(db, null, { name: 'Okiennik', areas: A('Jura'), description: '', approach: '' });
    const [region] = await listAreas(db);
    await renameArea(db, region.id, 'Jura Krakowska');
    expect((await getCrag(db, crag))!.region).toBe('Jura Krakowska');
    await deleteArea(db, region.id);
    expect(await listAreas(db)).toEqual([]);
    expect(await getCrag(db, crag)).toMatchObject({ name: 'Okiennik', region: null });
  });
  it('keeps imported data marked as imported', async () => {
    const db = await freshDb();
    await applyImport(db, samples());
    const [c] = await listCrags(db);
    expect(c).toMatchObject({ source: 'import', region_name: 'Example region' });
    expect((await listAreas(db))[0]).toMatchObject({ name: 'Example region', source: 'import', level: 'region' });
  });
});

describe('nested areas', () => {
  it('upgrades version 2 regions to top-level regions', async () => {
    const db = openTestDb();
    await db.execAsync(MIGRATIONS[0] + MIGRATIONS[1] + 'PRAGMA user_version = 2;');
    await db.runAsync("INSERT INTO region (id, name, created_at, updated_at) VALUES ('g1', 'Jura', 1, 1)");
    await migrate(db);
    expect(await getArea(db, 'g1')).toMatchObject({ level: 'region', parent_id: null });
  });
  it('finds or creates region → area → group, matching names loosely', async () => {
    const db = await freshDb();
    const g = await areaIdFor(db, A('Czarnorzeki', 'Kamieniec', 'Krowia Turnia'), 1);
    expect(await areaIdFor(db, A('czarnorzeki', 'KAMIENIEC', 'krowia turnia'), 2)).toBe(g);
    const k = await areaIdFor(db, A('Czarnorzeki', 'Kamieniec', ''), 3);
    expect(await getArea(db, g!)).toMatchObject({ level: 'group', parent_id: k });
    expect(await getArea(db, k!)).toMatchObject({ level: 'area' });
    expect(await areaIdFor(db, A('', 'X', 'Y'), 4)).toBeNull();
    expect((await listAreas(db)).map((x) => [x.name, x.level])).toEqual([['Czarnorzeki', 'region'], ['Kamieniec', 'area'], ['Krowia Turnia', 'group']]);
  });
  it('adds child areas with the right level, also groups inside groups', async () => {
    const db = await freshDb();
    const r = await addArea(db, null, 'Czarnorzeki');
    const a = await addArea(db, r, 'Strzelnica');
    const g = await addArea(db, a, 'Dolna');
    expect(await addArea(db, r, 'strzelnica')).toBe(a);
    expect((await getArea(db, g))!.level).toBe('group');
    const deeper = await addArea(db, g, 'Zimny Dół');
    expect(await getArea(db, deeper)).toMatchObject({ level: 'group', parent_id: g });
  });
  it('follows several group levels written in one field', async () => {
    const db = await freshDb();
    const id = await areaIdFor(db, A('Jura', 'Jura Południowa', 'Dolina Sanki › Zimny Dół'), 1);
    expect(await areaIdFor(db, A('jura', 'jura poludniowa', 'dolina sanki ›zimny dol'), 2)).toBe(id);
    expect((await listAreas(db)).map((x) => [x.name, x.level])).toEqual(
      [['Dolina Sanki', 'group'], ['Jura', 'region'], ['Jura Południowa', 'area'], ['Zimny Dół', 'group']]);
  });
  it('deleting an area moves its crags and sub-areas up a level', async () => {
    const db = await freshDb();
    const crag = await saveCrag(db, null, { name: 'Krowia', areas: A('Czarnorzeki', 'Kamieniec', 'Krowia Turnia'), description: '', approach: '' });
    const other = await saveCrag(db, null, { name: 'Bąbel', areas: A('Czarnorzeki', 'Kamieniec'), description: '', approach: '' });
    const kamieniec = (await getCrag(db, other))!.region_id!;
    await deleteArea(db, kamieniec);
    const areas = await listAreas(db);
    expect(areas.map((x) => [x.name, x.level])).toEqual([['Czarnorzeki', 'region'], ['Krowia Turnia', 'area']]);
    expect((await getCrag(db, other))!.region).toBe('Czarnorzeki');
    expect((await getCrag(db, crag))!.region).toBe('Krowia Turnia');
    await deleteArea(db, areas[0].id);
    expect((await listAreas(db)).map((x) => [x.name, x.level])).toEqual([['Krowia Turnia', 'region']]);
  });
  it('re-importing with a new structure moves routes, keeps ascents and removes emptied imports', async () => {
    const db = await freshDb();
    const crag = (key: string, name: string, region: string, area = '', group = '') =>
      ({ key, name, region, area, group, country: 'PL', lat: null, lng: null, description: '', approach: '' });
    const r = (key: string, sectorKey: string) => ({ key, sectorKey, name: key, type: 'sport' as const, gradeLabel: 'VI', gradeSystem: 'kr' as const,
      gradeIndex: parseGrade('VI', 'kr', 'sport')!, lengthM: null, bolts: null, author: '', year: null, lat: null, lng: null, description: '' });
    const sec = (key: string, cragKey: string, name: string) => ({ key, cragKey, name, lat: null, lng: null, aspect: '' });
    // Old layout: wall as its own crag in a flat region.
    await applyImport(db, { crags: [crag('k-krowia', 'Krowia', 'Kamieniec'), crag('k-krowia-w', 'Krowia (ściana zachodnia)', 'Kamieniec')],
      sectors: [sec('k-krowia-s', 'k-krowia', 'Krowia'), sec('k-krowia-w-s', 'k-krowia-w', 'Krowia (ściana zachodnia)')],
      routes: [r('a', 'k-krowia-s'), r('b', 'k-krowia-w-s')], pitches: [], errors: [] });
    const [b] = await searchRoutes(db, 'b');
    await addAscent(db, ascent(b.id));
    // New layout: one crag with a wall sector, nested areas.
    await applyImport(db, { crags: [crag('k-krowia', 'Krowia', 'Czarnorzeki', 'Kamieniec', 'Krowia Turnia')],
      sectors: [sec('k-krowia-s', 'k-krowia', 'Krowia'), sec('k-krowia-west', 'k-krowia', 'Ściana zachodnia')],
      routes: [r('a', 'k-krowia-s'), r('b', 'k-krowia-west')], pitches: [], errors: [] });
    expect((await listCrags(db)).map((c) => c.name)).toEqual(['Krowia']);
    expect((await getRoute(db, b.id))).toMatchObject({ crag_name: 'Krowia', sector_name: 'Ściana zachodnia' });
    expect((await listAscents(db)).map((x) => x.route_name)).toEqual(['b']);
    expect((await listAreas(db)).map((x) => [x.name, x.level])).toEqual([['Czarnorzeki', 'region'], ['Kamieniec', 'area'], ['Krowia Turnia', 'group']]);
  });
});

describe('no boulders, and the file decides which imported routes a crag has', () => {
  it('hides boulder routes and their ascents when upgrading', async () => {
    const db = openTestDb();
    await db.execAsync(MIGRATIONS.slice(0, 3).join('\n') + 'PRAGMA user_version = 3;');
    await db.execAsync(`
      INSERT INTO crag (id, name, created_at, updated_at) VALUES ('c', 'C', 1, 1);
      INSERT INTO sector (id, crag_id, name, created_at, updated_at) VALUES ('s', 'c', 'S', 1, 1);
      INSERT INTO route (id, sector_id, name, type, grade_label, grade_system, grade_index, created_at, updated_at)
        VALUES ('b', 's', 'Kamień', 'boulder', '6B', 'font', 5, 1, 1), ('r', 's', 'Rysa', 'sport', 'VI', 'kr', 4, 1, 1);
      INSERT INTO ascent (id, route_id, date, style, created_at, updated_at) VALUES ('a1', 'b', '2026-01-01', 'rp', 1, 1), ('a2', 'r', '2026-01-01', 'rp', 1, 1);`);
    await migrate(db);
    expect(await getRoute(db, 'b')).toBeNull();
    expect((await listAscents(db)).map((a) => a.route_name)).toEqual(['Rysa']);
  });
  it('removes imported routes the file no longer has, unless they have ascents or are your own', async () => {
    const db = await freshDb();
    const plan = (names: string[]) => planFromFlatRows(names.map((name) => ({
      region: 'Czarnorzeki', area: 'Kamieniec', group: '', crag: 'Krowia', sector: '', name, type: 'sport', grade: 'VI', gradeSystem: 'kr',
      cragKey: 'kamieniec-krowia', routeKey: `k-${name}`,
    })));
    await applyImport(db, plan(['Stara', 'Zrobiona', 'Zostaje']));
    const [done] = await searchRoutes(db, 'Zrobiona');
    await addAscent(db, ascent(done.id));
    await addUserRoute(db, route({ cragName: 'Krowia', sectorName: 'Krowia', name: 'Moja' }));
    await applyImport(db, plan(['Zostaje']));
    expect((await listCragRoutes(db, 'imp:crag:kamieniec-krowia')).map((r) => r.name).sort()).toEqual(['Moja', 'Zostaje', 'Zrobiona']);
  });
  it('reads a crag key column, so renaming a crag in the file does not duplicate it', async () => {
    const db = await freshDb();
    const file = (crag: string) => `Region;Rejon;Skała;Nazwa;Wycena;key_skaly;key\nCzarnorzeki;Kamieniec;${crag};Rysa;VI;krowia;k1\n`;
    await applyImport(db, planFromFlatRows(parseFlatCsv(file('Krowia'))));
    await applyImport(db, planFromFlatRows(parseFlatCsv(file('Krowia Turnia'))));
    expect((await listCrags(db)).map((c) => [c.id, c.name])).toEqual([['imp:crag:krowia', 'Krowia Turnia']]);
  });
});

describe('big imports', () => {
  const row = (name: string, crag: string, group: string, over: Partial<FlatRow> = {}): FlatRow => ({
    region: 'Jura', area: 'Jura Południowa', group, crag, sector: '', name, type: 'sport', grade: 'VI.1', gradeSystem: 'kr', ...over,
  });
  it('keeps length and bolts, and they can be edited', async () => {
    const db = await freshDb();
    await applyImport(db, planFromFlatRows([row('Rysa', 'Skała z Grotą', 'Dolina Sanki › Zimny Dół', { lengthM: '18', bolts: '6' })]));
    const [r] = await searchRoutes(db, 'rysa');
    expect(r).toMatchObject({ length_m: 18, bolts: 6, crag_name: 'Skała z Grotą' });
    await updateRoute(db, r.id, { sectorName: r.sector_name, name: 'Rysa', type: 'sport', gradeLabel: 'VI.1', gradeSystem: 'kr', gradeIndex: r.grade_index, lengthM: 20, bolts: null });
    expect(await getRoute(db, r.id)).toMatchObject({ length_m: 20, bolts: null });
  });
  it('finds routes again after a rename or delete (search keeps an index in memory)', async () => {
    const db = await freshDb();
    const id = await addUserRoute(db, route({ name: 'Stara nazwa' }));
    expect(await searchRoutes(db, 'stara')).toHaveLength(1);
    await updateRoute(db, id, { sectorName: 'Main', name: 'Nowa nazwa', type: 'sport', gradeLabel: 'VI.3', gradeSystem: 'kr', gradeIndex: parseGrade('VI.3', 'kr')! });
    expect(await searchRoutes(db, 'stara')).toEqual([]);
    expect((await searchRoutes(db, 'nowa')).map((x) => x.name)).toEqual(['Nowa nazwa']);
    await deleteRoute(db, id);
    expect(await searchRoutes(db, 'nowa')).toEqual([]);
  });
  it('removes imported data but keeps routes with ascents and your own', async () => {
    const db = await freshDb();
    await applyImport(db, planFromFlatRows([row('Rysa', 'Okap', 'Dolina'), row('Filar', 'Okap', 'Dolina'), row('Komin', 'Baszta', 'Dolina'),
      row('Zacięcie', 'Pusta', 'Dolina')]));
    const [filar] = await searchRoutes(db, 'filar');
    await addAscent(db, ascent(filar.id));
    await addUserRoute(db, route({ cragName: 'Baszta', name: 'Moja' }));
    expect(await importedUsage(db)).toEqual({ routes: 3, crags: 1 });
    await removeImported(db);
    expect((await listCrags(db)).map((c) => [c.name, c.routes])).toEqual([['Baszta', 1], ['Okap', 1]]);
    expect(await searchRoutes(db, 'rysa')).toEqual([]);
    expect(await importedUsage(db)).toEqual({ routes: 0, crags: 0 });
  });
});

describe('own grade and route finder', () => {
  it('stores the own grade of an ascent and clears it on edit', async () => {
    const db = await freshDb();
    const r = await addUserRoute(db, route());
    const id = await addAscent(db, { ...ascent(r), feltGradeIndex: parseGrade('VI.2', 'kr')! });
    expect((await listAscents(db))[0].felt_grade_index).toBe(parseGrade('VI.2', 'kr'));
    expect((await getAscent(db, id))!.felt_grade_index).toBe(parseGrade('VI.2', 'kr'));
    await updateAscent(db, id, ascent(r));
    expect((await listRouteAscents(db, r))[0].felt_grade_index).toBeNull();
  });
  it('finds routes by grade range, area, status, type and name', async () => {
    const db = await freshDb();
    const plan = planFromFlatRows([
      ['Czarnorzeki', 'Kamieniec', 'Krowia', 'Łatwa', 'IV', 'sport'],
      ['Czarnorzeki', 'Kamieniec', 'Krowia', 'Średnia', 'VI.1', 'sport'],
      ['Czarnorzeki', 'Strzelnica', 'Okap', 'Trudna', 'VI.2', 'sport'],
      ['Czarnorzeki', 'Strzelnica', 'Okap', 'Długa', 'VI.1', 'multipitch'],
      ['Jura', 'Rzędkowice', 'Okiennik', 'Jurajska', 'VI.1', 'sport'],
    ].map(([region, area, crag, name, grade, type]) => ({ region, area, group: '', crag, sector: '', name, grade, type, gradeSystem: 'kr' })));
    await applyImport(db, plan);
    const all: RouteFilter = { query: '', minGrade: null, maxGrade: null, areaIds: null, status: 'all', type: null };
    const names = async (f: Partial<RouteFilter>) => (await findRoutes(db, { ...all, ...f })).rows.map((r) => r.name);
    expect(await names({})).toEqual(['Łatwa', 'Długa', 'Jurajska', 'Średnia', 'Trudna']);
    expect(await names({ minGrade: parseGrade('VI', 'kr'), maxGrade: parseGrade('VI.1', 'kr') })).toEqual(['Długa', 'Jurajska', 'Średnia']);
    const areas = await listAreas(db);
    const czarnorzeki = areas.find((a) => a.name === 'Czarnorzeki')!;
    expect(await names({ areaIds: [...descendantIds(areas, czarnorzeki.id)], type: 'sport' })).toEqual(['Łatwa', 'Średnia', 'Trudna']);
    const [trudna] = await searchRoutes(db, 'trudna');
    const [srednia] = await searchRoutes(db, 'srednia');
    await addAscent(db, ascent(trudna.id, { style: 'attempt' }));
    await addAscent(db, ascent(srednia.id));
    expect(await names({ status: 'tried' })).toEqual(['Trudna']);
    expect(await names({ status: 'sent' })).toEqual(['Średnia']);
    expect(await names({ status: 'todo', areaIds: [...descendantIds(areas, czarnorzeki.id)] })).toEqual(['Łatwa', 'Długa']);
    expect(await names({ query: 'OKAP' })).toEqual(['Długa', 'Trudna']);
    const limited = await findRoutes(db, all, 2);
    expect([limited.total, limited.rows.length]).toEqual([5, 2]);
  });
});

describe('goals linked to routes and grades', () => {
  const today = new Date().toLocaleDateString('sv-SE');
  it('stores a grade goal and a project, and edits them', async () => {
    const db = await freshDb();
    const r = await addUserRoute(db, route());
    const id = await addGoal(db, { kind: 'grade', title: '3 × VI.3+', target: 3, gradeIndex: parseGrade('VI.3', 'kr')!, routeId: null });
    expect(await getGoal(db, id)).toMatchObject({ kind: 'grade', target: 3, grade_index: parseGrade('VI.3', 'kr'), route_id: null });
    await updateGoal(db, id, { kind: 'project', title: 'Test Route 1', target: null, gradeIndex: null, routeId: r });
    expect(await getGoal(db, id)).toMatchObject({ kind: 'project', title: 'Test Route 1', route_id: r, route_name: 'Test Route 1', crag_name: 'Test Crag' });
    expect((await routeGoals(db, r)).map((x) => x.id)).toEqual([id]);
  });
  it('ticks a project off on a led send, not on top-rope; a reopened one stays open until a send is saved again', async () => {
    const db = await freshDb();
    const r = await addUserRoute(db, route());
    const id = await addGoal(db, { kind: 'project', title: 'P', target: null, gradeIndex: null, routeId: r });
    await addAscent(db, ascent(r, { date: today, style: 'tr' }));
    expect((await getGoal(db, id))!.done_at).toBeNull();
    const a = await addAscent(db, ascent(r, { date: today, style: 'rp' }));
    expect((await getGoal(db, id))!.done_at).not.toBeNull();
    expect(await routeGoals(db, r)).toEqual([]);
    await setGoalDone(db, id, false);
    await updateAscent(db, a, ascent(r, { date: today, style: 'rp', notes: 'edited' }));
    expect((await getGoal(db, id))!.done_at).not.toBeNull(); // saving a send closes it again
  });
  it('does not tick off a project for a send from before the goal was set', async () => {
    const db = await freshDb();
    const r = await addUserRoute(db, route());
    const old = await addAscent(db, ascent(r, { date: '2020-01-01', style: 'rp' }));
    const id = await addGoal(db, { kind: 'wishlist', title: 'W', target: null, gradeIndex: null, routeId: r });
    await updateAscent(db, old, ascent(r, { date: '2020-01-01', style: 'rp', notes: 'x' }));
    expect((await getGoal(db, id))!.done_at).toBeNull();
  });
});

describe('building a crag from its screen', () => {
  it('creates a crag with sectors, adds sectors and routes without ascents', async () => {
    const db = await freshDb();
    const crag = await saveCrag(db, null, { name: 'Okiennik', areas: A('Jura'), description: '', approach: '', sectorNames: ['Lewy', 'Prawy'] });
    expect((await listSectors(db, crag)).map((s) => s.name)).toEqual(['Lewy', 'Prawy']);
    const again = await addSector(db, crag, 'lewy');
    expect((await listSectors(db, crag)).find((s) => s.name === 'Lewy')!.id).toBe(again);
    await addSector(db, crag, 'Środek');
    const r = await createRoute(db, crag, { sectorName: 'Prawy', name: 'Rysa', type: 'sport', gradeLabel: 'VI.3', gradeSystem: 'kr', gradeIndex: parseGrade('VI.3', 'kr', 'sport')! });
    const noSector = await createRoute(db, crag, { sectorName: '', name: 'Filar', type: 'sport', gradeLabel: 'VI', gradeSystem: 'kr', gradeIndex: parseGrade('VI', 'kr', 'sport')! });
    expect(await getRoute(db, r)).toMatchObject({ sector_name: 'Prawy', crag_name: 'Okiennik', source: 'user' });
    expect((await getRoute(db, noSector))!.sector_name).toBe('Okiennik');
    expect((await listSectors(db, crag)).map((s) => s.name)).toEqual(['Lewy', 'Okiennik', 'Prawy', 'Środek']);
    expect(await listAscents(db)).toEqual([]);
  });
});

describe('crag positions for the map', () => {
  const row = (name: string, crag: string): FlatRow => ({
    region: 'Jura', area: 'Jura Południowa', group: 'Dolina', crag, sector: '', name, type: 'sport', grade: 'VI.1', gradeSystem: 'kr',
  });
  it('reads a positions file', () => {
    const text = 'Skała;lat;lng;przybliżone\nOkap;50,4;19,8;\nBaszta;50,5;19,9;tak\nZła;abc;19;\nZero;0;0;\n';
    expect(detectFormat(text)).toBe('positions');
    expect(parsePositionsCsv(text)).toEqual([
      { key: '', name: 'Okap', lat: 50.4, lng: 19.8, approx: false },
      { key: '', name: 'Baszta', lat: 50.5, lng: 19.9, approx: true },
    ]);
  });
  it('matches by key or unique name, reports the rest, and a re-import keeps the positions', async () => {
    const db = await freshDb();
    const plan = planFromFlatRows([row('Rysa', 'Okap'), row('Filar', 'Baszta')]);
    await applyImport(db, plan);
    const crags = await listCragChoices(db);
    const baszta = crags.find((c) => c.name === 'Baszta')!;
    const res = await applyCragPositions(db, [
      { key: '', name: 'okap', lat: 50.1, lng: 19.1 },
      { key: baszta.id.replace('imp:crag:', ''), name: 'inna nazwa', lat: 50.2, lng: 19.2 },
      { key: '', name: 'Nieznana', lat: 50.3, lng: 19.3 },
    ]);
    expect(res.updated).toBe(2);
    expect(res.unmatched.map((r) => r.name)).toEqual(['Nieznana']);
    await applyImport(db, plan);
    expect(await getCrag(db, baszta.id)).toMatchObject({ lat: 50.2, lng: 19.2 });
    await setCragLocation(db, baszta.id, null);
    expect(await getCrag(db, baszta.id)).toMatchObject({ lat: null, lng: null, pos_source: '' });
  });
  it('marks approximate positions and never overwrites one the user set on the phone', async () => {
    const db = await freshDb();
    await applyImport(db, planFromFlatRows([row('Rysa', 'Okap'), row('Filar', 'Baszta')]));
    const [baszta, okap] = await listCragChoices(db);
    await setCragLocation(db, okap.id, { lat: 50.01, lng: 19.01 });
    const res = await applyCragPositions(db, [
      { key: '', name: 'Okap', lat: 51, lng: 20 },
      { key: '', name: 'Baszta', lat: 50.2, lng: 19.2, approx: true },
    ]);
    expect(res).toMatchObject({ updated: 1, kept: 1 });
    expect(await getCrag(db, okap.id)).toMatchObject({ lat: 50.01, pos_source: 'user' });
    expect(await getCrag(db, baszta.id)).toMatchObject({ lat: 50.2, pos_source: 'approx' });
    // A route list with positions updates the estimate but still keeps the user's own.
    await applyImport(db, planFromFlatRows([{ ...row('Rysa', 'Okap'), lat: '52', lng: '21' }, { ...row('Filar', 'Baszta'), lat: '50.3', lng: '19.3' }]));
    expect(await getCrag(db, okap.id)).toMatchObject({ lat: 50.01, pos_source: 'user' });
    expect(await getCrag(db, baszta.id)).toMatchObject({ lat: 50.3, pos_source: 'file' });
  });
  it('counts positions saved before the upgrade as the user\'s own', async () => {
    const db = openTestDb();
    await db.execAsync(MIGRATIONS.slice(0, 4).join('\n') + 'PRAGMA user_version = 4;');
    await db.execAsync(`INSERT INTO crag (id, name, lat, lng, created_at, updated_at) VALUES ('a', 'A', 50, 19, 1, 1), ('b', 'B', NULL, NULL, 1, 1);`);
    await migrate(db);
    expect(await getCrag(db, 'a')).toMatchObject({ name: 'A', lat: 50, pos_source: 'user' });
    expect(await getCrag(db, 'b')).toMatchObject({ name: 'B', lat: null, pos_source: '' });
  });
});

describe('backup', () => {
  async function seeded() {
    const db = await freshDb();
    await applyImport(db, samples());
    const r = await addUserRoute(db, route());
    await addAscent(db, ascent(r));
    await addGoal(db, { kind: 'project', title: 'Project', target: null, gradeIndex: null, routeId: null });
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
  it('carries a deletion to another device through a backup', async () => {
    const source = await seeded();
    const target = await freshDb();
    await importBackup(target, await exportBackup(source));
    const [a] = await listAscents(source);
    const later = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 60_000);
    await deleteAscent(source, a.id);
    later.mockRestore();
    await importBackup(target, await exportBackup(source));
    expect(await listAscents(target)).toEqual([]);
  });
  it('does not duplicate when imported twice and keeps newer local edits', async () => {
    const db = await seeded();
    const backup = await exportBackup(db);
    await db.runAsync("UPDATE goal SET title = 'Edited', updated_at = updated_at + 1000");
    expect(await importBackup(db, backup)).toBe(0);
    expect((await listGoals(db))[0].title).toBe('Edited');
  });
  it('imports a version 1 backup and marks its regions as imported', async () => {
    const source = await seeded();
    const backup = JSON.parse(JSON.stringify(await exportBackup(source)));
    backup.version = 1;
    backup.tables.region = backup.tables.region.map(({ source: _s, ...rest }: Record<string, unknown>) => rest);
    const target = await freshDb();
    await importBackup(target, backup);
    expect((await listAreas(target)).every((g) => g.source === 'import' && g.level === 'region')).toBe(true);
  });
  it('rejects files that are not a backup or come from a newer version', async () => {
    const db = await freshDb();
    await expect(importBackup(db, { hello: 'world' })).rejects.toThrow();
    await expect(importBackup(db, null)).rejects.toThrow();
    await expect(importBackup(db, { app: 'cruxlog', version: BACKUP_VERSION + 1, exportedAt: 0, tables: {} })).rejects.toThrow();
  });
});
