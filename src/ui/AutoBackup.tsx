import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { autoBackupIfDue } from './autoBackup';
import { cleanOrphanPhotos } from './photos';

/** Renders nothing. Right after the app opens it tidies up unused photo files, then makes the automatic copy if one is due; the copy is also checked whenever the app comes back to the front. */
export function AutoBackup() {
  const db = useSQLiteContext();
  useEffect(() => {
    // A short pause so the first screen is not slowed down.
    let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => { timer = undefined; cleanOrphanPhotos(db).then(() => autoBackupIfDue(db)); }, 3000);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') autoBackupIfDue(db); });
    return () => { if (timer) clearTimeout(timer); sub.remove(); };
  }, [db]);
  return null;
}
