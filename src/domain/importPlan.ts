// What an import writes: crags, sectors and routes with stable keys. Built from CSV files by planFromFiles,
// written by applyImport (src/db/imports.ts), so there is one writer for every file format.
import { detectFormat, parseFlatCsv, planFromFlatRows, type FlatRow } from './flatImport';
import { type GradeSystem, type RouteType } from './grades';
import { guidebookRows } from './guidebookCsv';
import { theCragRows } from './thecragCsv';

export type ImportCrag = {
  key: string; region: string; area: string; group: string; name: string; country: string;
  lat: number | null; lng: number | null; description: string; approach: string;
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

/**
 * Builds one plan from route-list files (the guidebook export, a theCrag export or the simple table), keyed by file name.
 * Several files are merged into one plan; errors name their file. `skipped` counts rows theCrag files leave out (boulders, ice…).
 * Throws UnknownFileError for a file that is not recognised. Positions files are not route lists: check detectFormat first.
 */
export function planFromFiles(texts: Record<string, string>): { plan: ImportPlan; skipped: number } {
  const rows: FlatRow[] = [];
  const errors: ImportError[] = [];
  let skipped = 0;
  for (const [name, text] of Object.entries(texts)) {
    const format = detectFormat(text);
    if (!format || format === 'positions') throw new UnknownFileError(name);
    let fileRows: FlatRow[];
    if (format === 'thecrag') {
      const res = theCragRows(text);
      fileRows = res.rows;
      skipped += Object.values(res.skipped).reduce((a, b) => a + b, 0);
    } else fileRows = format === 'guidebook' ? guidebookRows(text) : parseFlatCsv(text);
    // Each file is checked alone so line numbers point into it.
    errors.push(...planFromFlatRows(fileRows).errors.map((e) => ({ ...e, file: name })));
    rows.push(...fileRows);
  }
  if (errors.length) return { plan: { ...emptyPlan(), errors }, skipped };
  return { plan: planFromFlatRows(rows), skipped };
}
