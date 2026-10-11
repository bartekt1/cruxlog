import { detectFormat, parseFlatCsv, planFromFlatRows } from '../src/domain/flatImport';
import { guidebookRows, splitWall } from '../src/domain/guidebookCsv';

const HEADER = 'Rodzaj_wyceny;Wycena;Nazwa;Nr_w_przewodniku;Region;Rejon;Skała;Wysokość_i_ekspozycja_ściany;Styl;Uwagi;GPS_szerokość;GPS_długość;GPS_oryginał;GPS_poziom';
const KR = 'Droga wspinaczkowa – skala polska (Kurtyki)';
const FONT = 'Boulder – skala Fontainebleau';
const KAM = 'Pogórze Dynowskie > Czarnorzeki > Kamieniec';
const CZ = 'Pogórze Dynowskie > Czarnorzeki';
const FILE = '﻿' + [
  HEADER,
  `${KR};V;Lewa rysa Fredry;1;${KAM};Grupa Słonecznej Turni;Lewe i Prawe Zamczysko;18 m > Pn.;trad;;49,7425;21,785278;x;rejon`,
  `${KR};VI.4/4+;Blitzkrieg;16;${KAM};Grupa Słonecznej Turni;Narożna;"14 m > Pn.; 12 m > Zach.";;bez kantów;49,7425;21,785278;x;rejon`,
  `${KR};VI.1;Krowa;30;${KAM};Krowia Turnia;Krowia;12 m > Pn.;;;49,74;21,79;x;rejon`,
  `${KR};VI.2;Zachód;31;${KAM};Krowia Turnia;Krowia (ściana zachodnia);10 m > Zach.;;;49,74;21,79;x;rejon`,
  `${KR};VI+;(bez nazwy);40;${CZ};Strzelnica;Okapik;8 m > Zach.;;;49,74;21,8;x;rejon`,
  `${KR};VI-;(bez nazwy);41;${CZ};Strzelnica;Okapik;8 m > Zach.;;;49,74;21,8;x;rejon`,
  `${FONT};8A+;Puchacz;175;${CZ};Sokoli Grzbiet;Samotnik;3 m > Zach.;SD;;49,7425;21,825556;x;rejon`,
].join('\r\n');

describe('guidebook import', () => {
  const rows = guidebookRows(FILE);
  const plan = planFromFlatRows(rows);

  it('is recognised by its header and imports without errors', () => {
    expect(detectFormat(FILE)).toBe('guidebook');
    expect(plan.errors).toEqual([]);
    expect(plan.routes).toHaveLength(7);
  });
  it('maps the path to region, area and group', () => {
    const krowia = plan.crags.find((c) => c.name === 'Krowia')!;
    expect(krowia).toMatchObject({ region: 'Czarnorzeki', area: 'Kamieniec', group: 'Krowia Turnia', description: 'Ściany: 12 m Pn.' });
    expect(plan.crags.find((c) => c.name === 'Okapik')).toMatchObject({ region: 'Czarnorzeki', area: 'Strzelnica', group: '' });
    expect(plan.crags.map((c) => c.name)).toEqual(['Lewe i Prawe Zamczysko', 'Narożna', 'Krowia', 'Okapik', 'Samotnik']);
  });
  it('turns a wall in brackets into a sector of the crag', () => {
    expect(splitWall('Krowia (ściana zachodnia)')).toEqual({ crag: 'Krowia', sector: 'Ściana zachodnia' });
    expect(splitWall('Okapik')).toEqual({ crag: 'Okapik', sector: '' });
    const west = plan.routes.find((r) => r.name === 'Zachód')!;
    expect(plan.sectors.find((s) => s.key === west.sectorKey)).toMatchObject({ name: 'Ściana zachodnia', cragKey: 'kamieniec-krowia' });
  });
  it('keeps the keys of the first converter so re-imports update the same routes', () => {
    expect(plan.routes.find((r) => r.name === 'Lewa rysa Fredry')!.key).toBe('kamieniec-lewe-i-prawe-zamczysko-1');
    expect(plan.routes.find((r) => r.name === 'Zachód')!.key).toBe('kamieniec-krowia-sciana-zachodnia-31');
    expect(plan.routes.find((r) => r.name === 'Puchacz')!.key).toBe('sokoli-grzbiet-samotnik-175');
    expect(new Set(plan.routes.map((r) => r.key)).size).toBe(7);
  });
  it('keeps guidebook details', () => {
    expect(plan.routes.find((r) => r.name === 'Blitzkrieg')).toMatchObject({ gradeLabel: 'VI.4/4+', lengthM: null, description: 'Nr 16 · bez kantów' });
    expect(plan.routes.find((r) => r.name === 'Lewa rysa Fredry')).toMatchObject({ lengthM: 18, description: 'Nr 1 · trad' });
    expect(plan.routes.find((r) => r.name === 'Puchacz')).toMatchObject({ type: 'boulder', gradeSystem: 'font' });
  });
});

describe('simple one-file import', () => {
  const csv = [
    'Region;Rejon;Grupa;Skała;Sektor;Nazwa;Typ;Wycena;Skala wycen;Długość;Opis',
    'Jura;Rzędkowice;;Okiennik;Lewy;Rysa;sport;VI.2;kr;20;klasyk',
    'Jura;Rzędkowice;;Okiennik;;Filar;sport;6b;fr;;',
    'Jura;Rzędkowice;;Okiennik;;Kamień;boulder;6B;;;',
    'Jura;;;Okiennik;;Bez rejonu;sport;VI;kr;;',
    'Jura;Rzędkowice;;Okiennik;;Zła;sport;9z;kr;;',
  ].join('\n');

  it('reads Polish headers and builds one crag with sectors', () => {
    expect(detectFormat(csv)).toBe('flat');
    const plan = planFromFlatRows(parseFlatCsv(csv));
    expect(plan.crags).toEqual([expect.objectContaining({ name: 'Okiennik', region: 'Jura', area: 'Rzędkowice', group: '' })]);
    expect(plan.sectors.map((s) => s.name)).toEqual(['Lewy', 'Okiennik']);
    expect(plan.routes.map((r) => [r.name, r.gradeSystem, r.lengthM])).toEqual([['Rysa', 'kr', 20], ['Filar', 'fr', null], ['Kamień', 'font', null]]);
    expect(plan.errors.map((e) => [e.line, e.message])).toEqual([[5, 'area (rejon) is required'], [6, 'unknown grade 9z in kr']]);
  });
  it('accepts English headers and commas', () => {
    const plan = planFromFlatRows(parseFlatCsv('region,area,crag,name,grade\nJura,Rzędkowice,Okiennik,Rysa,VI.2\n'));
    expect(plan.errors).toEqual([]);
    expect(plan.routes[0]).toMatchObject({ type: 'sport', gradeSystem: 'kr' });
  });
  it('does not recognise unrelated files', () => {
    expect(detectFormat('key,name\n1,x')).toBeNull();
    expect(detectFormat('{"app":"cruxlog"}')).toBeNull();
  });
});
