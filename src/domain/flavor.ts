/**
 * Which build this is, from EXPO_PUBLIC_FLAVOR set when it is built: the APK from GitHub releases (the default), the Google Play
 * build, or the DEV test build. Only the GitHub APK updates itself; the store build is updated by Google Play.
 */
export type Flavor = 'github' | 'store' | 'dev';

export function flavorOf(value: unknown): Flavor {
  return value === 'store' || value === 'dev' ? value : 'github';
}

export const selfUpdates = (flavor: Flavor): boolean => flavor === 'github';
