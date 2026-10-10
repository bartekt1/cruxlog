import { DEFAULT_SETTINGS, parseSettings, resolveLanguage } from '../src/domain/settings';

describe('settings', () => {
  it('reads saved values', () => {
    expect(parseSettings('{"language":"pl","routeSystem":"fr","boulderSystem":"v"}')).toEqual({ language: 'pl', routeSystem: 'fr', boulderSystem: 'v' });
  });
  it('falls back to defaults for missing, corrupt or invalid values', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('"pl"')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"language":"de","routeSystem":"font","boulderSystem":"kr"}')).toEqual(DEFAULT_SETTINGS);
  });
  it('prefers the saved language, then the device language', () => {
    expect(resolveLanguage('en', 'pl')).toBe('en');
    expect(resolveLanguage(null, 'pl')).toBe('pl');
    expect(resolveLanguage(null, 'de')).toBe('en');
    expect(resolveLanguage(null, undefined)).toBe('en');
  });
});
