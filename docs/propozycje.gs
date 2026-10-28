// Cruxlog – wspólna baza robocza skał (Google Apps Script przy arkuszu „Cruxlog – propozycje”).
// Przyjmuje od aplikacji paczki zmian (JSON) i dopisuje je jako wiersze arkusza „Propozycje”.
// Można tylko dopisywać: nikt z zewnątrz nie odczyta ani nie usunie arkusza. Instrukcja: docs/PROPOZYCJE.md.
// Menu „Cruxlog › Posprzątaj wycofane” usuwa rzeczy dodane i potem usunięte w aplikacji (np. testowe) oraz wiersze TEST.

const SHEET = 'Propozycje';
const TEMPLATE = ['Region', 'Rejon', 'Grupa', 'Skała', 'Sektor', 'Nazwa', 'Typ', 'Wycena', 'Skala_wycen', 'Długość', 'Przeloty', 'Autor', 'Rok',
  'Opis', 'Lat', 'Lng', 'Przybliżone', 'Opis_skały', 'Dojście', 'ID_skały', 'ID_drogi'];
// Dwie ostatnie kolumny: losowe numery rzeczy i jej skały w aplikacji (łączą dodanie z usunięciem).
const KEYS = ['at', 'kind', 'changes', 'device', ...TEMPLATE, 'appId', 'appCragId'];
const HEADER = ['Kiedy', 'Zmiana', 'Co zmieniono', 'Urządzenie', ...TEMPLATE, 'ID w aplikacji', 'ID skały w aplikacji'];
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
    sh.setFrozenRows(1);
  }
  // Nagłówek i format tekstowy (także dla kolumn dodanych w nowszej wersji): „VI.2” czy „5.10” nie zamienią się w liczby i daty.
  if (sh.getRange(1, KEYS.length).getValue() !== HEADER[KEYS.length - 1]) {
    if (sh.getMaxColumns() < KEYS.length) sh.insertColumnsAfter(sh.getMaxColumns(), KEYS.length - sh.getMaxColumns());
    sh.getRange(1, 1, sh.getMaxRows(), KEYS.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, KEYS.length).setValues([HEADER]).setFontWeight('bold');
  }
  return sh;
}

// ---- Sprzątanie (menu w arkuszu) -------------------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Cruxlog').addItem('Posprzątaj wycofane', 'cleanUp').addToUi();
}

/**
 * Usuwa: wiersze TEST; każdą rzecz, która ma w arkuszu i dodanie („nowa …”), i usunięcie (wszystkie jej wiersze, a dla skały
 * także wiersze jej sektorów i dróg). Usunięcie rzeczy z paczek (bez dodania w arkuszu) zostaje do przejrzenia.
 */
function cleanUp() {
  const sh = sheet();
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const rows = sh.getRange(2, 1, n, KEYS.length).getValues();
  const col = (k) => KEYS.indexOf(k);
  const kind = (r) => String(r[col('kind')]);
  const added = new Set(rows.filter((r) => kind(r).startsWith('nowa ') || kind(r).startsWith('nowy ')).map((r) => r[col('appId')]).filter(String));
  const gone = new Set(); const goneCrags = new Set();
  for (const r of rows) {
    const id = r[col('appId')];
    if (!id || !kind(r).startsWith('usunięcie') || !added.has(id)) continue;
    gone.add(id);
    if (kind(r) === 'usunięcie skały') goneCrags.add(id);
  }
  const drop = rows.map((r) => /^TEST/i.test(kind(r)) || gone.has(r[col('appId')]) || goneCrags.has(r[col('appCragId')]));
  let removed = 0;
  for (let i = drop.length - 1; i >= 0; i--) if (drop[i]) { sh.deleteRow(i + 2); removed++; }
  SpreadsheetApp.getUi().alert('Usunięte wiersze: ' + removed);
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
