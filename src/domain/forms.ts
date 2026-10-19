// Form validation. Errors are i18n keys, so the screens decide how to show them.

import { isValidIsoDate } from './dates';
import { parseGrade, type AscentStyle, type GradeSystem, type RouteType } from './grades';
import { sameName } from './text';

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type RouteDraft = { crag: string; sector: string; name: string; type: RouteType; system: GradeSystem; grade: string };

export function validateRouteDraft(r: RouteDraft): Result<{ cragName: string; sectorName: string; name: string; gradeLabel: string; gradeIndex: number }> {
  const crag = r.crag.trim();
  const name = r.name.trim();
  if (!crag) return { ok: false, error: 'ascent.errors.crag' };
  if (!name) return { ok: false, error: 'ascent.errors.name' };
  const gradeIndex = parseGrade(r.grade, r.system, r.type);
  if (gradeIndex == null) return { ok: false, error: 'ascent.errors.grade' };
  return { ok: true, value: { cragName: crag, sectorName: r.sector.trim() || crag, name, gradeLabel: r.grade.trim(), gradeIndex } };
}

/** Optional length or bolt count from a text field: empty → null; anything but a number ≥ 0 is an error. */
export function validateOptionalNumber(text: string, integer: boolean): Result<number | null> {
  const s = text.trim().replace(',', '.');
  if (!s) return { ok: true, value: null };
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 5000 || (integer && !Number.isInteger(n))) return { ok: false, error: 'edit.errors.number' };
  return { ok: true, value: n };
}

export type AscentDraft = { date: string; attempts: string };

export function validateAscentDraft(a: AscentDraft): Result<{ date: string; attempts: number }> {
  if (!isValidIsoDate(a.date)) return { ok: false, error: 'ascent.errors.date' };
  const text = a.attempts.trim();
  const attempts = text === '' ? 1 : Number(text);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 999) return { ok: false, error: 'ascent.errors.attempts' };
  return { ok: true, value: { date: a.date.trim(), attempts } };
}

/** Onsight and flash are first-try ascents by definition. */
export function isFirstTry(style: AscentStyle): boolean {
  return style === 'os' || style === 'flash';
}

export type GoalKind = 'count' | 'grade' | 'project' | 'wishlist';
export const GOAL_KINDS: GoalKind[] = ['count', 'grade', 'project', 'wishlist'];

export type GoalDraft = {
  kind: GoalKind; title: string; target: string; gradeIndex: number | null; routeId: string | null;
  /** Used when the title is left empty, e.g. the route's name or "3 × VI.3+". */
  fallbackTitle?: string;
};
export type GoalValue = { title: string; target: number | null; gradeIndex: number | null; routeId: string | null };

/**
 * count: optional yearly number of sends. grade: a grade (required) and how many routes at or above it (default 1).
 * project / wishlist: optionally linked to a route. Only the fields of the kind are kept.
 */
export function validateGoalDraft(g: GoalDraft): Result<GoalValue> {
  if (g.kind === 'grade' && g.gradeIndex == null) return { ok: false, error: 'goals.errors.grade' };
  const title = g.title.trim() || (g.fallbackTitle ?? '').trim();
  if (!title) return { ok: false, error: 'goals.errors.title' };
  const routeId = g.kind === 'project' || g.kind === 'wishlist' ? g.routeId : null;
  if (g.kind !== 'count' && g.kind !== 'grade') return { ok: true, value: { title, target: null, gradeIndex: null, routeId } };
  const text = g.target.trim();
  const target = text === '' ? (g.kind === 'grade' ? 1 : null) : Number(text);
  if (target != null && (!Number.isInteger(target) || target < 1)) return { ok: false, error: 'goals.errors.target' };
  return { ok: true, value: { title, target, gradeIndex: g.kind === 'grade' ? g.gradeIndex : null, routeId: null } };
}

/** A required name, e.g. of a sector or region. */
export function validateName(name: string): Result<string> {
  const n = name.trim();
  return n ? { ok: true, value: n } : { ok: false, error: 'edit.errors.name' };
}

export type AreaDraft = { region: string; area: string; group: string };
export type CragDraft = { name: string; areas: AreaDraft; description: string; approach: string; sectors?: string[] };

/** A crag needs a region, an area ("rejon") and a name; the group and sectors are optional, sectors de-duplicated loosely. */
export function validateCragDraft(c: CragDraft): Result<{ name: string; areas: AreaDraft; description: string; approach: string; sectorNames: string[] }> {
  const areas = validateAreas(c.areas);
  if (!areas.ok) return areas;
  const name = c.name.trim();
  if (!name) return { ok: false, error: 'edit.errors.name' };
  const sectorNames: string[] = [];
  for (const s of c.sectors ?? []) {
    const n = s.trim();
    if (n && !sectorNames.some((x) => sameName(x, n))) sectorNames.push(n);
  }
  return { ok: true, value: { name, areas: areas.value, description: c.description.trim(), approach: c.approach.trim(), sectorNames } };
}

/** Region and area are required, the group is optional. */
export function validateAreas(a: AreaDraft): Result<AreaDraft> {
  const region = a.region.trim();
  const area = a.area.trim();
  if (!region) return { ok: false, error: 'edit.errors.region' };
  if (!area) return { ok: false, error: 'edit.errors.area' };
  return { ok: true, value: { region, area, group: a.group.trim() } };
}
