import { cragRow, describeChanges, newDeviceCode, proposalBody, routeRow, type CragFacts, type RouteFacts } from '../src/domain/proposals';

const crag: CragFacts = { region: 'Pogórze', area: 'Czarnorzeki', group: 'Kamieniec', name: 'Krowia', lat: 49.7444, lng: 21.7833, approx: true, description: '', approach: 'Od parkingu 10 min', key: 'sk-0004' };
const route: RouteFacts = { sector: 'Zachód', name: 'Rysa', type: 'sport', gradeLabel: 'VI.2', gradeSystem: 'kr', lengthM: 18, bolts: 5, author: '', year: null, description: '', key: 'dr-0101' };

describe('proposals', () => {
  it('writes a crag and a route in the template columns', () => {
    expect(cragRow(crag)).toMatchObject({ Region: 'Pogórze', Rejon: 'Czarnorzeki', Grupa: 'Kamieniec', Skała: 'Krowia', Lat: '49.7444', Przybliżone: 'tak', Dojście: 'Od parkingu 10 min', ID_skały: 'sk-0004' });
    expect(routeRow(crag, route)).toMatchObject({ Skała: 'Krowia', Sektor: 'Zachód', Nazwa: 'Rysa', Typ: 'droga', Wycena: 'VI.2', Skala_wycen: 'kr', Długość: '18', Przeloty: '5', Rok: '', ID_drogi: 'dr-0101' });
    expect(routeRow(crag, { ...route, sector: 'Krowia', type: 'multipitch' })).toMatchObject({ Sektor: '', Typ: 'wielowyciąg' });
    expect(cragRow({ ...crag, lat: null, lng: null })).toMatchObject({ Lat: '', Lng: '', Przybliżone: '' });
  });
  it('describes what changed', () => {
    const before = routeRow(crag, route);
    expect(describeChanges(before, routeRow(crag, { ...route, gradeLabel: 'VI.3', bolts: 6 }))).toBe('Wycena: VI.2 → VI.3; Przeloty: 5 → 6');
    expect(describeChanges(before, routeRow(crag, { ...route, lengthM: null }))).toBe('Długość: 18 → –');
    expect(describeChanges(before, before)).toBe('');
    expect(describeChanges(null, before)).toBe('');
  });
  it('builds the body with the oldest entries first, at most the limit', () => {
    const e = (n: number) => ({ id: String(n), created_at: Date.UTC(2026, 9, n), kind: 'route_edit' as const, row: { Nazwa: `R${n}` }, changes: 'x' });
    const body = proposalBody([e(1), e(2), e(3)], 'abc123', 2);
    expect(body.rows).toEqual([
      { at: '2026-10-01T00:00:00.000Z', kind: 'poprawka drogi', changes: 'x', device: 'abc123', Nazwa: 'R1' },
      { at: '2026-10-02T00:00:00.000Z', kind: 'poprawka drogi', changes: 'x', device: 'abc123', Nazwa: 'R2' },
    ]);
  });
  it('makes a 6-letter device code', () => {
    expect(newDeviceCode(() => 0)).toBe('aaaaaa');
    expect(newDeviceCode()).toMatch(/^[a-z2-9]{6}$/);
  });
});
