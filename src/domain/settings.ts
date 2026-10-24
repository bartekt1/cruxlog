import { ROUTE_SYSTEMS, type GradeSystem } from './grades';

export type Lang = 'pl' | 'en';
export type ThemeMode = 'system' | 'light' | 'dark';
export type MapBase = 'standard' | 'topo';
/** The look of a share card (src/ui/cards); the last one picked is used next time. */
export const CARD_STYLES = ['guide', 'full', 'polaroid', 'poster', 'ticket', 'night', 'topo'] as const;
export type CardStyle = typeof CARD_STYLES[number];
export type Settings = {
  language: Lang | null; routeSystem: GradeSystem; themeMode: ThemeMode; mapBase: MapBase; lastBackupAt: number | null;
  /** The folder (Android tree URI) automatic backups go to, and its name for display; null = not chosen. */
  backupDir: string | null; backupDirName: string;
  /** The last good automatic copy, the last try (good or not) and why it failed ('' when it did not). */
  autoBackupAt: number | null; autoBackupTryAt: number | null; autoBackupError: string;
  /** When the photos were last copied into the backup folder (null = not yet). */
  photosSyncedAt: number | null;
  cardStyle: CardStyle;
};

export const DEFAULT_SETTINGS: Settings = { language: null, routeSystem: 'kr', themeMode: 'system', mapBase: 'standard', lastBackupAt: null, backupDir: null, backupDirName: '', autoBackupAt: null, autoBackupTryAt: null, autoBackupError: '', photosSyncedAt: null, cardStyle: 'guide' };

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
    backupDir: typeof data.backupDir === 'string' && data.backupDir ? data.backupDir : null,
    backupDirName: typeof data.backupDirName === 'string' ? data.backupDirName : '',
    autoBackupAt: typeof data.autoBackupAt === 'number' && Number.isFinite(data.autoBackupAt) ? data.autoBackupAt : null,
    autoBackupTryAt: typeof data.autoBackupTryAt === 'number' && Number.isFinite(data.autoBackupTryAt) ? data.autoBackupTryAt : null,
    autoBackupError: typeof data.autoBackupError === 'string' ? data.autoBackupError : '',
    photosSyncedAt: typeof data.photosSyncedAt === 'number' && Number.isFinite(data.photosSyncedAt) ? data.photosSyncedAt : null,
    cardStyle: pick<CardStyle>(data.cardStyle, CARD_STYLES, DEFAULT_SETTINGS.cardStyle),
  };
}

/** The app language: the saved choice, else the device language if supported, else English. */
export function resolveLanguage(saved: Lang | null, deviceLanguage: string | null | undefined): Lang {
  return saved ?? (deviceLanguage === 'pl' ? 'pl' : 'en');
}
