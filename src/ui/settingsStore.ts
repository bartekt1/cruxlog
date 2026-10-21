import { Storage } from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import type { GradeSystem } from '../domain/grades';
import { parseSettings, type Lang, type MapBase, type Settings, type ThemeMode } from '../domain/settings';

const KEY = 'settings';

type SettingsState = Settings & {
  setLanguage: (l: Lang) => void;
  setRouteSystem: (s: GradeSystem) => void;
  setThemeMode: (m: ThemeMode) => void;
  setMapBase: (m: MapBase) => void;
  setLastBackupAt: (t: number) => void;
  setBackupDir: (uri: string | null, name?: string) => void;
  /** Records a try: ok = it worked (error ''), else the reason. */
  setAutoBackupResult: (at: number, error: string) => void;
  /** The photos are in the folder as of `at`; null forgets it. */
  setPhotosSynced: (at: number | null) => void;
};

function load(): Settings {
  try {
    return parseSettings(Storage.getItemSync(KEY));
  } catch {
    return parseSettings(null);
  }
}

// Saved synchronously in a small SQLite key-value store, so the first render already uses them.
export const useSettings = create<SettingsState>((set, get) => {
  const save = (patch: Partial<Settings>) => {
    set(patch);
    const { language, routeSystem, themeMode, mapBase, lastBackupAt, backupDir, backupDirName, autoBackupAt, autoBackupTryAt, autoBackupError, photosSyncedAt } = get();
    try {
      Storage.setItemSync(KEY, JSON.stringify({
        language, routeSystem, themeMode, mapBase, lastBackupAt, backupDir, backupDirName, autoBackupAt, autoBackupTryAt, autoBackupError, photosSyncedAt,
      }));
    } catch {
      // Keep the in-memory value; it will be saved on the next change.
    }
  };
  return {
    ...load(),
    setLanguage: (language) => save({ language }),
    setRouteSystem: (routeSystem) => save({ routeSystem }),
    setThemeMode: (themeMode) => save({ themeMode }),
    setMapBase: (mapBase) => save({ mapBase }),
    setLastBackupAt: (lastBackupAt) => save({ lastBackupAt }),
    // A new folder starts afresh: no earlier copy counts for it.
    setBackupDir: (backupDir, backupDirName = '') => save({ backupDir, backupDirName: backupDir ? backupDirName : '', autoBackupAt: null, autoBackupTryAt: null, autoBackupError: '', photosSyncedAt: null }),
    // A good photo sync also clears an earlier photo error.
    setPhotosSynced: (photosSyncedAt) => save(photosSyncedAt != null && get().autoBackupError.startsWith('photos:') ? { photosSyncedAt, autoBackupError: '' } : { photosSyncedAt }),
    setAutoBackupResult: (at, error) => save(error ? { autoBackupTryAt: at, autoBackupError: error } : { autoBackupAt: at, autoBackupTryAt: at, autoBackupError: '', lastBackupAt: at }),
  };
});
