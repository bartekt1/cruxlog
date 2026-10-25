import { useEffect } from 'react';
import { Platform } from 'react-native';
import { shouldOffer } from '../domain/updates';
import { useSettings } from './settingsStore';
import { fetchLatestRelease, installedCode, offerRelease } from './updates';

/** Renders nothing. A few seconds after the app opens it looks for a newer version on GitHub and offers it; without internet it stays quiet. */
export function UpdateCheck() {
  useEffect(() => {
    if (Platform.OS !== 'android' || installedCode() == null) return;
    let live = true;
    const timer = setTimeout(() => {
      fetchLatestRelease().then((r) => {
        if (live && r && shouldOffer(r, installedCode(), useSettings.getState().skippedUpdate)) offerRelease(r, true);
      }, () => { /* no internet or GitHub busy: try again next time the app opens */ });
    }, 5000);
    return () => { live = false; clearTimeout(timer); };
  }, []);
  return null;
}
