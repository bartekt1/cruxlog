import { Storage } from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import type { GradeSystem } from '../domain/grades';
import { parseSettings, type Lang, type Settings } from '../domain/settings';

const KEY = 'settings';

type SettingsState = Settings & {
  setLanguage: (l: Lang) => void;
  setRouteSystem: (s: GradeSystem) => void;
  setBoulderSystem: (s: GradeSystem) => void;
  setLastBackupAt: (t: number) => void;
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
    const { language, routeSystem, boulderSystem, lastBackupAt } = get();
    try {
      Storage.setItemSync(KEY, JSON.stringify({ language, routeSystem, boulderSystem, lastBackupAt }));
    } catch {
      // Keep the in-memory value; it will be saved on the next change.
    }
  };
  return {
    ...load(),
    setLanguage: (language) => save({ language }),
    setRouteSystem: (routeSystem) => save({ routeSystem }),
    setBoulderSystem: (boulderSystem) => save({ boulderSystem }),
    setLastBackupAt: (lastBackupAt) => save({ lastBackupAt }),
  };
});
