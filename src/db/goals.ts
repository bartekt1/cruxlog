import type { SQLiteDatabase } from 'expo-sqlite';
import { type GradeSystem, type RouteType } from '../domain/grades';
import { newId, now } from './ids';

export type GoalRow = {
  id: string; kind: string; title: string; target: number | null; grade_index: number | null; done_at: number | null; created_at: number;
  /** The linked route of a project or wishlist goal (null when none or deleted). */
  route_id: string | null; route_name: string | null; route_grade_index: number | null; route_grade_label: string | null;
  route_grade_system: GradeSystem | null; route_type: RouteType | null; crag_name: string | null; region_id: string | null;
};

const GOAL_SELECT = `SELECT g.id, g.kind, g.title, g.target, g.grade_index, g.done_at, g.created_at,
    r.id AS route_id, r.name AS route_name, r.grade_index AS route_grade_index, r.grade_label AS route_grade_label,
    r.grade_system AS route_grade_system, r.type AS route_type, c.name AS crag_name, c.region_id
  FROM goal g LEFT JOIN route r ON r.id = g.route_id AND r.deleted_at IS NULL
  LEFT JOIN sector s ON s.id = r.sector_id LEFT JOIN crag c ON c.id = s.crag_id`;

export async function listGoals(db: SQLiteDatabase): Promise<GoalRow[]> {
  return db.getAllAsync<GoalRow>(`${GOAL_SELECT} WHERE g.deleted_at IS NULL ORDER BY g.done_at IS NOT NULL, g.created_at DESC`);
}

export async function getGoal(db: SQLiteDatabase, id: string): Promise<GoalRow | null> {
  return db.getFirstAsync<GoalRow>(`${GOAL_SELECT} WHERE g.id = ? AND g.deleted_at IS NULL`, [id]);
}

/** Open project or wishlist goals linked to a route. */
export async function routeGoals(db: SQLiteDatabase, routeId: string): Promise<GoalRow[]> {
  return db.getAllAsync<GoalRow>(`${GOAL_SELECT} WHERE g.route_id = ? AND g.deleted_at IS NULL AND g.done_at IS NULL`, [routeId]);
}

/** Open project or wishlist goal per route, for the badges in route lists. */
export async function routeGoalKinds(db: SQLiteDatabase): Promise<Map<string, 'project' | 'wishlist'>> {
  const rows = await db.getAllAsync<{ route_id: string; kind: 'project' | 'wishlist' }>(
    `SELECT route_id, kind FROM goal WHERE route_id IS NOT NULL AND kind IN ('project', 'wishlist') AND deleted_at IS NULL AND done_at IS NULL
     ORDER BY kind = 'project'`);
  return new Map(rows.map((r) => [r.route_id, r.kind])); // a project wins over a wish for the same route
}

/** Makes a route a project or a wish, named after it. A route that already is an open goal of that kind keeps it. */
export async function addRouteGoal(db: SQLiteDatabase, routeId: string, kind: 'project' | 'wishlist'): Promise<string> {
  const open = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM goal WHERE route_id = ? AND kind = ? AND deleted_at IS NULL AND done_at IS NULL', [routeId, kind]);
  if (open) return open.id;
  const r = await db.getFirstAsync<{ name: string }>('SELECT name FROM route WHERE id = ?', [routeId]);
  if (!r) throw new Error('Route not found');
  return addGoal(db, { kind, title: r.name, target: null, gradeIndex: null, routeId });
}

export type GoalInput = { kind: 'count' | 'grade' | 'project' | 'wishlist'; title: string; target: number | null; gradeIndex: number | null; routeId: string | null };

export async function addGoal(db: SQLiteDatabase, g: GoalInput): Promise<string> {
  const t = now();
  const id = newId();
  await db.runAsync('INSERT INTO goal (id, kind, title, target, grade_index, route_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
    [id, g.kind, g.title, g.target, g.gradeIndex, g.routeId, t, t]);
  return id;
}

export async function updateGoal(db: SQLiteDatabase, id: string, g: GoalInput): Promise<void> {
  await db.runAsync('UPDATE goal SET kind = ?, title = ?, target = ?, grade_index = ?, route_id = ?, updated_at = ? WHERE id = ?',
    [g.kind, g.title, g.target, g.gradeIndex, g.routeId, now(), id]);
}

/**
 * Closes open project and wishlist goals whose route got a led send (OS, flash, RP, PP) on or after the day the goal was set.
 * Runs when an ascent is saved, so a goal reopened by hand stays open until the next send.
 */
export async function completeRouteGoals(db: SQLiteDatabase, t: number): Promise<void> {
  await db.runAsync(
    `UPDATE goal SET done_at = ?, updated_at = ?
     WHERE deleted_at IS NULL AND done_at IS NULL AND route_id IS NOT NULL AND kind IN ('project', 'wishlist')
       AND EXISTS (SELECT 1 FROM ascent a WHERE a.route_id = goal.route_id AND a.deleted_at IS NULL
         AND a.style IN ('os', 'flash', 'rp', 'pp') AND a.date >= date(goal.created_at / 1000, 'unixepoch', 'localtime'))`,
    [t, t]);
}

export async function setGoalDone(db: SQLiteDatabase, id: string, done: boolean): Promise<void> {
  const t = now();
  await db.runAsync('UPDATE goal SET done_at = ?, updated_at = ? WHERE id = ?', [done ? t : null, t, id]);
}

export async function deleteGoal(db: SQLiteDatabase, id: string): Promise<void> {
  const t = now();
  await db.runAsync('UPDATE goal SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, id]);
}
