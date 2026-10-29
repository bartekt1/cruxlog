// Distances on the ground for "nearby crags". Positions stay on the device; nothing here talks to a server.

export type LatLng = { lat: number; lng: number };

const R = 6371000; // mean Earth radius in metres
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres (haversine). */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isLatLng(lat: unknown, lng: unknown): boolean {
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

/** The `limit` items with a position closest to `from`, nearest first, each with its distance. Items without a position are skipped. */
export function nearest<T extends { lat: number | null; lng: number | null }>(items: T[], from: LatLng, limit = 8, maxM = Infinity): (T & { distance: number })[] {
  return items
    .filter((x) => isLatLng(x.lat, x.lng))
    .map((x) => ({ ...x, distance: distanceM(from, { lat: x.lat!, lng: x.lng! }) }))
    .filter((x) => x.distance <= maxM)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/** "350 m", "1,2 km", "18 km" (decimal comma for Polish). */
export function formatDistance(m: number, lang: string): string {
  if (m < 950) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  const km = m / 1000;
  const text = km < 10 ? km.toFixed(1) : String(Math.round(km));
  return `${lang === 'pl' ? text.replace('.', ',') : text} km`;
}

/** West, south, east, north around the points, with some margin; null without points. */
export function boundsOf(points: LatLng[], margin = 0.01): [number, number, number, number] | null {
  if (!points.length) return null;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return [Math.min(...lngs) - margin, Math.min(...lats) - margin, Math.max(...lngs) + margin, Math.max(...lats) + margin];
}

/**
 * The address that opens the phone's navigation app with the crag as the destination: a geo: link on Android (the user picks
 * Google Maps, Mapy.cz, OsmAnd…), Apple Maps on iOS. Only the crag's coordinates and name go in it, never the user's position.
 */
export function navigationUrl(at: LatLng, name: string, platform: 'android' | 'ios'): string {
  const lat = at.lat.toFixed(6);
  const lng = at.lng.toFixed(6);
  const label = encodeURIComponent(name.replace(/[()]/g, ' ').trim());
  return platform === 'ios' ? `maps://?daddr=${lat},${lng}&q=${label}` : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
}
