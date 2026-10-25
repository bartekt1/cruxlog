// What an import writes: crags, sectors and routes with stable keys. Built from CSV files by planFromFiles,
// written by applyImport (src/db/imports.ts).
import { detectFormat, missingColumns, parseFlatCsv, planFromFlatRows, type FlatRow } from './flatImport';
import { type GradeSystem, type RouteType } from './grades';

export type ImportCrag = {
  key: string; region: string; area: string; group: string; name: string; country: string;
  lat: number | null; lng: number | null; description: string; approach: string;
  /** The position is an estimate. */
  approx?: boolean;
};
export type ImportSector = { key: string; cragKey: string; name: string; lat: number | null; lng: number | null; aspect: string };
export type ImportRoute = {
  key: string; sectorKey: string; name: string; type: RouteType; gradeLabel: string; gradeSystem: GradeSystem;
  gradeIndex: number; lengthM: number | null; bolts: number | null; author: string; year: number | null;
  lat: number | null; lng: number | null; description: string;
};

/** `file` is the file name; `line` counts the header as line 1. */
export type ImportError = { file: string; line: number; message: string };

export type ImportPlan = { crags: ImportCrag[]; sectors: ImportSector[]; routes: ImportRoute[]; errors: ImportError[] };

export const emptyPlan = (): ImportPlan => ({ crags: [], sectors: [], routes: [], errors: [] });

/** A file whose header matches no known format; the caller tells the user which one. */
export class UnknownFileError extends Error {
  constructor(readonly file: string) { super(`Unknown file ${file}`); }
}

/** A route list without some required columns (their Polish names). */
export class MissingColumnsError extends Error {
  constructor(readonly file: string, readonly columns: string[]) { super(`Missing columns in ${file}: ${columns.join(', ')}`); }
}

/**
 * Builds one plan from route-list files (see docs/IMPORT.md), keyed by file name. Several files are merged into one plan;
 * errors name their file. Throws UnknownFileError for a file that is not a route list (a positions file is not either:
 * check detectFormat first) and MissingColumnsError when required columns are missing.
 */
export function planFromFiles(texts: Record<string, string>): ImportPlan {
  const rows: FlatRow[] = [];
  const errors: ImportError[] = [];
  for (const [name, text] of Object.entries(texts)) {
    if (detectFormat(text) !== 'routes') throw new UnknownFileError(name);
    const missing = missingColumns(text);
    if (missing.length) throw new MissingColumnsError(name, missing);
    const fileRows = parseFlatCsv(text);
    // Each file is checked alone so line numbers point into it.
    errors.push(...planFromFlatRows(fileRows).errors.map((e) => ({ ...e, file: name })));
    rows.push(...fileRows);
  }
  if (errors.length) return { ...emptyPlan(), errors };
  return planFromFlatRows(rows);
}
