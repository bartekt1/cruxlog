import { csvCell, csvSeparator, journalCsv, type JournalCsvLabels, type JournalExportRow } from '../src/domain/journalCsv';

const labels: JournalCsvLabels = {
  columns: { date: 'Data', route: 'Droga', grade: 'Wycena', felt: 'Moja wycena', type: 'Typ', crag: 'Skała', sector: 'Sektor', region: 'Rejon',
    style: 'Styl', attempts: 'Podejścia', rating: 'Ocena', partner: 'Partner', weather: 'Warunki', notes: 'Notatka' },
  styles: { os: 'OS', flash: 'Flash', rp: 'RP', pp: 'PP', tr: 'TR', attempt: 'Próba' },
  types: { sport: 'Sport', multipitch: 'Wielowyciąg' },
};

const row: JournalExportRow = {
  date: '2026-06-01', style: 'rp', attempts: 3, rating: 4, felt_grade_index: null, notes: '', weather: 'słońce', partner_name: 'Ania',
  route_name: 'Rysa', type: 'sport', grade_index: 10, grade_label: 'VI.3', grade_system: 'kr',
  sector_name: 'Główny', crag_name: 'Bąbel', region_name: 'Jura',
};

describe('journal CSV', () => {
  it('uses ";" for Polish and "," otherwise', () => {
    expect(csvSeparator('pl')).toBe(';');
    expect(csvSeparator('en')).toBe(',');
  });
  it('quotes cells with the separator, quotes, line breaks or edge spaces', () => {
    expect(csvCell('a;b', ';')).toBe('"a;b"');
    expect(csvCell('a,b', ';')).toBe('a,b');
    expect(csvCell('say "hi"', ';')).toBe('"say ""hi"""');
    expect(csvCell('line\nbreak', ';')).toBe('"line\nbreak"');
    expect(csvCell(' pad', ';')).toBe('" pad"');
    expect(csvCell(null, ';')).toBe('');
    expect(csvCell(3, ';')).toBe('3');
  });
  it('keeps text that looks like a formula from running', () => {
    expect(csvCell('=HYPERLINK("x")', ';')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('+48 600', ';')).toBe("'+48 600");
    expect(csvCell(-3, ';')).toBe('-3');
  });
  it('writes a BOM, the header and one row per ascent', () => {
    const csv = journalCsv([row, { ...row, style: 'attempt', felt_grade_index: 11, rating: null, partner_name: null, region_name: null, notes: 'trudna; mokra' }], 'kr', labels, ';');
    expect(csv.startsWith('﻿Data;Droga;Wycena;Moja wycena;')).toBe(true);
    const lines = csv.slice(1).trimEnd().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('2026-06-01;Rysa;VI.3;;Sport;Bąbel;Główny;Jura;RP;3;4;Ania;słońce;');
    expect(lines[2]).toMatch(/^2026-06-01;Rysa;VI\.3;\S+;Sport;Bąbel;Główny;;Próba;3;;;słońce;"trudna; mokra"$/);
  });
  it('shows grades in the chosen system', () => {
    const csv = journalCsv([row], 'fr', labels, ',');
    expect(csv.split('\r\n')[1].split(',')[2]).not.toBe('VI.3');
  });
});
