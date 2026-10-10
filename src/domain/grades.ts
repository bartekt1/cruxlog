// Canonical grade model: every route/boulder grade is stored as an index on a
// shared ladder plus the original label, so any grading system can be shown later.
// Conversions between systems are approximate and meant to be tuned.

export type RouteType = 'sport' | 'boulder' | 'multipitch';
export type GradeSystem = 'kr' | 'uiaa' | 'fr' | 'font' | 'v';

export type RouteLadderRow = { kr: string; uiaa: string; fr: string };
export type BoulderLadderRow = { font: string; v: string };

export const ROUTE_LADDER: RouteLadderRow[] = [
  { kr: 'III', uiaa: 'III', fr: '3' },
  { kr: 'IV', uiaa: 'IV', fr: '4a' },
  { kr: 'V', uiaa: 'V', fr: '5a' },
  { kr: 'V+', uiaa: 'V+', fr: '5b' },
  { kr: 'VI', uiaa: 'VI', fr: '5c' },
  { kr: 'VI.1', uiaa: 'VI+', fr: '6a' },
  { kr: 'VI.1+', uiaa: 'VII-', fr: '6a+' },
  { kr: 'VI.2', uiaa: 'VII', fr: '6b' },
  { kr: 'VI.2+', uiaa: 'VII+', fr: '6b+' },
  { kr: 'VI.3', uiaa: 'VIII-', fr: '6c' },
  { kr: 'VI.3+', uiaa: 'VIII-', fr: '6c+' },
  { kr: 'VI.4', uiaa: 'VIII', fr: '7a' },
  { kr: 'VI.4+', uiaa: 'VIII+', fr: '7a+' },
  { kr: 'VI.5', uiaa: 'IX-', fr: '7b' },
  { kr: 'VI.5+', uiaa: 'IX', fr: '7b+' },
  { kr: 'VI.6', uiaa: 'IX+', fr: '7c' },
  { kr: 'VI.6+', uiaa: 'X-', fr: '7c+' },
  { kr: 'VI.7', uiaa: 'X', fr: '8a' },
];

export const BOULDER_LADDER: BoulderLadderRow[] = [
  { font: '4', v: 'V0' },
  { font: '5', v: 'V1' },
  { font: '5+', v: 'V2' },
  { font: '6A', v: 'V3' },
  { font: '6A+', v: 'V3' },
  { font: '6B', v: 'V4' },
  { font: '6B+', v: 'V4' },
  { font: '6C', v: 'V5' },
  { font: '6C+', v: 'V5' },
  { font: '7A', v: 'V6' },
  { font: '7A+', v: 'V7' },
  { font: '7B', v: 'V8' },
  { font: '7B+', v: 'V8' },
  { font: '7C', v: 'V9' },
  { font: '7C+', v: 'V10' },
  { font: '8A', v: 'V11' },
];

export const ROUTE_SYSTEMS: GradeSystem[] = ['kr', 'uiaa', 'fr'];
export const BOULDER_SYSTEMS: GradeSystem[] = ['font', 'v'];

export function isBoulder(type: RouteType): boolean {
  return type === 'boulder';
}

export function systemsFor(type: RouteType): GradeSystem[] {
  return isBoulder(type) ? BOULDER_SYSTEMS : ROUTE_SYSTEMS;
}

export function ladderLength(type: RouteType): number {
  return isBoulder(type) ? BOULDER_LADDER.length : ROUTE_LADDER.length;
}

const norm = (s: string) => s.trim().replace(/\s+/g, '').toUpperCase();

/** Returns the ladder index for a label written in the given system, or null. */
export function parseGrade(label: string, system: GradeSystem, type: RouteType): number | null {
  const wanted = norm(label);
  if (!wanted) return null;
  if (isBoulder(type)) {
    if (system !== 'font' && system !== 'v') return null;
    const i = BOULDER_LADDER.findIndex((r) => norm(r[system]) === wanted);
    return i < 0 ? null : i;
  }
  if (system !== 'kr' && system !== 'uiaa' && system !== 'fr') return null;
  const i = ROUTE_LADDER.findIndex((r) => norm(r[system]) === wanted);
  return i < 0 ? null : i;
}

/** Label of a ladder index in the requested system. */
export function formatGrade(index: number, system: GradeSystem, type: RouteType): string {
  if (isBoulder(type)) {
    const row = BOULDER_LADDER[index];
    if (!row) return '?';
    return system === 'v' ? row.v : row.font;
  }
  const row = ROUTE_LADDER[index];
  if (!row) return '?';
  return system === 'uiaa' ? row.uiaa : system === 'fr' ? row.fr : row.kr;
}

/** Styles that count as a completed climb in stats. */
export type AscentStyle = 'os' | 'flash' | 'rp' | 'pp' | 'tr' | 'attempt';
export const ASCENT_STYLES: AscentStyle[] = ['os', 'flash', 'rp', 'pp', 'tr', 'attempt'];
export function isSend(style: AscentStyle): boolean {
  return style !== 'attempt';
}

/** A typical mid-range grade in the given system, used as a hint in forms. */
export function gradeExample(system: GradeSystem, type: RouteType): string {
  return formatGrade(isBoulder(type) ? 5 : 9, system, type);
}
