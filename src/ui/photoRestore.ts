import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';
import { restorePhotos, withBackupLock } from './autoBackup';

/** Photos being brought back from the backup folder after a restore: they come after the data, in the background. */
type PhotoRestore = {
  /** True while photos are being restored; `total` is 0 while the folder is still being looked through. */
  active: boolean;
  done: number;
  total: number;
  /** How many came back the last time (shown when it is over); null before any. */
  restored: number | null;
  error: string;
};

export const usePhotoRestore = create<PhotoRestore>(() => ({ active: false, done: 0, total: 0, restored: null, error: '' }));

/** Starts bringing back the missing photos from the folder, unless that is already under way. Does not wait for it. */
export function restorePhotosInBackground(db: SQLiteDatabase, dirUri: string): void {
  if (usePhotoRestore.getState().active) return;
  usePhotoRestore.setState({ active: true, done: 0, total: 0, restored: null, error: '' });
  withBackupLock(() => restorePhotos(db, dirUri, (done, total) => usePhotoRestore.setState({ done, total })))
    .then((restored) => usePhotoRestore.setState({ active: false, restored }))
    .catch((e: unknown) => usePhotoRestore.setState({ active: false, error: e instanceof Error ? e.message : String(e) }));
}
