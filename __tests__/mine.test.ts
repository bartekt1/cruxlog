import { deletionSummary, mineKey, type MineItem } from '../src/domain/mine';

describe('deletionSummary', () => {
  const items: MineItem[] = [
    { kind: 'crag', id: 'c1', routes: 3, ascents: 2 },
    { kind: 'crag', id: 'c2', routes: 0, ascents: 0 },
    { kind: 'route', id: 'r1', routes: 1, ascents: 1 },
    { kind: 'area', id: 'a1', routes: 0, ascents: 0 },
  ];
  it('counts crags, their routes, single routes and ascents', () => {
    expect(deletionSummary(items, new Set(items.map(mineKey)))).toEqual({ areas: 1, crags: 2, routes: 4, ascents: 3 });
    expect(deletionSummary(items, new Set(['route:r1']))).toEqual({ areas: 0, crags: 0, routes: 1, ascents: 1 });
    expect(deletionSummary(items, new Set())).toEqual({ areas: 0, crags: 0, routes: 0, ascents: 0 });
  });
});
