import Papa from 'papaparse';
import { type GradeSystem, type RouteType, parseGrade, systemsFor } from './grades';

export type CsvInput = {
  crags: string;
  sectors?: string;
  routes: string;
  pitches?: string;
};

export type ImportCrag = { key: string; region: string; name: string; country: string; lat: number | null; lng: number | null; description: string; approach: string };
export type ImportSector = { key: string; cragKey: string; name: string; lat: number | null; lng: number | null; aspect: string };
export type ImportRoute = {
  key: string; sectorKey: string; name: string; type: RouteType; gradeLabel: string; gradeSystem: GradeSystem;
  gradeIndex: number; lengthM: number | null; bolts: number | null; author: string; year: number | null;
  lat: number | null; lng: number | null; description: string;
};
export type ImportPitch = { routeKey: string; number: number; gradeLabel: string; gradeSystem: GradeSystem; gradeIndex: number; lengthM: number | null; description: string };

export type ImportError = { file: 'crags' | 'sectors' | 'routes' | 'pitches'; line: number; message: string };

export type ImportPlan = {
  crags: ImportCrag[]; sectors: ImportSector[]; routes: ImportRoute[]; pitches: ImportPitch[];
  errors: ImportError[];
};

type Row = Record<string, string>;

function rows(text: string | undefined): Row[] {
  if (!text || !text.trim()) return [];
  const res = Papa.parse<Row>(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
  return res.data.map((r) => {
    const out: Row = {};
    for (const [k, v] of Object.entries(r)) out[k] = (v ?? '').toString().trim();
    return out;
  });
}

function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const TYPES: RouteType[] = ['sport', 'boulder', 'multipitch'];

/**
 * Validates the CSV files and builds an import plan. Nothing is written here;
 * the caller shows the plan and errors first and applies it only if there are none.
 */
export function buildImportPlan(input: CsvInput): ImportPlan {
  const plan: ImportPlan = { crags: [], sectors: [], routes: [], pitches: [], errors: [] };
  const err = (file: ImportError['file'], line: number, message: string) => plan.errors.push({ file, line, message });

  const cragKeys = new Set<string>();
  rows(input.crags).forEach((r, i) => {
    const line = i + 2;
    if (!r.key || !r.name) return err('crags', line, 'key and name are required');
    if (cragKeys.has(r.key)) return err('crags', line, `duplicate key ${r.key}`);
    cragKeys.add(r.key);
    plan.crags.push({
      key: r.key, region: r.region ?? '', name: r.name, country: r.country ?? '',
      lat: num(r.lat), lng: num(r.lng), description: r.description ?? '', approach: r.approach ?? '',
    });
  });

  const sectorKeys = new Set<string>();
  rows(input.sectors).forEach((r, i) => {
    const line = i + 2;
    if (!r.key || !r.name) return err('sectors', line, 'key and name are required');
    if (!cragKeys.has(r.crag_key)) return err('sectors', line, `unknown crag_key ${r.crag_key}`);
    if (sectorKeys.has(r.key)) return err('sectors', line, `duplicate key ${r.key}`);
    sectorKeys.add(r.key);
    plan.sectors.push({ key: r.key, cragKey: r.crag_key, name: r.name, lat: num(r.lat), lng: num(r.lng), aspect: r.aspect ?? '' });
  });

  const routeKeys = new Map<string, RouteType>();
  rows(input.routes).forEach((r, i) => {
    const line = i + 2;
    if (!r.key || !r.name) return err('routes', line, 'key and name are required');
    if (!sectorKeys.has(r.sector_key)) return err('routes', line, `unknown sector_key ${r.sector_key}`);
    if (routeKeys.has(r.key)) return err('routes', line, `duplicate key ${r.key}`);
    const type = r.type?.toLowerCase() as RouteType;
    if (!TYPES.includes(type)) return err('routes', line, `type must be one of ${TYPES.join(', ')}`);
    const system = (r.grade_system || '').toLowerCase() as GradeSystem;
    if (!systemsFor(type).includes(system)) return err('routes', line, `grade_system ${r.grade_system} is invalid for ${type}`);
    const gradeIndex = parseGrade(r.grade ?? '', system, type);
    if (gradeIndex == null) return err('routes', line, `unknown grade ${r.grade} in system ${system}`);
    routeKeys.set(r.key, type);
    plan.routes.push({
      key: r.key, sectorKey: r.sector_key, name: r.name, type, gradeLabel: r.grade, gradeSystem: system, gradeIndex,
      lengthM: num(r.length_m), bolts: num(r.bolts), author: r.author ?? '', year: num(r.year),
      lat: num(r.lat), lng: num(r.lng), description: r.description ?? '',
    });
  });

  const seen = new Set<string>();
  rows(input.pitches).forEach((r, i) => {
    const line = i + 2;
    const type = routeKeys.get(r.route_key);
    if (!type) return err('pitches', line, `unknown route_key ${r.route_key}`);
    if (type !== 'multipitch') return err('pitches', line, `route ${r.route_key} is not multipitch`);
    const number = num(r.number);
    if (number == null || number < 1 || !Number.isInteger(number)) return err('pitches', line, 'number must be a positive integer');
    const id = `${r.route_key}#${number}`;
    if (seen.has(id)) return err('pitches', line, `duplicate pitch ${id}`);
    seen.add(id);
    const system = (r.grade_system || '').toLowerCase() as GradeSystem;
    if (!systemsFor('multipitch').includes(system)) return err('pitches', line, `grade_system ${r.grade_system} is invalid`);
    const gradeIndex = parseGrade(r.grade ?? '', system, 'multipitch');
    if (gradeIndex == null) return err('pitches', line, `unknown grade ${r.grade} in system ${system}`);
    plan.pitches.push({ routeKey: r.route_key, number, gradeLabel: r.grade, gradeSystem: system, gradeIndex, lengthM: num(r.length_m), description: r.description ?? '' });
  });

  return plan;
}
