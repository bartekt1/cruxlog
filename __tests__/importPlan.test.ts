import { detectFormat, missingColumns, parseFlatCsv, planFromFlatRows } from '../src/domain/flatImport';
import { MissingColumnsError, planFromFiles, UnknownFileError } from '../src/domain/importPlan';

const head = 'region;area;crag;sector;name;grade\n';
const krowia = `${head}Czarnorzeki;Kamieniec;Krowia;Zachód;Rysa;VI.1\nCzarnorzeki;Kamieniec;Krowia;Zachód;Filar;VI.2\n`;
const baszta = `${head}Jura;Sokoliki;Baszta;;Komin;V\n`;

describe('planFromFiles', () => {
  it('builds a plan from one file', () => {
    const plan = planFromFiles({ 'krowia.csv': krowia });
    expect(plan.errors).toEqual([]);
    expect(plan.crags.map((c) => c.name)).toEqual(['Krowia']);
    expect(plan.routes.map((r) => r.name)).toEqual(['Rysa', 'Filar']);
  });
  it('merges several files into one plan', () => {
    const plan = planFromFiles({ 'krowia.csv': krowia, 'baszta.csv': baszta });
    expect(plan.crags.map((c) => c.name)).toEqual(['Krowia', 'Baszta']);
    expect(plan.routes).toHaveLength(3);
  });
  it('names the file and line of each problem and plans nothing then', () => {
    const bad = `${head}Jura;Sokoliki;Baszta;;Komin;9z\n`;
    const plan = planFromFiles({ 'krowia.csv': krowia, 'bad.csv': bad });
    expect(plan.errors).toEqual([expect.objectContaining({ file: 'bad.csv', line: 2 })]);
    expect(plan.routes).toEqual([]);
  });
  it('rejects a file it does not recognise, and a positions file', () => {
    expect(() => planFromFiles({ 'x.csv': 'a;b;c\n1;2;3\n' })).toThrow(UnknownFileError);
    expect(() => planFromFiles({ 'pos.csv': 'crag;lat;lng\nKrowia;49.7;21.8\n' })).toThrow(UnknownFileError);
  });
  it('says which required columns are missing', () => {
    try {
      planFromFiles({ 'a.csv': 'Region;Skała;Nazwa\nJura;Baszta;Komin\n' });
      throw new Error('should have failed');
    } catch (e) {
      expect(e).toBeInstanceOf(MissingColumnsError);
      expect((e as MissingColumnsError).columns).toEqual(['Rejon', 'Wycena']);
    }
  });
});

describe('the template file', () => {
  // The columns of docs/cruxlog-wzor.csv, in another order, with an unknown column and Polish letters dropped.
  const text = '﻿Nazwa;Wycena;Skala_wycen;Skala;Rejon;Region;Grupa;Sektor;Typ;Dlugosc;Przeloty;Autor;Rok;Opis;Lat;Lng;Przyblizone;Opis_skaly;Dojscie;ID_skaly;ID_drogi;Moja kolumna\n'
    + 'Rysa;VI.1;kr;Krowia;Kamieniec;Czarnorzeki;Krowia Turnia;Ściana zachodnia;droga;18;6;Jan Kowalski;2019;Rysą do ringu;49,7444;21,7833;tak;Lita ściana;10 min;sk-1;dr-1;x\n'
    + 'Okap;7a;fr;Krowia;Kamieniec;Czarnorzeki;Krowia Turnia;;wielowyciąg;;;;;;;;;;;sk-1;dr-2;y\n';
  it('is recognised whatever the order of the columns', () => {
    expect(detectFormat(text)).toBe('routes');
    expect(missingColumns(text)).toEqual([]);
  });
  it('reads every column', () => {
    const plan = planFromFlatRows(parseFlatCsv(text));
    expect(plan.errors).toEqual([]);
    expect(plan.crags).toEqual([expect.objectContaining({
      key: 'sk-1', name: 'Krowia', region: 'Czarnorzeki', area: 'Kamieniec', group: 'Krowia Turnia',
      lat: 49.7444, lng: 21.7833, approx: true, description: 'Lita ściana', approach: '10 min',
    })]);
    expect(plan.sectors.map((s) => s.name)).toEqual(['Ściana zachodnia', 'Krowia']);
    expect(plan.routes[0]).toMatchObject({ key: 'dr-1', name: 'Rysa', type: 'sport', gradeSystem: 'kr', lengthM: 18, bolts: 6, author: 'Jan Kowalski', year: 2019, description: 'Rysą do ringu' });
    expect(plan.routes[1]).toMatchObject({ key: 'dr-2', type: 'multipitch', gradeSystem: 'fr', gradeLabel: '7a', lengthM: null, author: '', year: null });
  });
  it('takes the crag facts from any of its rows', () => {
    const later = 'Region;Rejon;Skała;Nazwa;Wycena;Lat;Lng;Opis_skały\nJura;Sokoliki;Baszta;Komin;V;;;\nJura;Sokoliki;Baszta;Rysa;VI;50.1;19.2;Wysoka\n';
    expect(planFromFlatRows(parseFlatCsv(later)).crags[0]).toMatchObject({ lat: 50.1, lng: 19.2, approx: false, description: 'Wysoka' });
  });
});
