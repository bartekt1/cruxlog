import { ROUTE_SYSTEMS, type GradeSystem } from './grades';

export type Lang = 'pl' | 'en';
export type ThemeMode = 'system' | 'light' | 'dark';
export type MapBase = 'standard' | 'topo';
export type Settings = { language: Lang | null; routeSystem: GradeSystem; themeMode: ThemeMode; mapBase: MapBase; lastBackupAt: number | null };

export const DEFAULT_SETTINGS: Settings = { language: null, routeSystem: 'kr', themeMode: 'system', mapBase: 'standard', lastBackupAt: null };

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
    themeMode: pick<ThemeMode>(data.themeMode, ['system', 'light', 'dark'], DEFAULT_SETTINGS.themeMode),
    mapBase: pick<MapBase>(data.mapBase, ['standard', 'topo'], DEFAULT_SETTINGS.mapBase),
    lastBackupAt: typeof data.lastBackupAt === 'number' && Number.isFinite(data.lastBackupAt) ? data.lastBackupAt : null,
  };
}

/** The app language: the saved choice, else the device language if supported, else English. */
export function resolveLanguage(saved: Lang | null, deviceLanguage: string | null | undefined): Lang {
  return saved ?? (deviceLanguage === 'pl' ? 'pl' : 'en');
}
