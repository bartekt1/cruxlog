// Converts a guidebook-style export (semicolon CSV with Polish headers, one row per route or boulder)
// into the app's import files (crags.csv, sectors.csv, routes.csv). Hierarchy:
//   region = the "Rejon" group, except groups inside Kamieniec, which share the region "Kamieniec";
//   crag   = "Skała"; one sector per crag named like the crag (the app's "no sector").
import Papa from 'papaparse';
import { fold } from './text';

type GuideRow = Record<string, string>;

export type ConvertedGuidebook = { crags: string; sectors: string; routes: string; counts: { regions: number; crags: number; routes: number; boulders: number } };

const slug = (s: string) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const coord = (s: string | undefined) => {
  const n = Number((s ?? '').replace(',', '.'));
  return Number.isFinite(n) && n !== 0 ? String(n) : '';
};

/** "14 m > Pn.; 12 m > Zach." → ["14 m Pn.", "12 m Zach."] */
function faces(s: string): string[] {
  return s.split(';').map((f) => f.replace(/\s*>\s*/, ' ').trim()).filter(Boolean);
}

export function regionOf(r: GuideRow): string {
  return /(^|>)\s*Kamieniec\s*$/.test(r.Region ?? '') ? 'Kamieniec' : (r.Rejon ?? '').trim();
}

export function convertGuidebook(text: string): ConvertedGuidebook {
  const rows = Papa.parse<GuideRow>(text.replace(/^﻿/, ''), {
    header: true, delimiter: ';', skipEmptyLines: true, transformHeader: (h) => h.trim(),
  }).data.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, (v ?? '').trim()])) as GuideRow);

  const crags = new Map<string, Record<string, string>>();
  const routes: Record<string, string>[] = [];
  const routeKeys = new Set<string>();
  let boulders = 0;

  for (const r of rows) {
    const region = regionOf(r);
    const cragName = r['Skała'];
    if (!region || !cragName || !r.Nazwa) continue;
    const cragKey = `${slug(region)}-${slug(cragName)}`;
    if (!crags.has(cragKey)) {
      const wall = faces(r['Wysokość_i_ekspozycja_ściany'] ?? '');
      const description = [
        region === 'Kamieniec' && r.Rejon ? `Grupa: ${r.Rejon}.` : '',
        wall.length ? `Ściany: ${wall.join(', ')}`.replace(/([^.])$/, '$1.') : '',
      ].filter(Boolean).join(' ');
      crags.set(cragKey, {
        key: cragKey, region, name: cragName, country: 'PL',
        lat: coord(r['GPS_szerokość']), lng: coord(r['GPS_długość']), description, approach: '',
      });
    }

    const boulder = (r.Rodzaj_wyceny ?? '').toLowerCase().startsWith('boulder');
    if (boulder) boulders++;
    // The guidebook number keeps routes with the same name (e.g. several "(bez nazwy)") apart.
    let key = `${cragKey}-${slug(r.Nr_w_przewodniku || r.Nazwa)}`;
    for (let n = 2; routeKeys.has(key); n++) key = `${cragKey}-${slug(r.Nr_w_przewodniku || r.Nazwa)}-${n}`;
    routeKeys.add(key);

    const wall = faces(r['Wysokość_i_ekspozycja_ściany'] ?? '');
    const height = wall.length === 1 ? /^(\d+(?:[.,]\d+)?)\s*m/.exec(wall[0])?.[1]?.replace(',', '.') ?? '' : '';
    routes.push({
      key, sector_key: `${cragKey}-s`, name: r.Nazwa,
      type: boulder ? 'boulder' : 'sport', grade: r.Wycena, grade_system: boulder ? 'font' : 'kr',
      length_m: height, bolts: '', author: '', year: '', lat: '', lng: '',
      description: [r.Nr_w_przewodniku ? `Nr ${r.Nr_w_przewodniku}` : '', r.Styl, r.Uwagi].filter(Boolean).join(' · '),
    });
  }

  const cragList = [...crags.values()];
  return {
    crags: Papa.unparse(cragList, { columns: ['key', 'region', 'name', 'country', 'lat', 'lng', 'description', 'approach'] }),
    sectors: Papa.unparse(cragList.map((c) => ({ key: `${c.key}-s`, crag_key: c.key, name: c.name, lat: '', lng: '', aspect: '' })),
      { columns: ['key', 'crag_key', 'name', 'lat', 'lng', 'aspect'] }),
    routes: Papa.unparse(routes, {
      columns: ['key', 'sector_key', 'name', 'type', 'grade', 'grade_system', 'length_m', 'bolts', 'author', 'year', 'lat', 'lng', 'description'],
    }),
    counts: { regions: new Set(cragList.map((c) => c.region)).size, crags: cragList.length, routes: routes.length - boulders, boulders },
  };
}
