// Trips: a day or a few days at some crags with proposed routes. Shared as an invitation before and as a summary after.
import { isValidIsoDate } from './dates';
import { isSend, type AscentStyle } from './grades';

export type TripDraft = { name: string; startDate: string; endDate: string; message: string; cragIds: string[]; routeIds: string[] };

/** Checks a trip form: a name, valid days in order (one day: the end is the start) and at least one crag. Returns an i18n key on error. */
export function validateTrip(d: TripDraft): { ok: true; value: TripDraft } | { ok: false; error: string } {
  const name = d.name.trim();
  if (!name) return { ok: false, error: 'trip.errors.name' };
  if (!isValidIsoDate(d.startDate)) return { ok: false, error: 'trip.errors.dates' };
  const endDate = d.endDate && isValidIsoDate(d.endDate) ? d.endDate : d.startDate;
  if (endDate < d.startDate) return { ok: false, error: 'trip.errors.dates' };
  if (!d.cragIds.length) return { ok: false, error: 'trip.errors.place' };
  return { ok: true, value: { ...d, name, message: d.message.trim(), endDate, routeIds: [...new Set(d.routeIds)], cragIds: [...new Set(d.cragIds)] } };
}

export type TripStatus = 'planned' | 'ongoing' | 'done';

export function tripStatus(t: { start_date: string; end_date: string }, today: string): TripStatus {
  if (today < t.start_date) return 'planned';
  return today > t.end_date ? 'done' : 'ongoing';
}

/** "Sat, 2 May 2026" for one day, "1–3 May 2026" in one month, "30 April – 2 May 2026" across months (in the given language). */
export function formatTripDates(start: string, end: string, locale: string): string {
  const d = (iso: string) => { const [y, m, day] = iso.split('-').map(Number); return new Date(y, m - 1, day); };
  const a = d(start);
  const b = d(end);
  if (start === end) return a.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const full = b.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return `${a.getDate()}–${full}`;
  const opts: Intl.DateTimeFormatOptions = a.getFullYear() === b.getFullYear() ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' };
  return `${a.toLocaleDateString(locale, opts)} – ${full}`;
}

export type TripAscent = { route_id: string; route_name: string; grade_index: number; style: AscentStyle; date: string };

export type TripSummary = {
  sends: number; attempts: number; days: number;
  /** The hardest send (ladder index and route name), null without sends. */
  hardest: { gradeIndex: number; name: string } | null;
  /** How many of the proposed routes were sent. */
  planned: { done: number; total: number };
  /** Each route sent, once, hardest first. */
  sent: TripAscent[];
};

/** What was climbed during a trip: the ascents of its days (from listAscentsBetween) and the routes it proposed. */
export function tripSummary(ascents: TripAscent[], plannedRouteIds: string[]): TripSummary {
  const sentByRoute = new Map<string, TripAscent>();
  for (const a of ascents) if (isSend(a.style) && !sentByRoute.has(a.route_id)) sentByRoute.set(a.route_id, a);
  const sent = [...sentByRoute.values()].sort((x, y) => y.grade_index - x.grade_index || x.route_name.localeCompare(y.route_name));
  const planned = new Set(plannedRouteIds);
  return {
    sends: ascents.filter((a) => isSend(a.style)).length,
    attempts: ascents.filter((a) => !isSend(a.style)).length,
    days: new Set(ascents.map((a) => a.date)).size,
    hardest: sent[0] ? { gradeIndex: sent[0].grade_index, name: sent[0].route_name } : null,
    planned: { done: [...planned].filter((id) => sentByRoute.has(id)).length, total: planned.size },
    sent,
  };
}
