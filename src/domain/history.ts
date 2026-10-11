import { isSend, type AscentStyle } from './grades';

export type HistoryAscent = { date: string; style: AscentStyle; attempts: number };

export type RouteSummary = {
  ascents: number;
  sends: number;
  firstSend: { date: string; style: AscentStyle } | null;
  /** Days on the route up to and including the first send. */
  daysToSend: number | null;
};

/** Summary of the user's history on one route. */
export function routeSummary(ascents: HistoryAscent[]): RouteSummary {
  const sorted = [...ascents].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted.find((a) => isSend(a.style)) ?? null;
  const days = first ? new Set(sorted.filter((a) => a.date <= first.date).map((a) => a.date)).size : null;
  return {
    ascents: ascents.length,
    sends: ascents.filter((a) => isSend(a.style)).length,
    firstSend: first ? { date: first.date, style: first.style } : null,
    daysToSend: days,
  };
}

export const BACKUP_REMINDER_DAYS = 30;

/** Days since the last backup and whether to remind the user (only when there is something to lose). */
export function backupStatus(lastBackupAt: number | null, now: number, hasData: boolean): { days: number | null; due: boolean } {
  const days = lastBackupAt == null ? null : Math.floor((now - lastBackupAt) / 86_400_000);
  return { days, due: hasData && (days == null || days >= BACKUP_REMINDER_DAYS) };
}
