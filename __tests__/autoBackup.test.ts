import { backupDue, photosDue, backupFileName, devicePath, folderKind, packBackup, peekBackup, PEEK_BYTES, RETRY_AFTER_MS, sameBytes, unpackBackup } from '../src/domain/autoBackup';

const DAY = 86_400_000;

describe('auto backup names', () => {
  it('names a copy by local date and time', () => {
    expect(backupFileName(new Date(2026, 9, 20, 8, 12).getTime())).toBe('cruxlog-2026-10-20-0812.json.gz');
    expect(backupFileName(new Date(2026, 0, 5, 23, 5).getTime())).toBe('cruxlog-2026-01-05-2305.json.gz');
  });
});

describe('when a backup is due', () => {
  const now = 100 * DAY;
  it('is due when none was made yet', () => {
    expect(backupDue({ now, lastAt: null, changedAt: null, lastTryAt: null })).toBe(true);
  });
  it('waits for the interval, and for a change', () => {
    expect(backupDue({ now, lastAt: now - 3 * DAY, changedAt: now - DAY, lastTryAt: null })).toBe(false);
    expect(backupDue({ now, lastAt: now - 8 * DAY, changedAt: now - 9 * DAY, lastTryAt: null })).toBe(false);
    expect(backupDue({ now, lastAt: now - 8 * DAY, changedAt: null, lastTryAt: null })).toBe(false);
    expect(backupDue({ now, lastAt: now - 7 * DAY, changedAt: now - DAY, lastTryAt: null })).toBe(true);
  });
  it('does not retry for an hour after a failed try', () => {
    expect(backupDue({ now, lastAt: null, changedAt: null, lastTryAt: now - RETRY_AFTER_MS + 1 })).toBe(false);
    expect(backupDue({ now, lastAt: null, changedAt: null, lastTryAt: now - RETRY_AFTER_MS })).toBe(true);
  });
});

describe('folder labels', () => {
  it('tells Drive from phone storage', () => {
    expect(folderKind('content://com.google.android.apps.docs.storage/tree/acc%3D1%3Bdoc%3Dencoded%3Dabc')).toBe('drive');
    expect(folderKind('content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FCruxlog')).toBe('device');
    expect(folderKind('content://other/tree/x')).toBe('other');
    expect(devicePath('content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FCruxlog')).toBe('Documents/Cruxlog');
    expect(devicePath('nonsense')).toBe('');
  });
});

describe('backup file contents', () => {
  it('packs to gzip and reads back; plain JSON is read too', () => {
    const json = JSON.stringify({ app: 'cruxlog', note: 'Łysa Skała '.repeat(2000) });
    const packed = packBackup(json);
    expect(packed.length).toBeLessThan(json.length / 10);
    expect(unpackBackup(packed)).toEqual(JSON.parse(json));
    expect(unpackBackup(new TextEncoder().encode(json))).toEqual(JSON.parse(json));
    expect(() => unpackBackup(new TextEncoder().encode('not json'))).toThrow();
  });
});

describe('photosDue', () => {
  const now = 1_800_000_000_000;
  const base = { now, changedAt: now - 1000, syncedAt: null, failed: false, lastTryAt: null };
  it('copies new photos soon after they appear, not once a week', () => {
    expect(photosDue(base)).toBe(true);
    expect(photosDue({ ...base, syncedAt: now - 500 })).toBe(false);
    expect(photosDue({ ...base, syncedAt: now - 5000 })).toBe(true);
    expect(photosDue({ ...base, changedAt: null })).toBe(false);
  });
  it('waits an hour after a failed try', () => {
    expect(photosDue({ ...base, failed: true, lastTryAt: now - 60_000 })).toBe(false);
    expect(photosDue({ ...base, failed: true, lastTryAt: now - RETRY_AFTER_MS - 1 })).toBe(true);
    expect(photosDue({ ...base, failed: false, lastTryAt: now - 60_000 })).toBe(true);
  });
});

describe('peekBackup', () => {
  // A backup as exportBackup writes it, with enough rows that the file is much longer than the peeked start.
  const rows = Array.from({ length: 3000 }, (_, i) => ({ id: `r${i}`, name: `Droga ${i} ${Math.random()}`, grade: i % 40 }));
  const json = JSON.stringify({ app: 'cruxlog', version: 9, exportedAt: 1763700000000, tables: { route: rows } });
  it('recognises a gzipped copy from its first bytes', () => {
    const bytes = packBackup(json);
    expect(bytes.length).toBeGreaterThan(PEEK_BYTES * 4);
    expect(peekBackup(bytes.subarray(0, PEEK_BYTES))).toEqual({ at: 1763700000000 });
  });
  it('recognises a plain JSON copy', () => {
    expect(peekBackup(new TextEncoder().encode(json).subarray(0, PEEK_BYTES))).toEqual({ at: 1763700000000 });
  });
  it('says no to other files', () => {
    expect(peekBackup(packBackup(JSON.stringify({ app: 'other', version: 1, exportedAt: 1 })).subarray(0, PEEK_BYTES))).toBeNull();
    expect(peekBackup(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]))).toBeNull();
    expect(peekBackup(new Uint8Array([0x1f, 0x8b, 0, 0]))).toBeNull();
    expect(peekBackup(new Uint8Array())).toBeNull();
  });
});

describe('sameBytes', () => {
  it('is true only for the same length and content', () => {
    expect(sameBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(sameBytes(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
    expect(sameBytes(new Uint8Array([1, 2, 4]), new Uint8Array([1, 2, 3]))).toBe(false);
    expect(sameBytes(new Uint8Array(), new Uint8Array())).toBe(true);
  });
});
