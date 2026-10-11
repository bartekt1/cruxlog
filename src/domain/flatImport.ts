// One-file import: one row per route with the whole path (region, area, group, crag, sector).
// Builds the same ImportPlan as the three-file CSV import, so applyImport stays the single writer.
import Papa from 'papaparse';
import type { ImportPlan } from './csvImport';
import { parseGrade, systemsFor, type GradeSystem, type RouteType } from './grades';
import { fold, sameName } from './text';

export type FlatRow = {
  region: string; area: string; group: string; crag: string; sector: string;
  name: string; type: string; grade: string; gradeSystem: string;
  lengthM?: string; description?: string; cragDescription?: string; lat?: string; lng?: string;
  /** Stable keys keep re-imports updating the same crags, sectors and routes (and their ascents). */
  cragKey?: string; sectorKey?: string; routeKey?: string;
};

export const slug = (s: string) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const num = (v: string | undefined) => {
  const n = Number((v ?? '').trim().replace(',', '.'));
  return v && v.trim() && Number.isFinite(n) ? n : null;
};

const TYPE_ALIASES: Record<string, RouteType> = {
  sport: 'sport', droga: 'sport', route: 'sport', boulder: 'boulder', multipitch: 'multipitch', 'wielowyciąg': 'multipitch', wielowyciag: 'multipitch',
};

/** Builds an import plan; problems are reported per data line (header = line 1). */
export function planFromFlatRows(rows: FlatRow[]): ImportPlan {
  const plan: ImportPlan = { crags: [], sectors: [], routes: [], pitches: [], errors: [] };
  const crags = new Map<string, ImportPlan['crags'][number]>();
  const sectors = new Map<string, ImportPlan['sectors'][number]>();
  const routeKeys = new Set<string>();

  rows.forEach((r, i) => {
    const line = i + 2;
    const err = (message: string) => plan.errors.push({ file: 'routes', line, message });
    if (!r.region.trim()) return err('region is required');
    if (!r.area.trim()) return err('area (rejon) is required');
    if (!r.crag.trim()) return err('crag is required');
    if (!r.name.trim()) return err('name is required');
    const type = TYPE_ALIASES[fold(r.type || 'sport')];
    if (!type) return err(`unknown type ${r.type}`);
    const system = (r.gradeSystem || (type === 'boulder' ? 'font' : 'kr')).trim().toLowerCase() as GradeSystem;
    if (!systemsFor(type).includes(system)) return err(`grade system ${r.gradeSystem} is invalid for ${type}`);
    const gradeIndex = parseGrade(r.grade, system, type);
    if (gradeIndex == null) return err(`unknown grade ${r.grade} in ${system}`);

    const cragKey = r.cragKey || [r.region, r.area, r.group, r.crag].filter((x) => x.trim()).map(slug).join('-');
    const existing = crags.get(cragKey);
    if (!existing) {
      crags.set(cragKey, {
        key: cragKey, region: r.region.trim(), area: r.area.trim(), group: r.group.trim(), name: r.crag.trim(), country: '',
        lat: num(r.lat), lng: num(r.lng), description: r.cragDescription?.trim() ?? '', approach: '',
      });
    } else if (!sameName(existing.name, r.crag)) {
      return err(`crag key ${cragKey} is used for two crags`);
    }
    // No sector: the route goes to a sector named like the crag, the app's "no sector".
    const sectorName = r.sector.trim() || r.crag.trim();
    const sectorKey = r.sectorKey || (r.sector.trim() ? `${cragKey}-${slug(r.sector)}` : `${cragKey}-s`);
    if (!sectors.has(sectorKey)) sectors.set(sectorKey, { key: sectorKey, cragKey, name: sectorName, lat: null, lng: null, aspect: '' });

    let key = r.routeKey || `${cragKey}-${slug(r.sector)}-${slug(r.name)}`;
    for (let n = 2; routeKeys.has(key); n++) key = `${r.routeKey || `${cragKey}-${slug(r.sector)}-${slug(r.name)}`}-${n}`;
    routeKeys.add(key);
    plan.routes.push({
      key, sectorKey, name: r.name.trim(), type, gradeLabel: r.grade.trim(), gradeSystem: system, gradeIndex,
      lengthM: num(r.lengthM), bolts: null, author: '', year: null, lat: null, lng: null, description: r.description?.trim() ?? '',
    });
  });

  plan.crags = [...crags.values()];
  plan.sectors = [...sectors.values()];
  return plan;
}

// Header names accepted in the simple one-file format (English or Polish, any case, Polish letters optional).
const HEADERS: Record<string, keyof FlatRow> = {
  region: 'region', area: 'area', rejon: 'area', group: 'group', grupa: 'group', crag: 'crag', skala: 'crag',
  sector: 'sector', sektor: 'sector', name: 'name', nazwa: 'name', route: 'name', droga: 'name', type: 'type', typ: 'type',
  grade: 'grade', wycena: 'grade', grade_system: 'gradeSystem', system: 'gradeSystem', skala_wycen: 'gradeSystem',
  length_m: 'lengthM', dlugosc: 'lengthM', length: 'lengthM', description: 'description', opis: 'description',
  crag_description: 'cragDescription', opis_skaly: 'cragDescription', lat: 'lat', lng: 'lng', key: 'routeKey',
};
const headerKey = (h: string) => fold(h).replace(/[\s-]+/g, '_');

export type ImportFormat = 'guidebook' | 'flat';

/** Recognises a file by its header line. */
export function detectFormat(text: string): ImportFormat | null {
  const first = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
  const cols = first.split(/[;,\t]/).map(headerKey);
  if (cols.includes('rodzaj_wyceny') && cols.includes('wycena') && cols.includes('skala')) return 'guidebook';
  const mapped = new Set(cols.map((c) => HEADERS[c]).filter(Boolean));
  if (mapped.has('crag') && mapped.has('name') && mapped.has('grade')) return 'flat';
  return null;
}

/** Reads the simple one-file format; the separator (comma, semicolon or tab) is detected. */
export function parseFlatCsv(text: string): FlatRow[] {
  const data = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true, skipEmptyLines: true, transformHeader: (h) => HEADERS[headerKey(h)] ?? `_${h}`,
  }).data;
  return data.map((r) => ({
    region: r.region ?? '', area: r.area ?? '', group: r.group ?? '', crag: r.crag ?? '', sector: r.sector ?? '',
    name: r.name ?? '', type: r.type ?? '', grade: r.grade ?? '', gradeSystem: r.gradeSystem ?? '',
    lengthM: r.lengthM, description: r.description, cragDescription: r.cragDescription, lat: r.lat, lng: r.lng, routeKey: r.routeKey,
  }));
}
