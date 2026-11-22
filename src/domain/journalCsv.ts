import { feltGrade, formatGrade, routeGrade, type AscentStyle, type GradeSystem, type RouteType } from './grades';

/** One ascent with everything the journal export writes. */
export type JournalExportRow = {
  date: string; style: AscentStyle; attempts: number; rating: number | null; felt_grade_index: number | null;
  notes: string; weather: string; partner_name: string | null;
  route_name: string; type: RouteType; grade_index: number; grade_label: string; grade_system: GradeSystem;
  sector_name: string; crag_name: string; region_name: string | null;
};

/** The columns, in file order. */
export const JOURNAL_CSV_COLUMNS = ['date', 'route', 'grade', 'felt', 'type', 'crag', 'sector', 'region', 'style', 'attempts', 'rating', 'partner', 'weather', 'notes'] as const;
export type JournalCsvColumn = (typeof JOURNAL_CSV_COLUMNS)[number];

/** The column titles and the words the export needs, already translated. */
export type JournalCsvLabels = {
  columns: Record<JournalCsvColumn, string>;
  styles: Record<AscentStyle, string>;
  types: Record<RouteType, string>;
};

/**
 * Polish Excel reads ";" as the column separator (the comma is its decimal sign), English Excel reads ",".
 * The file starts with a byte order mark so Excel shows Polish letters correctly.
 */
export function csvSeparator(language: string): ';' | ',' {
  return language.startsWith('pl') ? ';' : ',';
}

/** One cell: quoted when needed; text that a spreadsheet would run as a formula gets a leading apostrophe. */
export function csvCell(value: string | number | null | undefined, sep: string): string {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text) && typeof value === 'string') text = `'${text}`;
  return text.includes(sep) || /["\r\n]/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The journal as a CSV file (text with a BOM), one row per ascent in the given order. */
export function journalCsv(rows: JournalExportRow[], system: GradeSystem, labels: JournalCsvLabels, sep: ';' | ','): string {
  const head = JOURNAL_CSV_COLUMNS.map((k) => labels.columns[k]);
  const lines = rows.map((r) => {
    const felt = feltGrade(r.felt_grade_index, r.grade_index);
    return [
      r.date, r.route_name, routeGrade(r, system), felt == null ? '' : formatGrade(felt, system, r.type), labels.types[r.type] ?? r.type,
      r.crag_name, r.sector_name, r.region_name ?? '', labels.styles[r.style] ?? r.style, r.attempts, r.rating ?? '',
      r.partner_name ?? '', r.weather, r.notes,
    ].map((v) => csvCell(v, sep)).join(sep);
  });
  return `﻿${[head.map((h) => csvCell(h, sep)).join(sep), ...lines].join('\r\n')}\r\n`;
}
