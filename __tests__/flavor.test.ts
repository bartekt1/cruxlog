import { flavorOf, selfUpdates } from '../src/domain/flavor';

describe('flavor', () => {
  it('is the GitHub APK unless the build says otherwise', () => {
    expect(flavorOf(undefined)).toBe('github');
    expect(flavorOf('')).toBe('github');
    expect(flavorOf('something')).toBe('github');
    expect(flavorOf('store')).toBe('store');
    expect(flavorOf('dev')).toBe('dev');
  });
  it('lets only the GitHub APK update itself', () => {
    expect(selfUpdates('github')).toBe(true);
    expect(selfUpdates('store')).toBe(false);
    expect(selfUpdates('dev')).toBe(false);
  });
});
