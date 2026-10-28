// Cruxlog – wspólna baza robocza skał (Google Apps Script przy arkuszu „Cruxlog – propozycje”).
// Przyjmuje od aplikacji paczki zmian (JSON) i dopisuje je jako wiersze arkusza „Propozycje”.
// Można tylko dopisywać: nikt z zewnątrz nie odczyta ani nie usunie arkusza. Instrukcja: docs/PROPOZYCJE.md.

const SHEET = 'Propozycje';
const TEMPLATE = ['Region', 'Rejon', 'Grupa', 'Skała', 'Sektor', 'Nazwa', 'Typ', 'Wycena', 'Skala_wycen', 'Długość', 'Przeloty', 'Autor', 'Rok',
  'Opis', 'Lat', 'Lng', 'Przybliżone', 'Opis_skały', 'Dojście', 'ID_skały', 'ID_drogi'];
const KEYS = ['at', 'kind', 'changes', 'device', ...TEMPLATE];
const HEADER = ['Kiedy', 'Zmiana', 'Co zmieniono', 'Urządzenie', ...TEMPLATE];
const MAX_ROWS = 200;          // w jednej paczce
const MAX_PER_DAY = 2000;      // z jednego telefonu na dobę

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!body || body.app !== 'cruxlog' || !Array.isArray(body.rows)) return out({ ok: false, error: 'bad request' });
    if (body.rows.length > MAX_ROWS) return out({ ok: false, error: 'too many rows' });
    const rows = body.rows.map((r) => KEYS.map((k) => clean(r && r[k])));
    if (!rows.length) return out({ ok: true, added: 0 });
    const device = rows[0][3] || '?';
    const cache = CacheService.getScriptCache();
    const key = 'n-' + device + '-' + new Date().toISOString().slice(0, 10);
    const today = Number(cache.get(key) || 0);
    if (today + rows.length > MAX_PER_DAY) return out({ ok: false, error: 'daily limit' });
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sh = sheet();
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, KEYS.length).setValues(rows);
    } finally {
      lock.releaseLock();
    }
    cache.put(key, String(today + rows.length), 6 * 60 * 60);
    return out({ ok: true, added: rows.length });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

// Otwarcie adresu w przeglądarce: sprawdzenie, czy skrypt działa.
function doGet() {
  sheet();
  return out({ ok: true, app: 'cruxlog-propozycje' });
}

function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.getRange(1, 1, sh.getMaxRows(), KEYS.length).setNumberFormat('@'); // tekst: „VI.2” czy „5.10” nie zamienią się w liczby i daty
    sh.getRange(1, 1, 1, KEYS.length).setValues([HEADER]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

// Tekst do 1000 znaków; wartość zaczynająca się od = + - @ nie stanie się formułą.
function clean(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, 1000);
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
