// Reads a route list exported from theCrag (semicolon CSV: Region;Sektor;Nazwa;Trudność;…;Długość (m);Przeloty;…;Link)
// as one-file import rows. "Sektor" is the whole path below the region, e.g.
// "Jura Południowa › Garb Tenczyński › Dolina Sanki › Zimny Dół › Grupa Labiryntu › Skała z Grotą": the last part is the
// crag, everything above it becomes areas (region, area, then groups at any depth).
// Left out, as agreed with the user: boulders, ice and mixed, via ferratas, unnamed routes, projects, routes without
// a grade and grades the app cannot read.
import Papa from 'papaparse';
import { PATH_SEP, splitPath } from './areas';
import { slug, type FlatRow } from './flatImport';
import { parseGrade, type GradeSystem } from './grades';
import { fold } from './text';

type Row = Record<string, string>;

export type SkipReason = 'boulder' | 'ice' | 'unnamed' | 'project' | 'noGrade' | 'badGrade';
export type TheCragResult = { rows: FlatRow[]; skipped: Record<SkipReason, number> };

const SKIPPED_STYLES: Record<string, SkipReason> = { boulder: 'boulder', ice: 'ice', 'via ferrata': 'ice' };
const UNNAMED = /^(unnamed|bez nazwy)(\s*\d+)?$/i;
const PROJECT = /^projekt\b/i;

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// YDS letter grades to French, the usual conversion table.
const YDS: Record<string, string> = {
  '5.9': '5c', '5.10a': '6a', '5.10b': '6a+', '5.10c': '6b', '5.10d': '6b+', '5.11a': '6c', '5.11b': '6c+', '5.11c': '7a',
  '5.11d': '7a+', '5.12a': '7a+', '5.12b': '7b', '5.12c': '7b+', '5.12d': '7c', '5.13a': '7c+', '5.13b': '8a', '5.13c': '8a+',
  '5.13d': '8b', '5.14a': '8b+',
};

/** "5.13" → "5.13a", "5.13+" → "5.13c", "5.11-" → "5.11a". */
function ydsToFrench(s: string): string | null {
  const m = /^(5\.\d+)([abcd]|[+-])?/i.exec(s.trim());
  if (!m) return null;
  const n = Number(m[1].slice(2));
  const suffix = n < 10 ? '' : !m[2] || m[2] === '-' ? 'a' : m[2] === '+' ? 'c' : m[2].toLowerCase();
  return YDS[`${m[1]}${suffix}`] ?? null;
}

/** "7-" → "VII-", "8/8+" → "VIII/VIII+": UIAA written with digits, as on Slovak crags. */
function uiaaFromDigits(s: string): string | null {
  const parts = s.split('/').map((p) => /^(\d+)([+-]?)$/.exec(p.trim()));
  if (parts.some((m) => !m || !ROMAN[Number(m[1])])) return null;
  return parts.map((m) => ROMAN[Number(m![1])] + m![2]).join('/');
}

/**
 * A grade as theCrag writes it → label and system the app understands, or null.
 * Handles "{FR} 8a", "FR:7c", "YDS:5.12d", "{FB} POL:VI.5+", "V+ AID:A0", "V - VI" and Slovak "7-".
 */
export function theCragGrade(raw: string): { label: string; system: GradeSystem } | null {
  let s = raw.trim();
  if (!s || /^M\d/i.test(s)) return null; // empty, or ice/mixed
  s = s.replace(/\s*AID:\S+/gi, '').trim(); // aid part of a mostly free route
  if (!s) return null;
  let system: GradeSystem | null = null;
  const prefix = /^(?:\{(FR|FB)\}\s*|(FR|YDS|YDS_ALT|POL|UIAA):)(.*)$/i.exec(s);
  if (prefix) {
    const tag = (prefix[1] ?? prefix[2]).toUpperCase();
    s = prefix[3].trim();
    if (tag === 'FB') {
      const pol = /^POL:(.*)$/i.exec(s); // "{FB} POL:VI.5+" is a Polish grade
      if (!pol) return null; // a boulder grade
      s = pol[1].trim();
      system = 'kr';
    } else if (tag === 'FR') system = 'fr';
    else if (tag === 'POL') system = 'kr';
    else if (tag === 'UIAA') system = 'uiaa';
    else {
      const fr = ydsToFrench(s);
      if (!fr) return null;
      s = fr;
      system = 'fr';
    }
  }
  s = s.split(/\s+-\s+/)[0].trim(); // "V - VI": the lower grade
  if (!system) {
    if (/^\d+[abc]/i.test(s)) system = 'fr';
    else if (/^\d/.test(s)) {
      const roman = uiaaFromDigits(s);
      if (!roman) return null;
      s = roman;
      system = 'uiaa';
    } else system = 'kr';
  }
  return parseGrade(s, system) == null ? null : { label: s, system };
}

const num = (v: string | undefined) => (v ?? '').trim().replace(',', '.');

export function theCragRows(text: string): TheCragResult {
  const data = Papa.parse<Row>(text.replace(/^﻿/, ''), {
    header: true, delimiter: ';', skipEmptyLines: true, transformHeader: (h) => fold(h).replace(/\s*\(m\)$/, '').trim(),
  }).data;
  const skipped: Record<SkipReason, number> = { boulder: 0, ice: 0, unnamed: 0, project: 0, noGrade: 0, badGrade: 0 };

  // Full paths (region first) of every row, to spot routes attached to an area that also has crags below it.
  const pathOf = (r: Row) => [(r.region ?? '').trim(), ...splitPath(r.sektor ?? '')].filter(Boolean);
  const inner = new Set<string>();
  for (const r of data) {
    const p = pathOf(r);
    for (let i = 1; i < p.length; i++) inner.add(p.slice(0, i).join(PATH_SEP));
  }

  const rows: FlatRow[] = [];
  const used = new Set<string>();
  for (const r of data) {
    const name = (r.nazwa ?? '').trim();
    const style = SKIPPED_STYLES[fold(r.styl ?? '')];
    if (style) { skipped[style]++; continue; }
    if (!name || UNNAMED.test(name)) { skipped.unnamed++; continue; }
    if (PROJECT.test(name)) { skipped.project++; continue; }
    if (!(r.trudnosc ?? '').trim()) { skipped.noGrade++; continue; }
    const grade = theCragGrade(r.trudnosc);
    if (!grade) { skipped.badGrade++; continue; }

    const path = pathOf(r);
    if (!path.length) { skipped.unnamed++; continue; }
    // The last part is the crag. Routes on an area with crags below it, or right below the region, get a crag
    // named like that area inside it.
    const areas = inner.has(path.join(PATH_SEP)) || path.length <= 2 ? path : path.slice(0, -1);
    const crag = path[path.length - 1];
    const cragKey = `tc-${slug(path.join(' '))}`;
    const id = /\/route\/(\d+)/.exec(r.link ?? '')?.[1];
    const base = id ? `tc-${id}` : `${cragKey}-${slug(name)}`;
    let routeKey = base;
    for (let n = 2; used.has(routeKey); n++) routeKey = `${base}-${n}`;
    used.add(routeKey);

    rows.push({
      region: areas[0], area: areas[1] ?? areas[0], group: areas.slice(2).join(` ${PATH_SEP} `), crag, sector: '',
      name, type: 'sport', grade: grade.label, gradeSystem: grade.system,
      lengthM: num(r.dlugosc), bolts: num(r.przeloty),
      cragKey, sectorKey: `${cragKey}-s`, routeKey,
    });
  }
  return { rows, skipped };
}
