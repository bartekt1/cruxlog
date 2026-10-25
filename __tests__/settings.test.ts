import { DEFAULT_SETTINGS, parseSettings, resolveLanguage } from '../src/domain/settings';

describe('settings', () => {
  it('reads saved values', () => {
    expect(parseSettings('{"language":"pl","routeSystem":"fr","boulderSystem":"v","themeMode":"dark","lastBackupAt":1700000000000}'))
      .toEqual({ language: 'pl', routeSystem: 'fr', themeMode: 'dark', mapBase: 'standard', lastBackupAt: 1700000000000, backupDir: null, backupDirName: '', autoBackupAt: null, autoBackupTryAt: null, autoBackupError: '', photosSyncedAt: null, cardStyle: 'guide', photoFit: 'whole', skippedUpdate: null });
    expect(parseSettings('{"photoFit":"fill"}').photoFit).toBe('fill');
    expect(parseSettings('{"photoFit":"zoom"}').photoFit).toBe('whole');
    expect(parseSettings('{"skippedUpdate":52}').skippedUpdate).toBe(52);
    expect(parseSettings('{"skippedUpdate":"52"}').skippedUpdate).toBeNull();
    expect(parseSettings('{"cardStyle":"polaroid"}').cardStyle).toBe('polaroid');
    expect(parseSettings('{"cardStyle":"comic"}').cardStyle).toBe('guide');
    expect(parseSettings('{"photosSyncedAt":7}').photosSyncedAt).toBe(7);
    expect(parseSettings('{"photosSyncedAt":"x"}').photosSyncedAt).toBeNull();
    expect(parseSettings('{"autoBackupAt":5,"autoBackupTryAt":"x","autoBackupError":"boom"}')).toMatchObject({ autoBackupAt: 5, autoBackupTryAt: null, autoBackupError: 'boom' });
    expect(parseSettings('{"backupDir":"content://x/tree/y","backupDirName":"Cruxlog"}')).toMatchObject({ backupDir: 'content://x/tree/y', backupDirName: 'Cruxlog' });
    expect(parseSettings('{"backupDir":"","backupDirName":5}')).toMatchObject({ backupDir: null, backupDirName: '' });
    expect(parseSettings('{"lastBackupAt":"yesterday"}').lastBackupAt).toBeNull();
  });
  it('falls back to defaults for missing, corrupt or invalid values', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('"pl"')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"language":"de","routeSystem":"font","boulderSystem":"kr","themeMode":"pink"}')).toEqual(DEFAULT_SETTINGS);
  });
  it('prefers the saved language, then the device language', () => {
    expect(resolveLanguage('en', 'pl')).toBe('en');
    expect(resolveLanguage(null, 'pl')).toBe('pl');
    expect(resolveLanguage(null, 'de')).toBe('en');
    expect(resolveLanguage(null, undefined)).toBe('en');
  });
});
