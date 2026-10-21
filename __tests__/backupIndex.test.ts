import { addCopy, dropCopies, emptyIndex, expiredCopies, mergeScan, parseIndex, readPhotoMarker, withPhotoMarker } from '../src/domain/backupIndex';

const copy = (n: number) => ({ uri: `content://drive/doc/${n}`, at: n * 1000, size: 400_000 });

describe('backup index', () => {
  it('keeps the newest copies first and names those beyond five for deletion', () => {
    let index = emptyIndex();
    for (const n of [3, 1, 6, 2, 5, 4, 7]) index = addCopy(index, copy(n));
    expect(index.copies.map((c) => c.at / 1000)).toEqual([7, 6, 5, 4, 3, 2, 1]);
    expect(expiredCopies(index).map((c) => c.at / 1000)).toEqual([2, 1]);
    expect(dropCopies(index, expiredCopies(index).map((c) => c.uri)).copies).toHaveLength(5);
    expect(addCopy(index, copy(7)).copies).toHaveLength(7); // the same address is not added twice
  });
  it('survives a round trip and a damaged value', () => {
    const index = { ...addCopy(emptyIndex(), copy(1)), photoDir: 'content://drive/dir/1', photos: { a: 'content://drive/doc/a' }, scanned: true };
    expect(parseIndex(JSON.stringify(index))).toEqual(index);
    expect(parseIndex(null)).toEqual(emptyIndex());
    expect(parseIndex('{not json')).toEqual(emptyIndex());
    expect(parseIndex('{"copies":[{"uri":1}],"photos":{"a":5},"photoDir":7}')).toEqual(emptyIndex());
  });
  it('merges what a look through the folder found without losing what is known', () => {
    const known = { ...addCopy(emptyIndex(), copy(2)), photoDir: 'dir-known', photos: { a: 'uri-a' } };
    const merged = mergeScan(known, { copies: [copy(1), copy(2)], photos: { a: 'uri-other', b: 'uri-b' }, photoDir: 'dir-found' });
    expect(merged.copies.map((c) => c.at / 1000)).toEqual([2, 1]);
    expect(merged.photoDir).toBe('dir-known');
    expect(merged.photos).toEqual({ a: 'uri-a', b: 'uri-b' });
    expect(merged.scanned).toBe(true);
    expect(mergeScan(emptyIndex(), { copies: [], photos: {}, photoDir: 'd' }).photoDir).toBe('d');
  });
});

describe('photo marker', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46, 0xff, 0xd9]); // SOI, a small APP0, EOI
  it('puts the id in the first bytes and reads it back', () => {
    const marked = withPhotoMarker(jpeg, '3f2a-91bc');
    expect(marked.length).toBe(jpeg.length + 4 + 'cruxlog:3f2a-91bc'.length);
    expect([...marked.slice(0, 4)]).toEqual([0xff, 0xd8, 0xff, 0xfe]);
    expect([...marked.slice(-8)]).toEqual([...jpeg.slice(2)]); // the picture itself follows unchanged
    expect(readPhotoMarker(marked.slice(0, 128))).toBe('3f2a-91bc');
    expect(readPhotoMarker(marked)).toBe('3f2a-91bc');
  });
  it('knows files that are not marked photos', () => {
    expect(readPhotoMarker(jpeg)).toBeNull();
    expect(readPhotoMarker(new Uint8Array([1, 2, 3, 4, 5, 6, 7]))).toBeNull();
    expect(readPhotoMarker(new Uint8Array([]))).toBeNull();
    expect(withPhotoMarker(new Uint8Array([1, 2, 3, 4, 5]), 'x')).toEqual(new Uint8Array([1, 2, 3, 4, 5])); // not a JPEG: unchanged
  });
});
