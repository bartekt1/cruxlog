import { groupPacks, packRepairOrder, packState, packUrl, parsePackIndex, PACKS_INDEX_URL } from '../src/domain/packs';

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

describe('packRepairOrder', () => {
  const keys = new Map([
    ['s', { crags: new Set(['sk-37', 'sk-38']), routes: new Set(['dr-390', 'dr-391']) }],
    ['p', { crags: new Set(['sk-66']), routes: new Set(['dr-767', 'dr-769']) }],
    ['m', { crags: new Set(['sk-13']), routes: new Set(['dr-100']) }],
    ['r', { crags: new Set(['sk-56']), routes: new Set(['dr-600']) }],
  ]);
  it('reinstalls the pack whose crag or routes ended up in another pack\'s crag, then that pack', () => {
    expect(packRepairOrder([{ ownKey: 'sk-37', routeKeys: ['dr-767'], packId: 'p' }], keys)).toEqual(['s', 'p']);
    // A crag that came from the user's own file first: its routes tell.
    expect(packRepairOrder([{ ownKey: 'h-1', routeKeys: ['dr-391', 'dr-767'], packId: 'p' }], keys)).toEqual(['s', 'p']);
    expect(packRepairOrder([{ ownKey: 'sk-37', routeKeys: [], packId: 'p' }, { ownKey: 'h-9', routeKeys: ['dr-100'], packId: 'r' }], keys)).toEqual(['s', 'm', 'p', 'r']);
  });
  it('leaves alone crags taken from the user\'s own file with only the pack\'s routes, and unknown packs', () => {
    expect(packRepairOrder([{ ownKey: 'my-1', routeKeys: ['dr-767'], packId: 'p' }], keys)).toEqual([]);
    expect(packRepairOrder([{ ownKey: 'sk-38', routeKeys: ['dr-390'], packId: 's' }], keys)).toEqual([]);
    expect(packRepairOrder([{ ownKey: 'sk-37', routeKeys: [], packId: 'gone' }], keys)).toEqual([]);
    expect(packRepairOrder([], keys)).toEqual([]);
  });
});
