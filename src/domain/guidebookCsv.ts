// Reads a guidebook export (semicolon CSV with Polish headers, one row per route or boulder) as one-file import rows.
// Layout (agreed with the user for the Czarnorzeki file):
//   "Region" path "Pogórze Dynowskie > Czarnorzeki > Kamieniec" → region Czarnorzeki, area Kamieniec, group = "Rejon" column;
//   path "Pogórze Dynowskie > Czarnorzeki"                     → region Czarnorzeki, area = "Rejon" column, no group;
//   "Skała" "Krowia (ściana zachodnia)"                        → crag Krowia, sector "Ściana zachodnia".
// Only names, grades and places are kept (the user's choice): boulders, unnamed routes and routes closed to climbing
// are left out, and so are notes, styles, guidebook numbers and wall heights or aspects.
// Keys match the earlier converter, so re-importing moves already imported routes (and keeps their ascents).
import Papa from 'papaparse';
import { slug, type FlatRow } from './flatImport';

type GuideRow = Record<string, string>;

const coord = (s: string | undefined) => {
  const n = Number((s ?? '').replace(',', '.'));
  return Number.isFinite(n) && n !== 0 ? String(n) : '';
};

/** Splits "Krowia (ściana zachodnia)" into the crag and a wall sector. */
export function splitWall(rock: string): { crag: string; sector: string } {
  const m = /^(.*?)\s*\((ściana [^)]+)\)\s*$/i.exec(rock.trim());
  if (!m) return { crag: rock.trim(), sector: '' };
  return { crag: m[1].trim(), sector: m[2].charAt(0).toUpperCase() + m[2].slice(1) };
}

export function areasOf(r: GuideRow): { region: string; area: string; group: string } {
  const parts = (r.Region ?? '').split('>').map((p) => p.trim()).filter(Boolean);
  const column = (r.Rejon ?? '').trim();
  const region = parts[1] ?? parts[0] ?? column;
  return parts.length >= 3 ? { region, area: parts[2], group: column } : { region, area: column, group: '' };
}

const isBoulder = (r: GuideRow) => (r.Rodzaj_wyceny ?? '').toLowerCase().startsWith('boulder');
const UNNAMED = /^\(?bez nazwy\)?$/i;
const CLOSED = /zakaz wspinania/i;

/** Name used in the keys of the first converter (Kamieniec, or the "Rejon" column elsewhere). */
const legacyRegion = (r: GuideRow) => (/(^|>)\s*Kamieniec\s*$/.test(r.Region ?? '') ? 'Kamieniec' : (r.Rejon ?? '').trim());

export function guidebookRows(text: string): FlatRow[] {
  const rows = Papa.parse<GuideRow>(text.replace(/^﻿/, ''), {
    header: true, delimiter: ';', skipEmptyLines: true, transformHeader: (h) => h.trim(),
  }).data.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, (v ?? '').trim()])) as GuideRow);

  const out: FlatRow[] = [];
  const used = new Set<string>();
  for (const r of rows) {
    const rock = r['Skała'] ?? '';
    if (!rock || !r.Nazwa) continue;
    // Keys count the left-out rows too, so they stay the same as in the first converter.
    const skip = isBoulder(r) || UNNAMED.test(r.Nazwa) || CLOSED.test(r.Uwagi ?? '');
    const { crag, sector } = splitWall(rock);
    const old = slug(legacyRegion(r));
    const cragKey = `${old}-${slug(crag)}`;
    const base = `${old}-${slug(rock)}-${slug(r.Nr_w_przewodniku || r.Nazwa)}`;
    let routeKey = base;
    for (let n = 2; used.has(routeKey); n++) routeKey = `${base}-${n}`;
    used.add(routeKey);
    if (skip) continue;

    out.push({
      ...areasOf(r), crag, sector,
      name: r.Nazwa, type: 'sport', grade: r.Wycena, gradeSystem: 'kr',
      lat: coord(r['GPS_szerokość']), lng: coord(r['GPS_długość']),
      cragKey, sectorKey: sector ? `${cragKey}-${slug(sector)}` : `${cragKey}-s`, routeKey,
    });
  }
  return out;
}
