import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import type { LatLng } from '../domain/geo';

export type LocationState = 'unknown' | 'granted' | 'denied' | 'off';

/**
 * The phone's position for the map and "nearby crags". It is read only on the device and never stored or sent.
 * Permission is asked only when `locate()` is called (the user tapped a button); if it was granted before, the
 * position is read right away.
 */
export function useLocation() {
  const [state, setState] = useState<LocationState>('unknown');
  const [position, setPosition] = useState<LatLng | null>(null);
  const [busy, setBusy] = useState(false);

  const read = useCallback(async () => {
    setBusy(true);
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
      if (last) setPosition({ lat: last.coords.latitude, lng: last.coords.longitude });
      const now = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPosition({ lat: now.coords.latitude, lng: now.coords.longitude });
      setState('granted');
    } catch {
      // Location services off or no fix yet: keep the last known position.
      setState(await Location.hasServicesEnabledAsync().then((on) => (on ? 'granted' : 'off')).catch(() => 'off'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then((p) => { if (p.granted) read(); else setState(p.canAskAgain ? 'unknown' : 'denied'); })
      .catch(() => setState('unknown'));
  }, [read]);

  /** Asks for permission if needed, then reads the position. Returns it, or null. */
  const locate = useCallback(async (): Promise<boolean> => {
    const p = await Location.requestForegroundPermissionsAsync();
    if (!p.granted) { setState('denied'); return false; }
    await read();
    return true;
  }, [read]);

  return { state, position, busy, locate };
}

/** One fresh GPS fix for saving a crag's position (asks for permission if needed); null if not allowed or no fix. */
export async function currentPosition(): Promise<LatLng | null> {
  const p = await Location.requestForegroundPermissionsAsync();
  if (!p.granted) return null;
  try {
    const at = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: at.coords.latitude, lng: at.coords.longitude };
  } catch {
    return null;
  }
}
