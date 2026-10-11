import { areaPath, childLevel, childrenOf, cragCount, pathLabel, pathNames, type Area } from '../src/domain/areas';

const areas: Area[] = [
  { id: 'r', name: 'Czarnorzeki', level: 'region', parent_id: null },
  { id: 'k', name: 'Kamieniec', level: 'area', parent_id: 'r' },
  { id: 's', name: 'Strzelnica', level: 'area', parent_id: 'r' },
  { id: 'g', name: 'Krowia Turnia', level: 'group', parent_id: 'k' },
  { id: 'j', name: 'Jura', level: 'region', parent_id: null },
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
    expect(childLevel({ level: 'group' })).toBeNull();
  });
  it('lists children sorted and counts crags below an area', () => {
    expect(childrenOf(areas, 'r').map((a) => a.name)).toEqual(['Kamieniec', 'Strzelnica']);
    expect(childrenOf(areas, null).map((a) => a.name)).toEqual(['Czarnorzeki', 'Jura']);
    const crags = ['g', 'g', 'k', 's', 'j', null];
    expect(cragCount(areas, 'r', crags)).toBe(4);
    expect(cragCount(areas, 'k', crags)).toBe(3);
    expect(cragCount(areas, 'j', crags)).toBe(1);
  });
});
