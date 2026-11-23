// The aspect of a wall ("wystawa"): which way it faces, one of eight compass points, or none. Stored in sector.aspect.

export const ASPECTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type Aspect = (typeof ASPECTS)[number];

/** The direction the wall faces, in degrees from north, clockwise (N 0, E 90, S 180, W 270). */
export function aspectAzimuth(a: Aspect): number {
  return ASPECTS.indexOf(a) * 45;
}

// Polish and English names and letters seen in files and guidebooks, mapped to the compass points.
const WORDS: Record<string, Aspect> = {
  n: 'N', ne: 'NE', e: 'E', se: 'SE', s: 'S', sw: 'SW', w: 'W', nw: 'NW',
  pn: 'N', pnwsch: 'NE', wsch: 'E', pdwsch: 'SE', pd: 'S', pdzach: 'SW', zach: 'W', pnzach: 'NW',
  polnoc: 'N', polnocnowschodnia: 'NE', wschod: 'E', wschodnia: 'E', poludniowowschodnia: 'SE', poludnie: 'S', poludniowa: 'S',
  poludniowozachodnia: 'SW', zachod: 'W', zachodnia: 'W', polnocnozachodnia: 'NW', polnocna: 'N',
  north: 'N', northeast: 'NE', east: 'E', southeast: 'SE', south: 'S', southwest: 'SW', west: 'W', northwest: 'NW',
};

/** A stored or typed aspect as a compass point, or null when it is empty or not understood. */
export function parseAspect(text: string | null | undefined): Aspect | null {
  const key = (text ?? '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  return WORDS[key] ?? null;
}
