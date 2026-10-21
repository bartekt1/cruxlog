import { backupDue, backupFileName, devicePath, folderKind, packBackup, RETRY_AFTER_MS, unpackBackup } from '../src/domain/autoBackup';

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
