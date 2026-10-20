// Areas above a crag: region → area ("rejon") → any number of groups (optional). Stored in one table with a parent link.
// Below the area every level is a group, so imported trees such as
// Jura › Jura Południowa › Garb Tenczyński › Dolina Sanki › Zimny Dół keep all their levels.

export type AreaLevel = 'region' | 'area' | 'group';
export const AREA_LEVELS: AreaLevel[] = ['region', 'area', 'group'];

export type Area = { id: string; name: string; level: AreaLevel; parent_id: string | null };

/** Separates group levels in one text, e.g. "Dolina Sanki › Zimny Dół". */
export const PATH_SEP = '›';

/** "Dolina Sanki › Zimny Dół" → ["Dolina Sanki", "Zimny Dół"] */
export function splitPath(s: string): string[] {
  return s.split(PATH_SEP).map((p) => p.trim()).filter(Boolean);
}

/** The level a new child of `parent` gets: region at the top, then area, then groups at any depth. */
export function childLevel(parent: Pick<Area, 'level'> | null): AreaLevel {
  if (!parent) return 'region';
  return parent.level === 'region' ? 'area' : 'group';
}

/** Level of an area from its depth (0 = region). */
export function levelAt(depth: number): AreaLevel {
  return depth === 0 ? 'region' : depth === 1 ? 'area' : 'group';
}

/** Areas from the top down to `id` (inclusive). Stops on missing parents or cycles. */
export function areaPath(areas: Area[], id: string | null): Area[] {
  const byId = new Map(areas.map((a) => [a.id, a]));
  const out: Area[] = [];
  const seen = new Set<string>();
  for (let cur = id ? byId.get(id) : undefined; cur && !seen.has(cur.id); cur = cur.parent_id ? byId.get(cur.parent_id) : undefined) {
    seen.add(cur.id);
    out.unshift(cur);
  }
  return out;
}

/** "Czarnorzeki › Kamieniec › Krowia Turnia" */
export function pathLabel(areas: Area[], id: string | null): string {
  return areaPath(areas, id).map((a) => a.name).join(' › ');
}

/** Region, area and group names of a crag's area; deeper groups are joined, e.g. "Dolina Sanki › Zimny Dół". */
export function pathNames(areas: Area[], id: string | null): { region: string; area: string; group: string } {
  const names = areaPath(areas, id).map((a) => a.name);
  return { region: names[0] ?? '', area: names[1] ?? '', group: names.slice(2).join(` ${PATH_SEP} `) };
}

/** Path labels of all areas at once (fast for long lists). */
export function pathLabels(areas: Area[]): Map<string, string> {
  const byId = new Map(areas.map((a) => [a.id, a]));
  const out = new Map<string, string>();
  const label = (a: Area, seen: Set<string>): string => {
    const known = out.get(a.id);
    if (known != null) return known;
    const parent = a.parent_id ? byId.get(a.parent_id) : undefined;
    seen.add(a.id);
    const text = parent && !seen.has(parent.id) ? `${label(parent, seen)} ${PATH_SEP} ${a.name}` : a.name;
    out.set(a.id, text);
    return text;
  };
  for (const a of areas) label(a, new Set());
  return out;
}

/** Number of crags in each area including all areas below it. `cragAreaIds` holds each crag's area id. */
export function cragCounts(areas: Area[], cragAreaIds: (string | null)[]): Map<string, number> {
  const byId = new Map(areas.map((a) => [a.id, a]));
  const out = new Map<string, number>();
  for (const id of cragAreaIds) {
    const seen = new Set<string>();
    for (let cur = id ? byId.get(id) : undefined; cur && !seen.has(cur.id); cur = cur.parent_id ? byId.get(cur.parent_id) : undefined) {
      seen.add(cur.id);
      out.set(cur.id, (out.get(cur.id) ?? 0) + 1);
    }
  }
  return out;
}

export function childrenOf(areas: Area[], parentId: string | null): Area[] {
  return areas.filter((a) => (a.parent_id ?? null) === parentId).sort((a, b) => a.name.localeCompare(b.name));
}

/** The area and every area below it. */
export function descendantIds(areas: Area[], id: string): Set<string> {
  const inside = new Set<string>([id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const a of areas) if (a.parent_id && inside.has(a.parent_id) && !inside.has(a.id)) { inside.add(a.id); grew = true; }
  }
  return inside;
}
