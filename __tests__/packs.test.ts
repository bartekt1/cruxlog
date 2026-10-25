import { groupPacks, packState, packUrl, parsePackIndex, PACKS_INDEX_URL } from '../src/domain/packs';

const good = { id: 'skalki-kamieniec', name: 'Kamieniec', region: 'Pogórze', area: 'Skałki', crags: 11, routes: 148, version: 2, bytes: 19753, file: 'paczki/skalki-kamieniec.csv', bbox: [21.7, 49.7, 21.8, 49.8] };

describe('packs', () => {
  it('reads the list and leaves out malformed entries', () => {
    const list = parsePackIndex({ format: 1, packs: [good, { ...good, id: '../x' }, { ...good, id: 'y', file: 'http://evil/x.csv' }, { ...good, id: 'z', bbox: 'no' }] });
    expect(list.map((p) => p.id)).toEqual(['skalki-kamieniec', 'z']);
    expect(list[1].bbox).toBeNull();
    expect(() => parsePackIndex({ nope: 1 })).toThrow();
  });
  it('finds the file next to the list', () => {
    expect(packUrl(PACKS_INDEX_URL, parsePackIndex({ packs: [good] })[0])).toBe('https://raw.githubusercontent.com/bartekt1/cruxlog-paczki/main/paczki/skalki-kamieniec.csv');
  });
  it('says whether a pack is new, installed or has an update', () => {
    const [p] = parsePackIndex({ packs: [good] });
    expect(packState(p, undefined)).toBe('available');
    expect(packState(p, 2)).toBe('installed');
    expect(packState(p, 1)).toBe('update');
  });
  it('groups by region and area in list order', () => {
    const list = parsePackIndex({ packs: [good, { ...good, id: 'b', area: 'Inne' }, { ...good, id: 'c' }] });
    expect(groupPacks(list).map((g) => [g.area, g.packs.map((p) => p.id)])).toEqual([['Skałki', ['skalki-kamieniec', 'c']], ['Inne', ['b']]]);
  });
});
