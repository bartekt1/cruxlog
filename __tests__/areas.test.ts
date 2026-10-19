import { areaPath, childLevel, childrenOf, cragCounts, pathLabel, pathLabels, pathNames, splitPath, type Area } from '../src/domain/areas';

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
