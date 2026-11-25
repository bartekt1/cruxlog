// The weather forecast for a crag, from MET Norway (api.met.no, free also for commercial use; the app must name itself in
// User-Agent, keep to a few decimals, cache and honour Expires). Only the crag's coordinates are sent, never the user's
// position. The last forecast is kept on the phone, so it shows without signal too.
import { File, Paths } from 'expo-file-system';
import { dailyForecast, metCoord, type DayForecast, type MetResponse } from '../domain/metno';


const URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const USER_AGENT = 'Cruxlog/1.1 github.com/bartekt1/cruxlog';
const HOUR = 3_600_000;

type Cached = { fetchedAt: number; expires: number; lastModified: string | null; data: MetResponse };

export type Forecast = { days: DayForecast[]; fetchedAt: number; stale: boolean };

function cacheFile(lat: number, lng: number) {
  return new File(Paths.cache, `metno-${metCoord(lat)}_${metCoord(lng)}.json`);
}

function readCache(lat: number, lng: number): Cached | null {
  try {
    const f = cacheFile(lat, lng);
    return f.exists ? (JSON.parse(f.textSync()) as Cached) : null;
  } catch {
    return null;
  }
}

function writeCache(lat: number, lng: number, c: Cached) {
  try {
    const f = cacheFile(lat, lng);
    if (!f.exists) f.create();
    f.write(JSON.stringify(c));
  } catch { /* only a cache: the forecast still shows */ }
}

/** The forecast for a crag: from the cache while MET says it is fresh, else asked anew; without internet the last one, marked stale. */
export async function fetchForecast(lat: number, lng: number): Promise<Forecast> {
  const cached = readCache(lat, lng);
  const now = Date.now();
  if (cached && now < cached.expires) return { days: dailyForecast(cached.data), fetchedAt: cached.fetchedAt, stale: false };
  try {
    const res = await fetch(`${URL}?lat=${metCoord(lat)}&lon=${metCoord(lng)}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...(cached?.lastModified ? { 'If-Modified-Since': cached.lastModified } : {}) },
    });
    const expires = Date.parse(res.headers.get('Expires') ?? '') || now + HOUR;
    if (res.status === 304 && cached) {
      writeCache(lat, lng, { ...cached, expires });
      return { days: dailyForecast(cached.data), fetchedAt: cached.fetchedAt, stale: false };
    }
    if (!res.ok) throw new Error(`MET ${res.status}`);
    const data = (await res.json()) as MetResponse;
    writeCache(lat, lng, { fetchedAt: now, expires, lastModified: res.headers.get('Last-Modified'), data });
    return { days: dailyForecast(data), fetchedAt: now, stale: false };
  } catch (e) {
    if (cached) return { days: dailyForecast(cached.data), fetchedAt: cached.fetchedAt, stale: true };
    throw e;
  }
}
