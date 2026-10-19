// Canonical grade model: every route grade is stored as an index on a
// shared ladder plus the original label, so any grading system can be shown later.
// Conversions between systems are approximate and meant to be tuned.

// The app is for roped climbing only; boulders were removed (migration 4 hides old boulder data).
export type RouteType = 'sport' | 'multipitch';
export type GradeSystem = 'kr' | 'uiaa' | 'fr';

export type RouteLadderRow = { kr: string; uiaa: string; fr: string };

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
  // Append only: indices are stored in the database.
  { kr: 'VI.7+', uiaa: 'X+', fr: '8a+' },
  { kr: 'VI.8', uiaa: 'XI-', fr: '8b' },
  { kr: 'VI.8+', uiaa: 'XI', fr: '8b+' },
];

export const ROUTE_SYSTEMS: GradeSystem[] = ['kr', 'uiaa', 'fr'];

export function systemsFor(_type: RouteType): GradeSystem[] {
  return ROUTE_SYSTEMS;
}

export function ladderLength(_type: RouteType): number {
  return ROUTE_LADDER.length;
}

const norm = (s: string) => s.trim().replace(/\s+/g, '').toUpperCase();

function exactIndex(wanted: string, system: GradeSystem): number | null {
  if (system !== 'kr' && system !== 'uiaa' && system !== 'fr') return null;
  const i = ROUTE_LADDER.findIndex((r) => norm(r[system]) === wanted);
  return i < 0 ? null : i;
}

/**
 * Returns the ladder index for a label written in the given system, or null.
 * Guidebook forms the ladder lacks map to the nearest lower step, so stats stay conservative
 * while the original label is kept on the route: "VI.4/4+" and "VI.5?" use the first grade,
 * "VI+" the grade without "+", "VI-" the step below VI, and "I"/"II" the lowest step.
 */
export function parseGrade(label: string, system: GradeSystem, _type?: RouteType): number | null {
  const wanted = norm(label);
  if (!wanted) return null;
  const exact = exactIndex(wanted, system);
  if (exact != null) return exact;
  const first = wanted.replace(/\?+$/, '').split('/')[0];
  if (!first) return null;
  const again = exactIndex(first, system);
  if (again != null) return again;
  const bare = first.replace(/[+-]$/, '');
  // I and II (with or without + or -) are below the ladder and count as its lowest step.
  if ((system === 'kr' || system === 'uiaa') && (bare === 'I' || bare === 'II')) return 0;
  if (first.endsWith('+')) return exactIndex(bare, system);
  if (first.endsWith('-')) {
    const base = exactIndex(bare, system);
    return base == null ? null : Math.max(0, base - 1);
  }
  return null;
}

/** Label of a ladder index in the requested system. */
export function formatGrade(index: number, system: GradeSystem, _type?: RouteType): string {
  const row = ROUTE_LADDER[index];
  if (!row) return '?';
  return system === 'uiaa' ? row.uiaa : system === 'fr' ? row.fr : row.kr;
}

export type GradedRoute = { grade_index: number; grade_label?: string; grade_system?: GradeSystem; type: RouteType };

/** The route's own label (e.g. "VI.4/4+" from a guidebook) when shown in its own system, else the ladder grade in `system`. */
export function routeGrade(r: GradedRoute, system: GradeSystem): string {
  return r.grade_system === system && r.grade_label?.trim() ? r.grade_label.trim() : formatGrade(r.grade_index, system, r.type);
}

/** Styles that count as a completed climb in stats. */
export type AscentStyle = 'os' | 'flash' | 'rp' | 'pp' | 'tr' | 'attempt';
export const ASCENT_STYLES: AscentStyle[] = ['os', 'flash', 'rp', 'pp', 'tr', 'attempt'];
export function isSend(style: AscentStyle): boolean {
  return style !== 'attempt';
}

/** Ladder indices around `index` (inclusive), clipped to the ladder: the choices for "your own grade". */
export function nearbyGrades(index: number, below = 3, above = 3): number[] {
  const out: number[] = [];
  for (let i = Math.max(0, index - below); i <= Math.min(ROUTE_LADDER.length - 1, index + above); i++) out.push(i);
  return out;
}

/** The own grade worth showing: null when none was given or it equals the route's grade. */
export function feltGrade(felt: number | null | undefined, routeIndex: number): number | null {
  return felt == null || felt === routeIndex ? null : felt;
}

/** A typical mid-range grade in the given system, used as a hint in forms. */
export function gradeExample(system: GradeSystem, type: RouteType): string {
  return formatGrade(9, system, type);
}
