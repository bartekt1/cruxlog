// Crag packs: a list (index.json) in the packs repository and one CSV file per pack (a group of crags), in the Cruxlog template.
// The app reads the list, the user picks packs, and each pack is imported like a file (src/db/imports.ts installPack).

/** Where the list of packs is; pack files are next to it (their `file` is relative to this address). */
export const PACKS_INDEX_URL = 'https://raw.githubusercontent.com/bartekt1/cruxlog-paczki/main/index.json';

export type PackInfo = {
  id: string; name: string; region: string; area: string; crags: number; routes: number; version: number; bytes: number; file: string;
  /** [west, south, east, north] of the crags with a position; null when none has one. For offline maps later. */
  bbox: [number, number, number, number] | null;
};

/** Reads the list of packs; anything malformed is left out, a list that is not one at all throws. */
export function parsePackIndex(json: unknown): PackInfo[] {
  const packs = (json as { packs?: unknown })?.packs;
  if (!Array.isArray(packs)) throw new Error('Not a list of packs');
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return packs.flatMap((p: Record<string, unknown>) => {
    const id = str(p?.id); const file = str(p?.file);
    if (!/^[a-z0-9-]+$/.test(id) || !/^paczki\/[a-z0-9-]+\.csv$/.test(file)) return [];
    const bbox = Array.isArray(p.bbox) && p.bbox.length === 4 && p.bbox.every((x) => typeof x === 'number') ? p.bbox as PackInfo['bbox'] : null;
    return [{ id, name: str(p.name) || id, region: str(p.region), area: str(p.area), crags: num(p.crags), routes: num(p.routes), version: num(p.version) || 1, bytes: num(p.bytes), file, bbox }];
  });
}

/** The address of a pack's file, next to the list. */
export const packUrl = (indexUrl: string, p: PackInfo) => new URL(p.file, indexUrl).toString();

export type PackState = 'available' | 'installed' | 'update';

export function packState(p: PackInfo, installedVersion: number | undefined): PackState {
  if (installedVersion == null) return 'available';
  return p.version > installedVersion ? 'update' : 'installed';
}

/** Packs by region and area, in the order of the list, for the screen. */
export function groupPacks(packs: PackInfo[]): { region: string; area: string; packs: PackInfo[] }[] {
  const out: { region: string; area: string; packs: PackInfo[] }[] = [];
  for (const p of packs) {
    const g = out.find((x) => x.region === p.region && x.area === p.area);
    if (g) g.packs.push(p); else out.push({ region: p.region, area: p.area, packs: [p] });
  }
  return out;
}

/**
 * A crag that one pack took over from another by name (see `listMergedPackCrags`): its own key (from its id), the keys of the
 * routes in it now, and the pack holding it.
 */
export type MergedCrag = { ownKey: string; routeKeys: string[]; packId: string };

/** The keys in a pack's file: its crags and its routes. */
export type PackKeys = { crags: Set<string>; routes: Set<string> };

/**
 * The order to reinstall packs in so crags merged by name come apart. A pack whose crag (by its own key) or routes ended up in a
 * crag of another pack is reinstalled first: it gets its crag back (made anew if the crag came from the user's own file first)
 * and takes its routes, with their ascents, back. Then the pack holding the crag, so it gets back what the first one took.
 * Crags taken from the user's own file, with only that pack's routes, are left alone. Empty when there is nothing to repair.
 */
export function packRepairOrder(merged: MergedCrag[], keysByPack: Map<string, PackKeys>): string[] {
  const victims: string[] = [];
  const takers: string[] = [];
  for (const m of merged) {
    if (!keysByPack.has(m.packId)) continue;
    for (const [id, keys] of keysByPack) {
      if (id === m.packId) continue;
      if (!keys.crags.has(m.ownKey) && !m.routeKeys.some((k) => keys.routes.has(k))) continue;
      if (!victims.includes(id)) victims.push(id);
      if (!takers.includes(m.packId)) takers.push(m.packId);
    }
  }
  return [...victims, ...takers.filter((p) => !victims.includes(p))];
}
