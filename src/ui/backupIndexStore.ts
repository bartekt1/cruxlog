import { Storage } from 'expo-sqlite/kv-store';
import { emptyIndex, parseIndex, type BackupIndex } from '../domain/backupIndex';

const KEY = 'backupIndex';
let cache: BackupIndex | null = null;

/** What the app remembers about its backup folder (kept in the small key-value store, apart from the settings). */
export function getBackupIndex(): BackupIndex {
  if (!cache) {
    try { cache = parseIndex(Storage.getItemSync(KEY)); } catch { cache = emptyIndex(); }
  }
  return cache;
}

export function setBackupIndex(index: BackupIndex): void {
  cache = index;
  try { Storage.setItemSync(KEY, JSON.stringify(index)); } catch { /* kept in memory; saved with the next change */ }
}

/** A new folder starts with nothing known. */
export function resetBackupIndex(): void {
  setBackupIndex(emptyIndex());
}
