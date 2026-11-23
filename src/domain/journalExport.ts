import { strToU8, zipSync } from 'fflate';
import { feltGrade, formatGrade, routeGrade, type AscentStyle, type GradeSystem, type RouteType } from './grades';

// The logbook as an Excel file (.xlsx): opens the same in Excel, Google Sheets (also on a phone) and LibreOffice, with every
// letter right and numbers as numbers. A CSV did not: Sheets on Android read Polish letters in the wrong encoding.

/** One ascent with everything the export writes. */
export type JournalExportRow = {
  date: string; style: AscentStyle; attempts: number; rating: number | null; felt_grade_index: number | null;
  notes: string; weather: string; partner_name: string | null;
  route_name: string; type: RouteType; grade_index: number; grade_label: string; grade_system: GradeSystem;
  sector_name: string; crag_name: string; region_name: string | null;
};

/** The columns, in file order. */
export const JOURNAL_COLUMNS = ['date', 'route', 'grade', 'felt', 'type', 'crag', 'sector', 'region', 'style', 'attempts', 'rating', 'partner', 'weather', 'notes'] as const;
export type JournalColumn = (typeof JOURNAL_COLUMNS)[number];

/** The column titles and the words the export needs, already translated. */
export type JournalLabels = {
  columns: Record<JournalColumn, string>;
  styles: Record<AscentStyle, string>;
  types: Record<RouteType, string>;
  sheet: string;
};

type Cell = string | number | null;

/** The table: a header row, then one row per ascent in the given order. Numbers stay numbers. */
export function journalTable(rows: JournalExportRow[], system: GradeSystem, labels: JournalLabels): Cell[][] {
  const head = JOURNAL_COLUMNS.map((k) => labels.columns[k]);
  return [head, ...rows.map((r) => {
    const felt = feltGrade(r.felt_grade_index, r.grade_index);
    return [
      r.date, r.route_name, routeGrade(r, system), felt == null ? '' : formatGrade(felt, system, r.type), labels.types[r.type] ?? r.type,
      r.crag_name, r.sector_name, r.region_name ?? '', labels.styles[r.style] ?? r.style, r.attempts, r.rating,
      r.partner_name ?? '', r.weather, r.notes,
    ];
  })];
}

/** Text for XML: escaped, without the control characters XML does not allow. */
export function xmlText(s: string): string {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The spreadsheet column letters: 0 → A, 25 → Z, 26 → AA. */
export function columnName(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

const WIDTHS: Record<JournalColumn, number> = {
  date: 11, route: 26, grade: 9, felt: 9, type: 11, crag: 20, sector: 18, region: 18, style: 8, attempts: 9, rating: 7, partner: 14, weather: 16, notes: 40,
};

function sheetXml(table: Cell[][]): string {
  const rows = table.map((row, r) => {
    const cells = row.map((v, c) => {
      const ref = `${columnName(c)}${r + 1}`;
      const style = r === 0 ? ' s="1"' : '';
      if (v == null || v === '') return '';
      if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${style}><v>${v}</v></c>`;
      return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlText(String(v))}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');
  const cols = JOURNAL_COLUMNS.map((k, i) => `<col min="${i + 1}" max="${i + 1}" width="${WIDTHS[k]}" customWidth="1"/>`).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + `<cols>${cols}</cols><sheetData>${rows}</sheetData></worksheet>`;
}

/** The logbook as the bytes of an .xlsx file with one sheet. */
export function journalXlsx(rows: JournalExportRow[], system: GradeSystem, labels: JournalLabels): Uint8Array {
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  // A sheet name may not hold some characters and is at most 31 long.
  const sheet = xmlText(labels.sheet.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet1');
  const files: Record<string, string> = {
    '[Content_Types].xml': `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + '</Types>',
    '_rels/.rels': `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>',
    'xl/workbook.xml': `${xml}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
      + `<sheets><sheet name="${sheet}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      + '</Relationships>',
    // Two looks: normal, and bold for the header.
    'xl/styles.xml': `${xml}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
      + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
      + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
      + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
      + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
      + '</styleSheet>',
    'xl/worksheets/sheet1.xml': sheetXml(journalTable(rows, system, labels)),
  };
  return zipSync(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])), { level: 6 });
}
