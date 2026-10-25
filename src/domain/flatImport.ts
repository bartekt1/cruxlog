// The one import format: a CSV file with one row per route and the whole path (region, area, group, crag, sector).
// Columns are found by their header names, in any order; unknown columns are ignored. See docs/IMPORT.md.
// Builds an ImportPlan, so applyImport stays the single writer.
import Papa from 'papaparse';
import { emptyPlan, type ImportPlan } from './importPlan';
import { parseGrade, systemsFor, type GradeSystem, type RouteType } from './grades';
import { fold, sameName } from './text';

export type FlatRow = {
  region: string; area: string; group: string; crag: string; sector: string;
  name: string; type: string; grade: string; gradeSystem: string;
  lengthM?: string; bolts?: string; description?: string; cragDescription?: string; lat?: string; lng?: string;
  /** First ascent: who and when. */
  author?: string; year?: string;
  approach?: string;
  /** Stable keys keep re-imports updating the same crags, sectors and routes (and their ascents). */
  cragKey?: string; sectorKey?: string; routeKey?: string;
  /** The crag's position is an estimate (yes/tak/1). */
  approx?: string;
};

export const slug = (s: string) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const num = (v: string | undefined) => {
  const n = Number((v ?? '').trim().replace(',', '.'));
  return v && v.trim() && Number.isFinite(n) ? n : null;
};

const YES = /^(1|yes|y|tak|t|true)$/i;
const year = (v: string | undefined) => {
  const n = Number((v ?? '').trim());
  return Number.isInteger(n) && n > 1800 && n < 2200 ? n : null;
};

const TYPE_ALIASES: Record<string, RouteType> = {
  sport: 'sport', droga: 'sport', route: 'sport', multipitch: 'multipitch', 'wielowyciąg': 'multipitch', wielowyciag: 'multipitch',
};

/** Builds an import plan; problems are reported per data line (header = line 1). */
export function planFromFlatRows(rows: FlatRow[]): ImportPlan {
  const plan = emptyPlan();
  const crags = new Map<string, ImportPlan['crags'][number]>();
  const sectors = new Map<string, ImportPlan['sectors'][number]>();
  const routeKeys = new Set<string>();

  rows.forEach((r, i) => {
    const line = i + 2;
    const err = (message: string) => plan.errors.push({ file: 'routes', line, message });
    if (fold(r.type) === 'boulder') return; // the app has no boulders; such rows are skipped
    if (!r.region.trim()) return err('region is required');
    if (!r.area.trim()) return err('area (rejon) is required');
    if (!r.crag.trim()) return err('crag is required');
    if (!r.name.trim()) return err('name is required');
    const type = TYPE_ALIASES[fold(r.type || 'sport')];
    if (!type) return err(`unknown type ${r.type}`);
    const system = (r.gradeSystem || 'kr').trim().toLowerCase() as GradeSystem;
    if (!systemsFor(type).includes(system)) return err(`grade system ${r.gradeSystem} is invalid for ${type}`);
    const gradeIndex = parseGrade(r.grade, system, type);
    if (gradeIndex == null) return err(`unknown grade ${r.grade} in ${system}`);

    const cragKey = r.cragKey || [r.region, r.area, r.group, r.crag].filter((x) => x.trim()).map(slug).join('-');
    const existing = crags.get(cragKey);
    if (!existing) {
      crags.set(cragKey, {
        key: cragKey, region: r.region.trim(), area: r.area.trim(), group: r.group.trim(), name: r.crag.trim(), country: '',
        lat: num(r.lat), lng: num(r.lng), approx: YES.test((r.approx ?? '').trim()),
        description: r.cragDescription?.trim() ?? '', approach: r.approach?.trim() ?? '',
      });
    } else if (!sameName(existing.name, r.crag)) {
      return err(`crag key ${cragKey} is used for two crags`);
    } else {
      // Crag facts may be in any one of its rows (usually the first): the first filled-in value counts.
      if (existing.lat == null && num(r.lat) != null && num(r.lng) != null) {
        existing.lat = num(r.lat); existing.lng = num(r.lng); existing.approx = YES.test((r.approx ?? '').trim());
      }
      if (!existing.description && r.cragDescription?.trim()) existing.description = r.cragDescription.trim();
      if (!existing.approach && r.approach?.trim()) existing.approach = r.approach.trim();
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
      lengthM: num(r.lengthM), bolts: num(r.bolts), author: r.author?.trim() ?? '', year: year(r.year), lat: null, lng: null,
      description: r.description?.trim() ?? '',
    });
  });

  plan.crags = [...crags.values()];
  plan.sectors = [...sectors.values()];
  return plan;
}

// Header names (English or Polish, any case, Polish letters optional, spaces or hyphens as underscores).
const HEADERS: Record<string, keyof FlatRow> = {
  region: 'region', area: 'area', rejon: 'area', group: 'group', grupa: 'group', crag: 'crag', skala: 'crag',
  sector: 'sector', sektor: 'sector', name: 'name', nazwa: 'name', route: 'name', droga: 'name', type: 'type', typ: 'type',
  grade: 'grade', wycena: 'grade', grade_system: 'gradeSystem', system: 'gradeSystem', skala_wycen: 'gradeSystem',
  length_m: 'lengthM', dlugosc: 'lengthM', length: 'lengthM', bolts: 'bolts', przeloty: 'bolts', description: 'description', opis: 'description',
  crag_description: 'cragDescription', opis_skaly: 'cragDescription', lat: 'lat', lng: 'lng',
  latitude: 'lat', longitude: 'lng', lon: 'lng', szerokosc: 'lat', dlugosc_geograficzna: 'lng',
  approx: 'approx', approximate: 'approx', przyblizone: 'approx', przyblizona: 'approx',
  author: 'author', autor: 'author', year: 'year', rok: 'year', approach: 'approach', dojscie: 'approach',
  key: 'routeKey', route_id: 'routeKey', id_drogi: 'routeKey', crag_key: 'cragKey', crag_id: 'cragKey', key_skaly: 'cragKey', id_skaly: 'cragKey',
};

/** The columns a route list must have, by the names shown to the user. */
const REQUIRED: [keyof FlatRow, string][] = [['region', 'Region'], ['area', 'Rejon'], ['crag', 'Skała'], ['name', 'Nazwa'], ['grade', 'Wycena']];
const headerKey = (h: string) => fold(h).replace(/[\s-]+/g, '_');

export type ImportFormat = 'routes' | 'positions';

const headerColumns = (text: string) =>
  new Set((text.replace(/^\ufeff/, '').split(/\r?\n/, 1)[0] ?? '').split(/[;,\t]/).map((h) => HEADERS[headerKey(h.replace(/^"|"$/g, ''))]).filter(Boolean));

/**
 * Recognises a file by its header line: a route list (it has a route name or a grade column) or a file of crag positions only
 * (crag or crag id, lat, lng). null when it is neither.
 */
export function detectFormat(text: string): ImportFormat | null {
  const mapped = headerColumns(text);
  if (mapped.has('name') || mapped.has('grade')) return 'routes';
  if ((mapped.has('crag') || mapped.has('cragKey')) && mapped.has('lat') && mapped.has('lng')) return 'positions';
  return null;
}

/** The required columns a route list lacks, by their Polish names (e.g. ["Rejon", "Wycena"]). */
export function missingColumns(text: string): string[] {
  const mapped = headerColumns(text);
  return REQUIRED.filter(([key]) => !mapped.has(key)).map(([, label]) => label);
}

/** Reads the simple one-file format; the separator (comma, semicolon or tab) is detected. */
export function parseFlatCsv(text: string): FlatRow[] {
  const data = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true, skipEmptyLines: true, transformHeader: (h) => HEADERS[headerKey(h)] ?? `_${h}`,
  }).data;
  return data.map((r) => ({
    region: r.region ?? '', area: r.area ?? '', group: r.group ?? '', crag: r.crag ?? '', sector: r.sector ?? '',
    name: r.name ?? '', type: r.type ?? '', grade: r.grade ?? '', gradeSystem: r.gradeSystem ?? '',
    lengthM: r.lengthM, bolts: r.bolts, description: r.description, cragDescription: r.cragDescription, lat: r.lat, lng: r.lng,
    author: r.author, year: r.year, approach: r.approach, approx: r.approx, cragKey: r.cragKey, routeKey: r.routeKey,
  }));
}

/** A file with only crag positions: crag key and/or crag name, lat, lng, optionally approx. Rows without a valid position are dropped. */
export function parsePositionsCsv(text: string): { key: string; name: string; lat: number; lng: number; approx: boolean }[] {
  const data = Papa.parse<Record<string, string>>(text.replace(/^\ufeff/, ''), {
    header: true, skipEmptyLines: true, transformHeader: (h) => HEADERS[headerKey(h)] ?? `_${h}`,
  }).data;
  return data.flatMap((r) => {
    const lat = num(r.lat);
    const lng = num(r.lng);
    const ok = lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
    return ok && (r.cragKey?.trim() || r.crag?.trim()) ? [{ key: (r.cragKey ?? '').trim(), name: (r.crag ?? '').trim(), lat, lng, approx: YES.test((r.approx ?? '').trim()) }] : [];
  });
}
