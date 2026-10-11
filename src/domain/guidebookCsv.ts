// Reads a guidebook export (semicolon CSV with Polish headers, one row per route or boulder) as one-file import rows.
// Layout (agreed with the user for the Czarnorzeki file):
//   "Region" path "Pogórze Dynowskie > Czarnorzeki > Kamieniec" → region Czarnorzeki, area Kamieniec, group = "Rejon" column;
//   path "Pogórze Dynowskie > Czarnorzeki"                     → region Czarnorzeki, area = "Rejon" column, no group;
//   "Skała" "Krowia (ściana zachodnia)"                        → crag Krowia, sector "Ściana zachodnia".
// Keys match the earlier converter, so re-importing moves already imported routes (and keeps their ascents).
import Papa from 'papaparse';
import { slug, type FlatRow } from './flatImport';

type GuideRow = Record<string, string>;

const coord = (s: string | undefined) => {
  const n = Number((s ?? '').replace(',', '.'));
  return Number.isFinite(n) && n !== 0 ? String(n) : '';
};

/** "14 m > Pn.; 12 m > Zach." → ["14 m Pn.", "12 m Zach."] */
function faces(s: string): string[] {
  return s.split(';').map((f) => f.replace(/\s*>\s*/, ' ').trim()).filter(Boolean);
}

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

/** Name used in the keys of the first converter (Kamieniec, or the "Rejon" column elsewhere). */
const legacyRegion = (r: GuideRow) => (/(^|>)\s*Kamieniec\s*$/.test(r.Region ?? '') ? 'Kamieniec' : (r.Rejon ?? '').trim());

export function guidebookRows(text: string): FlatRow[] {
  const rows = Papa.parse<GuideRow>(text.replace(/^﻿/, ''), {
    header: true, delimiter: ';', skipEmptyLines: true, transformHeader: (h) => h.trim(),
  }).data.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, (v ?? '').trim()])) as GuideRow);

  const out: FlatRow[] = [];
  const used = new Set<string>();
  const cragDescriptions = new Map<string, string>();
  for (const r of rows) {
    const rock = r['Skała'] ?? '';
    if (!rock || !r.Nazwa) continue;
    const { crag, sector } = splitWall(rock);
    const old = slug(legacyRegion(r));
    const cragKey = `${old}-${slug(crag)}`;
    const wall = faces(r['Wysokość_i_ekspozycja_ściany'] ?? '');
    // Wall heights and aspects describe the crag (the guidebook gives them per rock, not per route).
    if (!sector && wall.length && !cragDescriptions.has(cragKey)) cragDescriptions.set(cragKey, `Ściany: ${wall.join(', ')}`.replace(/([^.])$/, '$1.'));

    const base = `${old}-${slug(rock)}-${slug(r.Nr_w_przewodniku || r.Nazwa)}`;
    let routeKey = base;
    for (let n = 2; used.has(routeKey); n++) routeKey = `${base}-${n}`;
    used.add(routeKey);

    const boulder = (r.Rodzaj_wyceny ?? '').toLowerCase().startsWith('boulder');
    const height = wall.length === 1 ? /^(\d+(?:[.,]\d+)?)\s*m/.exec(wall[0])?.[1] ?? '' : '';
    out.push({
      ...areasOf(r), crag, sector,
      name: r.Nazwa, type: boulder ? 'boulder' : 'sport', grade: r.Wycena, gradeSystem: boulder ? 'font' : 'kr',
      lengthM: height,
      description: [r.Nr_w_przewodniku ? `Nr ${r.Nr_w_przewodniku}` : '', r.Styl, r.Uwagi].filter(Boolean).join(' · '),
      lat: coord(r['GPS_szerokość']), lng: coord(r['GPS_długość']),
      cragKey, sectorKey: sector ? `${cragKey}-${slug(sector)}` : `${cragKey}-s`, routeKey,
    });
  }
  for (const row of out) row.cragDescription = cragDescriptions.get(row.cragKey!) ?? '';
  return out;
}
