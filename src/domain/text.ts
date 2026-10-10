// Text matching that ignores case and Polish (and other) diacritics: "lysa" finds "Łysa".

const PL: Record<string, string> = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };

/** Lower-case, without diacritics and repeated spaces. Polish letters are mapped by hand, other accents via normalize when available. */
export function fold(s: string): string {
  let out = s.toLowerCase().replace(/[ąćęłńóśźż]/g, (c) => PL[c]);
  try {
    out = out.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    // normalize missing: Polish letters are already handled.
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Same name after folding, e.g. "Okiennik" and " okiennik". */
export function sameName(a: string, b: string): boolean {
  return fold(a) === fold(b);
}

/** True when every word of the query appears in one of the fields. */
export function matches(query: string, ...fields: string[]): boolean {
  const words = fold(query).split(' ').filter(Boolean);
  if (!words.length) return true;
  const hay = fields.map(fold).join(' ');
  return words.every((w) => hay.includes(w));
}

/**
 * Filters and orders items for a type-ahead list: names starting with the query first,
 * then other matches, alphabetically within each group.
 */
export function suggest<T>(items: T[], query: string, name: (x: T) => string, extra: (x: T) => string[] = () => [], limit = 8): T[] {
  const q = fold(query);
  const hits = items.filter((x) => matches(query, name(x), ...extra(x)));
  const starts = (x: T) => (q && fold(name(x)).startsWith(q) ? 0 : 1);
  return hits
    .sort((a, b) => starts(a) - starts(b) || fold(name(a)).localeCompare(fold(name(b))))
    .slice(0, limit);
}
