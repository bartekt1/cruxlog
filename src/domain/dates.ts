// Dates are stored as local calendar days in ISO form (YYYY-MM-DD).

const pad = (n: number) => String(n).padStart(2, '0');

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The ISO day `days` after (or before, if negative) the given ISO day. */
export function shiftDay(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d + days));
}

/** True for a real calendar day written as YYYY-MM-DD. */
export function isValidIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

/** 'today' or 'yesterday' relative to `today`, otherwise null. */
export function relativeDay(iso: string, today: string): 'today' | 'yesterday' | null {
  if (iso === today) return 'today';
  if (iso === shiftDay(today, -1)) return 'yesterday';
  return null;
}

/** Localized day label, e.g. "Sat, 10 October"; the year is shown only when it differs from today's. */
export function formatDay(iso: string, locale: string, today: string): string {
  if (!isValidIsoDate(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  const sameYear = y === Number(today.slice(0, 4));
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    weekday: 'short', day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }),
  });
}
