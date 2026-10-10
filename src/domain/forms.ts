// Form validation. Errors are i18n keys, so the screens decide how to show them.

import { isValidIsoDate } from './dates';
import { parseGrade, type AscentStyle, type GradeSystem, type RouteType } from './grades';

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

export type GoalKind = 'count' | 'project' | 'wishlist';

export function validateGoalDraft(g: { kind: GoalKind; title: string; target: string }): Result<{ title: string; target: number | null }> {
  const title = g.title.trim();
  if (!title) return { ok: false, error: 'goals.errors.title' };
  if (g.kind !== 'count') return { ok: true, value: { title, target: null } };
  const text = g.target.trim();
  if (text === '') return { ok: true, value: { title, target: null } };
  const target = Number(text);
  if (!Number.isInteger(target) || target < 1) return { ok: false, error: 'goals.errors.target' };
  return { ok: true, value: { title, target } };
}

/** A required name, e.g. of a sector or region. */
export function validateName(name: string): Result<string> {
  const n = name.trim();
  return n ? { ok: true, value: n } : { ok: false, error: 'edit.errors.name' };
}

export function validateCragDraft(c: { name: string; region: string; description: string; approach: string }): Result<{ name: string; regionName: string; description: string; approach: string }> {
  const name = c.name.trim();
  if (!name) return { ok: false, error: 'edit.errors.name' };
  return { ok: true, value: { name, regionName: c.region.trim(), description: c.description.trim(), approach: c.approach.trim() } };
}
