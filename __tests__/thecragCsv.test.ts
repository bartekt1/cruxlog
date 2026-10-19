import { detectFormat, planFromFlatRows } from '../src/domain/flatImport';
import { formatGrade, parseGrade } from '../src/domain/grades';
import { theCragGrade, theCragRows } from '../src/domain/thecragCsv';

// Made-up rows in the layout of a theCrag export (no real route data).
const HEADER = 'Region;Sektor;Nazwa;Trudność;Gwiazdki;Styl;Długość (m);Przeloty;Wejścia;Link';
const link = (id: number) => `https://www.thecrag.com/en/climbing/x/route/${id}`;
const FILE = '﻿' + [
  HEADER,
  `Jura;Jura Południowa › Dolina A › Wąwóz B › Grupa C › Skała D;Droga 1;VI.2;1;Sport;18;6;3;${link(1)}`,
  `Jura;Jura Południowa › Dolina A › Wąwóz B › Grupa C › Skała D;Droga 2;VI.4/4+;0;Trad;;;0;${link(2)}`,
  `Jura;Jura Południowa › Dolina A › Wąwóz B;Na ścianie wąwozu;V+ AID:A0;0;Sport;;;0;${link(3)}`,
  `Jura;Jura Północna › Dolina E › Skała F;Droga 3;VI.8;0;Sport;25;10;0;${link(4)}`,
  `Jura;Jura Północna › Dolina E › Skała F;Kamień;6B;0;Boulder;;;0;${link(5)}`,
  `Jura;Jura Północna › Dolina E › Skała F;unnamed 2;VI;0;Sport;;;0;${link(6)}`,
  `Jura;Jura Północna › Dolina E › Skała F;projekt;;0;Sport;;;0;${link(7)}`,
  `Jura;Jura Północna › Dolina E › Skała F;Bez wyceny;;0;Sport;;;0;${link(8)}`,
  `Jura;Jura Północna › Dolina E › Skała F;Lód;M6;0;Ice;;;0;${link(9)}`,
  `Jura;Jura Północna › Dolina E › Skała F;Dziwna;A/B;0;Sport;;;0;${link(10)}`,
  `Slovenský raj;Raj › Veža G;Cesta;7-;0;Sport;14;5;0;${link(11)}`,
  `Slovenský raj;Raj;Na całym rejonie;5+;0;Sport;;;0;${link(12)}`,
  `Skalky;Podskalka;Krátka;{FR} 6a;0;Sport;;;0;${link(13)}`,
].join('\r\n');

describe('theCrag grades', () => {
  it('reads the different notations', () => {
    expect(theCragGrade('VI.1+')).toEqual({ label: 'VI.1+', system: 'kr' });
    expect(theCragGrade('7-')).toEqual({ label: 'VII-', system: 'uiaa' });
    expect(theCragGrade('8/8+')).toEqual({ label: 'VIII/VIII+', system: 'uiaa' });
    expect(theCragGrade('10-')).toEqual({ label: 'X-', system: 'uiaa' });
    expect(theCragGrade('{FR} 8a')).toEqual({ label: '8a', system: 'fr' });
    expect(theCragGrade('FR:7c')).toEqual({ label: '7c', system: 'fr' });
    expect(theCragGrade('YDS:5.12d')).toEqual({ label: '7c', system: 'fr' });
    expect(theCragGrade('YDS_ALT:5.13+')).toEqual({ label: '8a+', system: 'fr' });
    expect(theCragGrade('{FB} POL:VI.5+')).toEqual({ label: 'VI.5+', system: 'kr' });
    expect(theCragGrade('V+ AID:A0')).toEqual({ label: 'V+', system: 'kr' });
    expect(theCragGrade('V - VI')).toEqual({ label: 'V', system: 'kr' });
    expect(theCragGrade('4+ - 5+')).toEqual({ label: 'IV+', system: 'uiaa' });
  });
  it('rejects what is not a free-climbing grade', () => {
    for (const g of ['', 'M6', 'AID:A2', '{FB} 6A', 'A/B', '{FR} 5']) expect(theCragGrade(g)).toBeNull();
  });
  it('knows the grades added on top of the ladder and the lowest ones', () => {
    expect(formatGrade(parseGrade('VI.8', 'kr')!, 'fr')).toBe('8b');
    expect(formatGrade(parseGrade('XI', 'uiaa')!, 'kr')).toBe('VI.8+');
    expect(parseGrade('II+', 'kr')).toBe(0);
    expect(parseGrade('I-', 'kr')).toBe(0);
  });
});

describe('theCrag import', () => {
  const { rows, skipped } = theCragRows(FILE);
  const plan = planFromFlatRows(rows);

  it('is recognised by its header and imports without errors', () => {
    expect(detectFormat(FILE)).toBe('thecrag');
    expect(plan.errors).toEqual([]);
    expect(plan.routes.map((r) => r.name)).toEqual(['Droga 1', 'Droga 2', 'Na ścianie wąwozu', 'Droga 3', 'Cesta', 'Na całym rejonie', 'Krátka']);
  });
  it('counts what it leaves out', () => {
    expect(skipped).toEqual({ boulder: 1, ice: 1, unnamed: 1, project: 1, noGrade: 1, badGrade: 1 });
  });
  it('keeps every level of the path above the crag', () => {
    const d = plan.crags.find((c) => c.name === 'Skała D')!;
    expect(d).toMatchObject({ region: 'Jura', area: 'Jura Południowa', group: 'Dolina A › Wąwóz B › Grupa C' });
    expect(plan.crags.find((c) => c.name === 'Skała F')).toMatchObject({ area: 'Jura Północna', group: 'Dolina E' });
    expect(plan.crags.find((c) => c.name === 'Veža G')).toMatchObject({ region: 'Slovenský raj', area: 'Raj', group: '' });
  });
  it('puts routes of an area with crags below it, or right below the region, into a crag named like the area', () => {
    expect(plan.crags.find((c) => c.name === 'Wąwóz B')).toMatchObject({ area: 'Jura Południowa', group: 'Dolina A › Wąwóz B' });
    expect(plan.crags.find((c) => c.name === 'Raj')).toMatchObject({ region: 'Slovenský raj', area: 'Raj', group: '' });
    expect(plan.crags.find((c) => c.name === 'Podskalka')).toMatchObject({ region: 'Skalky', area: 'Podskalka' });
  });
  it('keeps length, bolts and stable keys from the route links', () => {
    expect(plan.routes.find((r) => r.name === 'Droga 1')).toMatchObject({ key: 'tc-1', lengthM: 18, bolts: 6, gradeSystem: 'kr' });
    expect(plan.routes.find((r) => r.name === 'Droga 2')).toMatchObject({ lengthM: null, bolts: null, gradeLabel: 'VI.4/4+' });
    expect(plan.routes.find((r) => r.name === 'Cesta')).toMatchObject({ gradeLabel: 'VII-', gradeSystem: 'uiaa' });
  });
});
