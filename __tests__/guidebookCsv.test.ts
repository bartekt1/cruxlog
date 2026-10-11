import { buildImportPlan } from '../src/domain/csvImport';
import { convertGuidebook } from '../src/domain/guidebookCsv';

const HEADER = 'Rodzaj_wyceny;Wycena;Nazwa;Nr_w_przewodniku;Region;Rejon;Skała;Wysokość_i_ekspozycja_ściany;Styl;Uwagi;GPS_szerokość;GPS_długość;GPS_oryginał;GPS_poziom';
const KR = 'Droga wspinaczkowa – skala polska (Kurtyki)';
const FONT = 'Boulder – skala Fontainebleau';
const FILE = '﻿' + [
  HEADER,
  `${KR};V;Lewa rysa Fredry;1;Pogórze Dynowskie > Czarnorzeki > Kamieniec;Grupa Słonecznej Turni;Lewe i Prawe Zamczysko;18 m > Pn.;trad;;49,7425;21,785278;x;rejon`,
  `${KR};VI.4/4+;Blitzkrieg;16;Pogórze Dynowskie > Czarnorzeki > Kamieniec;Grupa Słonecznej Turni;Narożna;"14 m > Pn.; 12 m > Zach.";;bez kantów;49,7425;21,785278;x;rejon`,
  `${KR};VI+;(bez nazwy);40;Pogórze Dynowskie > Czarnorzeki;Strzelnica;Okapik;8 m > Zach.;;;49,74;21,8;x;rejon`,
  `${KR};VI-;(bez nazwy);41;Pogórze Dynowskie > Czarnorzeki;Strzelnica;Okapik;8 m > Zach.;;;49,74;21,8;x;rejon`,
  `${FONT};8A+;Puchacz;175;Pogórze Dynowskie > Czarnorzeki;Sokoli Grzbiet;Samotnik;3 m > Zach.;SD;;49,7425;21,825556;x;rejon`,
].join('\r\n');

describe('convertGuidebook', () => {
  const out = convertGuidebook(FILE);
  const plan = buildImportPlan({ crags: out.crags, sectors: out.sectors, routes: out.routes });

  it('produces files the importer accepts without errors', () => {
    expect(plan.errors).toEqual([]);
    expect(out.counts).toEqual({ regions: 3, crags: 4, routes: 4, boulders: 1 });
  });
  it('groups Kamieniec groups into one region and uses other groups as regions', () => {
    expect([...new Set(plan.crags.map((c) => c.region))]).toEqual(['Kamieniec', 'Strzelnica', 'Sokoli Grzbiet']);
    expect(plan.crags.find((c) => c.name === 'Narożna')).toMatchObject({
      region: 'Kamieniec', country: 'PL', lat: 49.7425, lng: 21.785278,
      description: 'Grupa: Grupa Słonecznej Turni. Ściany: 14 m Pn., 12 m Zach.',
    });
    expect(plan.crags.find((c) => c.name === 'Okapik')!.description).toBe('Ściany: 8 m Zach.');
  });
  it('keeps routes with the same name apart and stores guidebook details', () => {
    const okapik = plan.routes.filter((r) => r.name === '(bez nazwy)');
    expect(okapik).toHaveLength(2);
    expect(new Set(okapik.map((r) => r.key)).size).toBe(2);
    expect(plan.routes.find((r) => r.name === 'Blitzkrieg')).toMatchObject({ gradeLabel: 'VI.4/4+', gradeSystem: 'kr', lengthM: null, description: 'Nr 16 · bez kantów' });
    expect(plan.routes.find((r) => r.name === 'Lewa rysa Fredry')).toMatchObject({ lengthM: 18, description: 'Nr 1 · trad' });
    expect(plan.routes.find((r) => r.name === 'Puchacz')).toMatchObject({ type: 'boulder', gradeSystem: 'font', gradeLabel: '8A+', description: 'Nr 175 · SD' });
  });
});
