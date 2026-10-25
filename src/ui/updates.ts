import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Alert, Linking, Platform, ToastAndroid } from 'react-native';
import { AppError } from '../domain/errors';
import { parseRelease, RELEASES_URL, type Release } from '../domain/updates';
import i18n from '../i18n';
import { runOrAlert } from './errors';
import { useSettings } from './settingsStore';

/** This build's number (Android versionCode, set by the GitHub build); null when unknown (e.g. a development build). */
export function installedCode(): number | null {
  const code = Constants.expoConfig?.android?.versionCode;
  return typeof code === 'number' && code > 1 ? code : null;
}

/** The version shown to the user, e.g. "1.0.46". */
export const installedName = (): string => Constants.expoConfig?.version ?? '?';

/** The newest published version, or null when there is none. Throws when GitHub cannot be reached. */
export async function fetchLatestRelease(): Promise<Release | null> {
  let res: Response;
  try {
    res = await fetch(RELEASES_URL, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
  } catch {
    throw new AppError('updates.offline');
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new AppError('updates.failed', { status: res.status });
  return parseRelease(await res.json());
}

/** Downloads the APK and opens Android's installer (it asks the user to confirm; the first time also to allow Cruxlog to install apps). */
export async function installRelease(r: Release): Promise<void> {
  if (Platform.OS !== 'android') return void Linking.openURL(r.apkUrl);
  ToastAndroid.show(i18n.t('updates.downloading'), ToastAndroid.LONG);
  const file = new File(Paths.cache, 'cruxlog-update.apk');
  if (file.exists) file.delete();
  try {
    await File.downloadFileAsync(r.apkUrl, file);
  } catch {
    throw new AppError('updates.downloadFailed');
  }
  try {
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: await getContentUriAsync(file.uri), type: 'application/vnd.android.package-archive', flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    });
  } catch {
    // The installer could not be opened from the app: let the browser download it instead.
    await Linking.openURL(r.apkUrl);
  }
}

/** Asks whether to install `r`; "Later" stops offering this version on start (Settings still offers it). */
export function offerRelease(r: Release, onStart: boolean): void {
  Alert.alert(i18n.t('updates.title'), i18n.t('updates.question', { version: r.name }), [
    { text: i18n.t('updates.later'), style: 'cancel', onPress: () => { if (onStart) useSettings.getState().setSkippedUpdate(r.code); } },
    { text: i18n.t('updates.install'), onPress: () => { runOrAlert(() => installRelease(r)); } },
  ]);
}
