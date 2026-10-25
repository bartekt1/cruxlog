import { Directory } from 'expo-file-system';
import { AppError } from '../domain/errors';

/** The system folder picker. Returns null when the user backs out. Android keeps the access after a restart. */
export async function pickBackupFolder(): Promise<Directory | null> {
  try {
    return await Directory.pickDirectoryAsync();
  } catch (e) {
    if (/cancel/i.test(String((e as Error)?.message ?? e))) return null;
    throw e;
  }
}

/** Writes a tiny file into the folder, reads it back and removes it; throws when any step fails. */
export function testBackupFolder(dir: Directory): void {
  const file = dir.createFile(`cruxlog-test-${Date.now()}.txt`, 'text/plain');
  try {
    file.write('ok');
    if (file.textSync() !== 'ok') throw new AppError('errors.readBack');
  } finally {
    try { file.delete(); } catch { /* a leftover test file is harmless */ }
  }
}
