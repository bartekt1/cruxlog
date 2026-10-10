import { BOULDER_SYSTEMS, ROUTE_SYSTEMS, type GradeSystem } from './grades';

export type Lang = 'pl' | 'en';
export type Settings = { language: Lang | null; routeSystem: GradeSystem; boulderSystem: GradeSystem };

export const DEFAULT_SETTINGS: Settings = { language: null, routeSystem: 'kr', boulderSystem: 'font' };

/** Turns stored JSON (possibly old, partial or corrupt) into valid settings. */
export function parseSettings(raw: string | null): Settings {
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object') data = parsed as Record<string, unknown>;
  } catch {
    // Corrupt value: fall back to defaults.
  }
  const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(value as T) ? (value as T) : fallback);
  return {
    language: pick<Lang | null>(data.language, ['pl', 'en'], DEFAULT_SETTINGS.language),
    routeSystem: pick(data.routeSystem, ROUTE_SYSTEMS, DEFAULT_SETTINGS.routeSystem),
    boulderSystem: pick(data.boulderSystem, BOULDER_SYSTEMS, DEFAULT_SETTINGS.boulderSystem),
  };
}

/** The app language: the saved choice, else the device language if supported, else English. */
export function resolveLanguage(saved: Lang | null, deviceLanguage: string | null | undefined): Lang {
  return saved ?? (deviceLanguage === 'pl' ? 'pl' : 'en');
}
