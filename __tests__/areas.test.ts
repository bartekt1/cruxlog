import { areaPath, childLevel, childrenOf, cragCounts, emptyAreaRoots, pathLabel, pathLabels, pathNames, splitPath, type Area, rankByChosenArea } from '../src/domain/areas';

const areas: Area[] = [
  { id: 'r', name: 'Czarnorzeki', level: 'region', parent_id: null },
  { id: 'k', name: 'Kamieniec', level: 'area', parent_id: 'r' },
  { id: 's', name: 'Strzelnica', level: 'area', parent_id: 'r' },
  { id: 'g', name: 'Krowia Turnia', level: 'group', parent_id: 'k' },
  { id: 'j', name: 'Jura', level: 'region', parent_id: null },
  { id: 'jp', name: 'Jura Południowa', level: 'area', parent_id: 'j' },
  { id: 'ds', name: 'Dolina Sanki', level: 'group', parent_id: 'jp' },
  { id: 'zd', name: 'Zimny Dół', level: 'group', parent_id: 'ds' },
];

describe('areas', () => {
  it('builds the path from the top', () => {
    expect(areaPath(areas, 'g').map((a) => a.id)).toEqual(['r', 'k', 'g']);
    expect(pathLabel(areas, 'g')).toBe('Czarnorzeki › Kamieniec › Krowia Turnia');
    expect(pathLabel(areas, null)).toBe('');
    expect(pathNames(areas, 's')).toEqual({ region: 'Czarnorzeki', area: 'Strzelnica', group: '' });
  });
  it('survives a broken parent link and cycles', () => {
    expect(areaPath([{ id: 'x', name: 'X', level: 'group', parent_id: 'missing' }], 'x').map((a) => a.id)).toEqual(['x']);
    const loop: Area[] = [{ id: 'a', name: 'A', level: 'area', parent_id: 'b' }, { id: 'b', name: 'B', level: 'region', parent_id: 'a' }];
    expect(areaPath(loop, 'a')).toHaveLength(2);
  });
  it('knows what can go below each level', () => {
    expect(childLevel(null)).toBe('region');
    expect(childLevel({ level: 'region' })).toBe('area');
    expect(childLevel({ level: 'area' })).toBe('group');
    expect(childLevel({ level: 'group' })).toBe('group');
  });
  it('keeps any number of group levels', () => {
    expect(pathNames(areas, 'zd')).toEqual({ region: 'Jura', area: 'Jura Południowa', group: 'Dolina Sanki › Zimny Dół' });
    expect(pathLabels(areas).get('zd')).toBe('Jura › Jura Południowa › Dolina Sanki › Zimny Dół');
    expect(pathLabels(areas).get('g')).toBe(pathLabel(areas, 'g'));
    expect(splitPath(' Dolina Sanki ›Zimny Dół › ')).toEqual(['Dolina Sanki', 'Zimny Dół']);
  });
  it('lists children sorted and counts crags below an area', () => {
    expect(childrenOf(areas, 'r').map((a) => a.name)).toEqual(['Kamieniec', 'Strzelnica']);
    expect(childrenOf(areas, null).map((a) => a.name)).toEqual(['Czarnorzeki', 'Jura']);
    const counts = cragCounts(areas, ['g', 'g', 'k', 's', 'j', 'zd', null]);
    expect(counts.get('r')).toBe(4);
    expect(counts.get('k')).toBe(3);
    expect(counts.get('j')).toBe(2);
    expect(counts.get('ds')).toBe(1);
  });
});

describe('rankByChosenArea', () => {
  it('puts crags of the chosen region and area first and keeps the rest in order', () => {
    const areas = [
      { id: 'r1', name: 'Jura', level: 'region' as const, parent_id: null },
      { id: 'a1', name: 'Sokoliki', level: 'area' as const, parent_id: 'r1' },
      { id: 'r2', name: 'Czarnorzeki', level: 'region' as const, parent_id: null },
    ];
    const crags = [{ id: 'x', region_id: 'r2' }, { id: 'y', region_id: null }, { id: 'z', region_id: 'a1' }, { id: 'w', region_id: 'r1' }];
    expect(rankByChosenArea(crags, areas, { region: 'jura', area: 'Sokoliki' }).map((c) => c.id)).toEqual(['z', 'w', 'x', 'y']);
    expect(rankByChosenArea(crags, areas, { region: '', area: '' }).map((c) => c.id)).toEqual(['x', 'y', 'z', 'w']);
  });
});

describe('emptyAreaRoots', () => {
  const a = (id: string, parent_id: string | null, level: Area['level'] = 'region'): Area => ({ id, name: id.toUpperCase(), level, parent_id });
  const areas = [a('r1', null), a('a1', 'r1', 'area'), a('g1', 'a1', 'group'), a('a2', 'r1', 'area'), a('r2', null), a('a3', 'r2', 'area'), a('g3', 'a3', 'group')];
  it('lists the top of each branch without crags', () => {
    // r1 has a crag in g1; a2 is empty; r2 with everything below is empty.
    expect(emptyAreaRoots(areas, ['g1']).map((x) => x.id)).toEqual(['a2', 'r2']);
    expect(emptyAreaRoots(areas, ['g1', 'g3']).map((x) => x.id)).toEqual(['a2']);
    expect(emptyAreaRoots(areas, []).map((x) => x.id)).toEqual(['r1', 'r2']);
  });
});
