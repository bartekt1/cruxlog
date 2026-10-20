// What a shared card or message says: the crag's position as a map link, and the text sent next to or instead of the card.

export type SharePlace = { lat: number; lng: number; approx: boolean };

/** Coordinates as shown on a card, e.g. "49.74222, 21.78508". */
export function coordsLabel(p: { lat: number; lng: number }): string {
  return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
}

/** A link every phone opens in its map app (Google Maps search by coordinates). */
export function mapLink(p: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
}

/**
 * The plain-text version: headline, detail lines, the user's own message and the map link.
 * An approximate position is called that, so nobody takes it for the exact spot.
 * `place` is null when the position is left out or the crag has none.
 */
export function shareMessage(x: {
  headline: string; details: string[]; message: string; place: SharePlace | null; mapLabel: string; approxLabel: string;
}): string {
  const parts = [x.headline, ...x.details].map((s) => s.trim()).filter(Boolean);
  const text = [parts.join('\n')];
  if (x.message.trim()) text.push(x.message.trim());
  if (x.place) text.push(`${x.mapLabel}${x.place.approx ? ` (${x.approxLabel})` : ''}: ${mapLink(x.place)}`);
  return text.join('\n\n');
}
