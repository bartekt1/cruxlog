// "My crags and routes": what the user added themselves, to be cleaned up (e.g. test entries) several at a time.

export type MineItem = { kind: 'crag' | 'route'; id: string; routes: number; ascents: number };

/** What deleting the chosen items removes: crags, routes (a crag's own routes included) and ascents. */
export function deletionSummary(items: MineItem[], chosen: Set<string>): { crags: number; routes: number; ascents: number } {
  const picked = items.filter((i) => chosen.has(`${i.kind}:${i.id}`));
  return {
    crags: picked.filter((i) => i.kind === 'crag').length,
    routes: picked.reduce((n, i) => n + (i.kind === 'crag' ? i.routes : 1), 0),
    ascents: picked.reduce((n, i) => n + i.ascents, 0),
  };
}

/** The key of an item in the chosen set. */
export const mineKey = (i: Pick<MineItem, 'kind' | 'id'>) => `${i.kind}:${i.id}`;
