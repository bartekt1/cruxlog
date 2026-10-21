import { formatBytes, missingIds, orphanFiles, PHOTO_EDGE, PHOTO_LIMIT, photoFileName, photoIdFromFile, scaleTo, slotsLeft } from '../src/domain/photos';

describe('photos', () => {
  it('counts the slots left of five', () => {
    expect(PHOTO_LIMIT.ascent).toBe(5);
    expect(slotsLeft(0)).toBe(5);
    expect(slotsLeft(3)).toBe(2);
    expect(slotsLeft(7)).toBe(0);
  });
  it('allows more and bigger photos for a crag or a wall than for an ascent', () => {
    expect(PHOTO_LIMIT).toEqual({ ascent: 5, crag: 10, sector: 10 });
    expect(PHOTO_EDGE).toEqual({ ascent: 1600, crag: 2000, sector: 2000 });
    expect(slotsLeft(4, 'crag')).toBe(6);
    expect(slotsLeft(10, 'sector')).toBe(0);
    expect(scaleTo(4000, 3000, PHOTO_EDGE.sector)).toEqual({ width: 2000 });
    expect(scaleTo(1800, 1200, PHOTO_EDGE.sector)).toBeNull();
  });
  it('scales the longer side to 1600 and never enlarges', () => {
    expect(scaleTo(4000, 3000)).toEqual({ width: 1600 });
    expect(scaleTo(3000, 4000)).toEqual({ height: 1600 });
    expect(scaleTo(3000, 3000)).toEqual({ width: 1600 });
    expect(scaleTo(1600, 1200)).toBeNull();
    expect(scaleTo(800, 600)).toBeNull();
    expect(scaleTo(0, 0)).toBeNull(); // unknown size: leave it to the caller
  });
  it('names files by id and reads the id back', () => {
    expect(photoFileName('abc-123')).toBe('abc-123.jpg');
    expect(photoIdFromFile('abc-123.jpg')).toBe('abc-123');
    expect(photoIdFromFile('cruxlog-2026-10-20-0812.json.gz')).toBeNull();
    expect(photoIdFromFile('notes.txt')).toBeNull();
  });
  it('finds what is missing and what is left over', () => {
    expect(missingIds(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c']);
    expect(missingIds([], ['x'])).toEqual([]);
    expect(orphanFiles(['a.jpg', 'b.jpg', 'readme.txt'], ['a'])).toEqual(['b.jpg']);
  });
  it('formats sizes', () => {
    expect(formatBytes(300 * 1024, 'en')).toBe('300 KB');
    expect(formatBytes(3.4 * 1_048_576, 'en')).toBe('3.4 MB');
    expect(formatBytes(10, 'en')).toBe('1 KB');
  });
});
