import { strFromU8, unzipSync } from 'fflate';
import { columnName, journalTable, journalXlsx, xmlText, type JournalExportRow, type JournalLabels } from '../src/domain/journalExport';

const labels: JournalLabels = {
  columns: { date: 'Data', route: 'Droga', grade: 'Wycena', felt: 'Moja wycena', type: 'Typ', crag: 'Skała', sector: 'Sektor', region: 'Rejon',
    style: 'Styl', attempts: 'Podejścia', rating: 'Ocena', partner: 'Partner', weather: 'Warunki', notes: 'Notatka' },
  styles: { os: 'OS', flash: 'Flash', rp: 'RP', pp: 'PP', tr: 'TR', attempt: 'Próba' },
  types: { sport: 'Sport', multipitch: 'Wielowyciąg' },
  sheet: 'Dziennik',
};

const row: JournalExportRow = {
  date: '2026-06-01', style: 'rp', attempts: 3, rating: 4, felt_grade_index: null, notes: '', weather: 'słońce', partner_name: 'Ania',
  route_name: 'Rysa', type: 'sport', grade_index: 10, grade_label: 'VI.3', grade_system: 'kr',
  sector_name: 'Główny', crag_name: 'Jaskółka', region_name: 'Sokoli Grzbiet',
};

describe('journal export', () => {
  it('builds the table: header, then rows; numbers stay numbers', () => {
    const t = journalTable([row, { ...row, style: 'attempt', felt_grade_index: 11, rating: null, partner_name: null, region_name: null }], 'kr', labels);
    expect(t[0][0]).toBe('Data');
    expect(t[1]).toEqual(['2026-06-01', 'Rysa', 'VI.3', '', 'Sport', 'Jaskółka', 'Główny', 'Sokoli Grzbiet', 'RP', 3, 4, 'Ania', 'słońce', '']);
    expect(t[2][3]).not.toBe('');
    expect(t[2][8]).toBe('Próba');
    expect(t[2][10]).toBeNull();
  });
  it('names columns like a spreadsheet', () => {
    expect([0, 13, 25, 26, 27, 51, 52, 701, 702].map(columnName)).toEqual(['A', 'N', 'Z', 'AA', 'AB', 'AZ', 'BA', 'ZZ', 'AAA']);
  });
  it('escapes XML and drops characters XML does not allow', () => {
    expect(xmlText('a < b & "c" > d\u0001')).toBe('a &lt; b &amp; &quot;c&quot; &gt; d');
  });
  it('writes an xlsx with the sheet, Polish letters as they are and a frozen header', () => {
    const files = unzipSync(journalXlsx([{ ...row, notes: 'trudna; <mokra> & "śliska"\nnowa linia' }], 'kr', labels));
    expect(Object.keys(files).sort()).toEqual(['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml']);
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
    expect(sheet).toContain('<t xml:space="preserve">Jaskółka</t>');
    expect(sheet).toContain('<c r="J2"><v>3</v></c>');
    expect(sheet).toContain('trudna; &lt;mokra&gt; &amp; &quot;śliska&quot;\nnowa linia');
    expect(sheet).toContain('state="frozen"');
    expect(strFromU8(files['xl/workbook.xml'])).toContain('name="Dziennik"');
  });
});
