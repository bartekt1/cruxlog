import { type AscentStyle, type RouteType, isSend } from './grades';

export type StatAscent = {
  date: string; // YYYY-MM-DD
  type: RouteType;
  gradeIndex: number | null;
  style: AscentStyle;
  routeId?: string;
  routeName?: string;
  cragName?: string;
  partner?: string | null;
  attempts?: number;
};

/** Sends that count for goals and "hardest": led, not top-rope. */
export function isLeadSend(style: AscentStyle): boolean {
  return style === 'os' || style === 'flash' || style === 'rp' || style === 'pp';
}

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
      // Multipitch routes share the ladder with single-pitch ones, so both count as "hardest route".
      if (hardest.sport == null || a.gradeIndex > hardest.sport) hardest.sport = a.gradeIndex;
    }
  }
  return { sends, attempts, climbingDays: days.size, hardest };
}

/** Number of completed climbs per ladder index, for the difficulty pyramid. */
export function pyramid(ascents: StatAscent[], year: number): Map<number, number> {
  const out = new Map<number, number>();
  for (const a of ascents) {
    if (!a.date.startsWith(`${year}-`) || !isSend(a.style) || a.gradeIndex == null) continue;
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

/** Years with at least one ascent, plus the current year, newest first. */
export function ascentYears(ascents: StatAscent[], currentYear: number): number[] {
  const years = new Set<number>([currentYear]);
  for (const a of ascents) {
    const y = Number(a.date.slice(0, 4));
    if (Number.isInteger(y) && y > 0) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

export type GoalProgress = { value: number; target: number; ratio: number; reached: boolean };

/** Progress of a yearly count goal: sends this year against the target. */
export function countGoalProgress(target: number, sendsThisYear: number): GoalProgress {
  const safe = Math.max(1, target);
  return { value: sendsThisYear, target: safe, ratio: Math.min(1, sendsThisYear / safe), reached: sendsThisYear >= safe };
}

/** Grade goal: distinct routes led this year at or above `minGrade`, against `target`. */
export function gradeGoalProgress(ascents: StatAscent[], minGrade: number, target: number, year: number): GoalProgress & { routes: string[] } {
  const routes = new Map<string, string>();
  for (const a of ascents) {
    if (!a.date.startsWith(`${year}-`) || !isLeadSend(a.style) || a.gradeIndex == null || a.gradeIndex < minGrade) continue;
    const key = a.routeId ?? `${a.routeName}|${a.cragName}`;
    if (!routes.has(key)) routes.set(key, a.routeName ?? '');
  }
  const safe = Math.max(1, target);
  const value = routes.size;
  return { value, target: safe, ratio: Math.min(1, value / safe), reached: value >= safe, routes: [...routes.values()] };
}

/** Work on one route: tries (attempts summed), days tried and the first led send. */
export function projectProgress(ascents: StatAscent[], routeId: string): { tries: number; days: number; sentOn: string | null } {
  const mine = ascents.filter((a) => a.routeId === routeId);
  const sends = mine.filter((a) => isLeadSend(a.style)).map((a) => a.date).sort();
  return { tries: mine.reduce((n, a) => n + (a.attempts ?? 1), 0), days: new Set(mine.map((a) => a.date)).size, sentOn: sends[0] ?? null };
}

/** Hardest led send of each month of the year (index 0 = January), null for months without one. */
export function hardestByMonth(ascents: StatAscent[], year: number): (number | null)[] {
  const out: (number | null)[] = Array(12).fill(null);
  for (const a of ascents) {
    if (!a.date.startsWith(`${year}-`) || !isLeadSend(a.style) || a.gradeIndex == null) continue;
    const m = Number(a.date.slice(5, 7)) - 1;
    if (m >= 0 && m < 12 && (out[m] == null || a.gradeIndex > out[m]!)) out[m] = a.gradeIndex;
  }
  return out;
}

/** Hardest led send per year, newest year first. */
export function hardestByYear(ascents: StatAscent[]): { year: number; gradeIndex: number }[] {
  const best = new Map<number, number>();
  for (const a of ascents) {
    if (!isLeadSend(a.style) || a.gradeIndex == null) continue;
    const y = Number(a.date.slice(0, 4));
    if (!best.has(y) || a.gradeIndex > best.get(y)!) best.set(y, a.gradeIndex);
  }
  return [...best.entries()].sort((a, b) => b[0] - a[0]).map(([year, gradeIndex]) => ({ year, gradeIndex }));
}

/** How many ascents of each style in the year. */
export function styleCounts(ascents: StatAscent[], year: number): Map<AscentStyle, number> {
  const out = new Map<AscentStyle, number>();
  for (const a of ascents) if (a.date.startsWith(`${year}-`)) out.set(a.style, (out.get(a.style) ?? 0) + 1);
  return out;
}

/** The `limit` names with the most distinct days in the year (crags or partners), most first, then by name. */
export function topByDays(ascents: StatAscent[], year: number, key: (a: StatAscent) => string | null | undefined, limit = 5): { name: string; days: number }[] {
  const days = new Map<string, Set<string>>();
  for (const a of ascents) {
    const name = key(a)?.trim();
    if (!name || !a.date.startsWith(`${year}-`)) continue;
    if (!days.has(name)) days.set(name, new Set());
    days.get(name)!.add(a.date);
  }
  return [...days.entries()].map(([name, d]) => ({ name, days: d.size }))
    .sort((a, b) => b.days - a.days || a.name.localeCompare(b.name)).slice(0, limit);
}

/** The year as 12 months of days, each with its number of ascents. */
export function yearCalendar(days: Map<string, number>, year: number): { key: string; n: number }[][] {
  const pad = (n: number) => String(n).padStart(2, '0');
  return Array.from({ length: 12 }, (_, m) => {
    const len = new Date(year, m + 1, 0).getDate();
    return Array.from({ length: len }, (_, d) => {
      const key = `${year}-${pad(m + 1)}-${pad(d + 1)}`;
      return { key, n: days.get(key) ?? 0 };
    });
  });
}
