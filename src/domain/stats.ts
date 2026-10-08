import { type AscentStyle, type RouteType, isSend } from './grades';

export type StatAscent = {
  date: string; // YYYY-MM-DD
  type: RouteType;
  gradeIndex: number | null;
  style: AscentStyle;
};

export type YearStats = {
  sends: number;
  attempts: number;
  climbingDays: number;
  hardest: Partial<Record<RouteType, number>>;
};

export function yearStats(ascents: StatAscent[], year: number): YearStats {
  const prefix = `${year}-`;
  const days = new Set<string>();
  const hardest: Partial<Record<RouteType, number>> = {};
  let sends = 0;
  let attempts = 0;
  for (const a of ascents) {
    if (!a.date.startsWith(prefix)) continue;
    days.add(a.date);
    if (!isSend(a.style)) {
      attempts++;
      continue;
    }
    sends++;
    if (a.gradeIndex != null && (a.style === 'os' || a.style === 'flash' || a.style === 'rp' || a.style === 'pp')) {
      const key = a.type === 'multipitch' ? 'sport' : a.type;
      if (hardest[key] == null || a.gradeIndex > hardest[key]!) hardest[key] = a.gradeIndex;
    }
  }
  return { sends, attempts, climbingDays: days.size, hardest };
}

/** Number of completed climbs per ladder index, for the difficulty pyramid. */
export function pyramid(ascents: StatAscent[], year: number, kind: 'boulder' | 'route'): Map<number, number> {
  const out = new Map<number, number>();
  for (const a of ascents) {
    if (!a.date.startsWith(`${year}-`) || !isSend(a.style) || a.gradeIndex == null) continue;
    if ((a.type === 'boulder') !== (kind === 'boulder')) continue;
    out.set(a.gradeIndex, (out.get(a.gradeIndex) ?? 0) + 1);
  }
  return out;
}

/** Climbs per day, used by the activity calendar. */
export function activityByDay(ascents: StatAscent[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const a of ascents) out.set(a.date, (out.get(a.date) ?? 0) + 1);
  return out;
}
