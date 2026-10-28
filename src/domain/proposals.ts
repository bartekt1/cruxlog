// Proposals: the user's changes to crags, sectors and routes, sent anonymously to a shared working sheet (a Google Sheet
// with an Apps Script, see docs/PROPOZYCJE.md), where the owner cleans them up before adding them to the packs' base.
// Only crag and route facts are sent: never ascents, partners, goals, photos or the user's position.

/** The Apps Script web app the proposals go to; empty until it is set up (then nothing is sent). */
export const PROPOSALS_URL = 'https://script.google.com/macros/s/AKfycbwP2sFy-EFjVILfgYKGz47enntQ1q1gnuEjBsGtX6vSgGGqi6bp_NEf0VhAg3S08zmFfg/exec';

/** The columns of the Cruxlog template (docs/IMPORT.md), so a good row can be pasted into the base as it is. */
export const PROPOSAL_COLUMNS = [
  'Region', 'Rejon', 'Grupa', 'Skała', 'Sektor', 'Nazwa', 'Typ', 'Wycena', 'Skala_wycen', 'Długość', 'Przeloty', 'Autor', 'Rok',
  'Opis', 'Lat', 'Lng', 'Przybliżone', 'Opis_skały', 'Dojście', 'ID_skały', 'ID_drogi',
] as const;
export type ProposalColumn = typeof PROPOSAL_COLUMNS[number];
export type ProposalRow = Partial<Record<ProposalColumn, string>>;

export type ProposalKind =
  | 'crag_new' | 'crag_edit' | 'crag_position' | 'crag_delete'
  | 'sector_new' | 'sector_edit' | 'sector_delete'
  | 'route_new' | 'route_edit' | 'route_delete';

/** How a kind of change reads in the sheet (the owner's language). */
export const KIND_LABEL: Record<ProposalKind, string> = {
  crag_new: 'nowa skała', crag_edit: 'poprawka skały', crag_position: 'położenie skały', crag_delete: 'usunięcie skały',
  sector_new: 'nowy sektor', sector_edit: 'poprawka sektora', sector_delete: 'usunięcie sektora',
  route_new: 'nowa droga', route_edit: 'poprawka drogi', route_delete: 'usunięcie drogi',
};

export type CragFacts = {
  region: string; area: string; group: string; name: string; lat: number | null; lng: number | null; approx: boolean;
  description: string; approach: string; key: string | null;
};
export type RouteFacts = {
  sector: string; name: string; type: string; gradeLabel: string; gradeSystem: string; lengthM: number | null; bolts: number | null;
  author: string; year: number | null; description: string; key: string | null;
};

const num = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '' : String(n));

/** A crag as template columns. */
export function cragRow(c: CragFacts): ProposalRow {
  return {
    Region: c.region, Rejon: c.area, Grupa: c.group, Skała: c.name, Lat: num(c.lat), Lng: num(c.lng), Przybliżone: c.lat != null && c.approx ? 'tak' : '',
    Opis_skały: c.description, Dojście: c.approach, ID_skały: c.key ?? '',
  };
}

/** A route (on crag `crag`) as template columns; a sector named like its crag is the crag's "no sector" and left empty. */
export function routeRow(crag: CragFacts, r: RouteFacts): ProposalRow {
  return {
    ...cragRow(crag), Sektor: r.sector === crag.name ? '' : r.sector, Nazwa: r.name, Typ: r.type === 'multipitch' ? 'wielowyciąg' : 'droga',
    Wycena: r.gradeLabel, Skala_wycen: r.gradeSystem, Długość: num(r.lengthM), Przeloty: num(r.bolts), Autor: r.author, Rok: num(r.year),
    Opis: r.description, ID_drogi: r.key ?? '',
  };
}

/** What changed, e.g. "Wycena: VI.2 → VI.3; Przeloty: 5 → 6" ('' when nothing did, or for a new or deleted thing). */
export function describeChanges(before: ProposalRow | null, after: ProposalRow | null): string {
  if (!before || !after) return '';
  return PROPOSAL_COLUMNS
    .filter((c) => (before[c] ?? '') !== (after[c] ?? ''))
    .map((c) => `${c}: ${before[c] || '–'} → ${after[c] || '–'}`)
    .join('; ');
}

/** A row of the sheet: when, what kind, what changed, the device's code, the app's ids of the thing and its crag, then the template columns. */
export type SheetRow = { at: string; kind: string; changes: string; device: string; appId: string; appCragId: string } & ProposalRow;

/** A waiting change; `entityId` and `cragId` are the app's own ids of the thing and of its crag ('' for changes recorded before they were kept). */
export type OutboxEntry = { id: string; created_at: number; kind: ProposalKind; row: ProposalRow; changes: string; entityId: string; cragId: string };

/** The body sent to the sheet: at most `limit` oldest entries. */
export function proposalBody(entries: OutboxEntry[], device: string, limit = 200): { app: 'cruxlog'; v: 1; rows: SheetRow[] } {
  return {
    app: 'cruxlog', v: 1,
    rows: entries.slice(0, limit).map((e) => ({ at: new Date(e.created_at).toISOString(), kind: KIND_LABEL[e.kind], changes: e.changes, device, appId: e.entityId, appCragId: e.cragId, ...e.row })),
  };
}

/** A short random code for this installation, so the owner sees which rows came from one phone; it says nothing about the person. */
export function newDeviceCode(random: () => number = Math.random): string {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 6 }, () => abc[Math.floor(random() * abc.length)]).join('');
}
