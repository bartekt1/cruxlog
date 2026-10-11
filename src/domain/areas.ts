// Areas above a crag: region → area ("rejon") → group (optional). Stored in one table with a parent link.

export type AreaLevel = 'region' | 'area' | 'group';
export const AREA_LEVELS: AreaLevel[] = ['region', 'area', 'group'];

export type Area = { id: string; name: string; level: AreaLevel; parent_id: string | null };

/** The level a new child of `parent` gets, or null when nothing can go below it (a group holds only crags). */
export function childLevel(parent: Pick<Area, 'level'> | null): AreaLevel | null {
  if (!parent) return 'region';
  return parent.level === 'region' ? 'area' : parent.level === 'area' ? 'group' : null;
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

/** Region, area and group names of a crag's area, by level. */
export function pathNames(areas: Area[], id: string | null): { region: string; area: string; group: string } {
  const path = areaPath(areas, id);
  const of = (l: AreaLevel) => path.find((a) => a.level === l)?.name ?? '';
  return { region: of('region'), area: of('area'), group: of('group') };
}

export function childrenOf(areas: Area[], parentId: string | null): Area[] {
  return areas.filter((a) => (a.parent_id ?? null) === parentId).sort((a, b) => a.name.localeCompare(b.name));
}

/** Number of crags in an area and all areas below it. `cragAreaIds` holds each crag's area id. */
export function cragCount(areas: Area[], areaId: string, cragAreaIds: (string | null)[]): number {
  const inside = new Set<string>([areaId]);
  for (let grew = true; grew;) {
    grew = false;
    for (const a of areas) if (a.parent_id && inside.has(a.parent_id) && !inside.has(a.id)) { inside.add(a.id); grew = true; }
  }
  return cragAreaIds.filter((id) => id != null && inside.has(id)).length;
}
