import { Alert } from 'react-native';
import { AppError } from '../domain/errors';
import i18n from '../i18n';

/** The text to show for an error: an AppError in the user's language, anything else as "Something went wrong: …". */
export function errorMessage(e: unknown): string {
  if (e instanceof AppError) return i18n.t(e.key, e.params);
  return i18n.t('common.failed', { message: (e as Error)?.message || String(e) });
}

export function showError(e: unknown): void {
  Alert.alert(i18n.t('settings.problem'), errorMessage(e));
}

/** Runs something the user started (save, delete…); a failure is shown instead of being lost. Resolves to whether it worked. */
export async function runOrAlert(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (e) {
    showError(e);
    return false;
  }
}
