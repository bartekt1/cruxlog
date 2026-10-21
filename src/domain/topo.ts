// Topo lines on a wall photo. Points are stored relative to the photo (0..1 of its width and height), so a line fits the
// photo at any size and zoom. A "bolts" line is the start, the bolts from the bottom up and the anchor last; the app draws
// a smooth curve through them.

export type Pt = { x: number; y: number };
export type TopoMode = 'bolts' | 'free';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const round = (v: number) => Math.round(v * 10000) / 10000;

/** Points as stored (JSON), tolerant of damage: anything unreadable becomes an empty line. */
export function parsePoints(raw: string): Pt[] {
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((p): p is [number, number] => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map(([x, y]) => ({ x: clamp01(x), y: clamp01(y) }));
  } catch {
    return [];
  }
}

/** Compact storage: [[x,y],…] with 4 decimals (a tenth of a pixel on a 2000 px photo). */
export function stringifyPoints(points: Pt[]): string {
  return JSON.stringify(points.map((p) => [round(clamp01(p.x)), round(clamp01(p.y))]));
}

/**
 * An SVG path through the points, in pixels of a box `w`×`h`: straight for two points, otherwise a smooth curve that
 * passes exactly through every point (Catmull-Rom turned into Bézier pieces).
 */
export function smoothPath(points: Pt[], w: number, h: number): string {
  const p = points.map((q) => ({ x: q.x * w, y: q.y * h }));
  if (!p.length) return '';
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(p[0].x)},${f(p[0].y)}`;
  if (p.length === 2) return `${d} L${f(p[1].x)},${f(p[1].y)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${f(c1.x)},${f(c1.y)} ${f(c2.x)},${f(c2.y)} ${f(p2.x)},${f(p2.y)}`;
  }
  return d;
}

/** Fewer points along a line drawn by finger, keeping its shape (Ramer–Douglas–Peucker); `tolerance` in photo units. */
export function simplify(points: Pt[], tolerance = 0.004): Pt[] {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points[points.length - 1]];
  let worst = 0;
  let at = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = distanceToSegment(points[i], a, b);
    if (d > worst) { worst = d; at = i; }
  }
  if (worst <= tolerance) return [a, b];
  return [...simplify(points.slice(0, at + 1), tolerance).slice(0, -1), ...simplify(points.slice(at), tolerance)];
}

function distanceToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** The point nearest to `at` within `radius` pixels of a box `w`×`h`; -1 when none is that close. */
export function hitPoint(points: Pt[], at: Pt, w: number, h: number, radius: number): number {
  let best = -1;
  let bestD = radius;
  points.forEach((p, i) => {
    const d = Math.hypot((p.x - at.x) * w, (p.y - at.y) * h);
    if (d <= bestD) { best = i; bestD = d; }
  });
  return best;
}

/** Route numbers on one photo: 1, 2, 3… from left to right by where each line starts, like in a guidebook. */
export function numberLines(lines: { routeId: string; points: Pt[] }[]): Map<string, number> {
  const starts = lines.filter((l) => l.points.length).map((l) => ({ id: l.routeId, x: l.points[0].x }));
  starts.sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
  return new Map(starts.map((s, i) => [s.id, i + 1]));
}

// ---- Undo and redo: every step (a point added, moved or removed, a stroke, a clear) is one state of the line.

export type History = { past: Pt[][]; present: Pt[]; future: Pt[][] };

export const startHistory = (points: Pt[]): History => ({ past: [], present: points, future: [] });

export function commit(h: History, next: Pt[]): History {
  return { past: [...h.past, h.present], present: next, future: [] };
}

export function undo(h: History): History {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}

export function redo(h: History): History {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}

// ---- Zoom: the photo is shown fitted into the canvas at scale 1 and can be enlarged up to MAX_ZOOM; `tx`/`ty` move it.

export const MAX_ZOOM = 8;
export type Zoom = { scale: number; tx: number; ty: number };
export const FIT: Zoom = { scale: 1, tx: 0, ty: 0 };

/** Keeps the zoom in range and the photo on the canvas: it cannot be moved further than its own edges. */
export function clampZoom(v: Zoom, boxW: number, boxH: number): Zoom {
  const scale = Math.min(MAX_ZOOM, Math.max(1, v.scale));
  const maxX = (boxW * (scale - 1)) / 2;
  const maxY = (boxH * (scale - 1)) / 2;
  // `+ 0` turns -0 into 0.
  return { scale, tx: Math.min(maxX, Math.max(-maxX, v.tx)) + 0, ty: Math.min(maxY, Math.max(-maxY, v.ty)) + 0 };
}

/**
 * Zooms by `factor` keeping the point under `focus` (pixels from the box centre) where it is, as a pinch or a + button does.
 */
export function zoomAt(v: Zoom, factor: number, focus: { x: number; y: number }, boxW: number, boxH: number): Zoom {
  const scale = Math.min(MAX_ZOOM, Math.max(1, v.scale * factor));
  const k = scale / v.scale;
  return clampZoom({ scale, tx: focus.x - (focus.x - v.tx) * k, ty: focus.y - (focus.y - v.ty) * k }, boxW, boxH);
}

/** A touch on the canvas (pixels from the box centre) as a point on the photo (0..1), or null when outside the photo. */
export function toPhoto(touch: { x: number; y: number }, v: Zoom, boxW: number, boxH: number): Pt | null {
  const x = (touch.x - v.tx) / (boxW * v.scale) + 0.5;
  const y = (touch.y - v.ty) / (boxH * v.scale) + 0.5;
  return x < 0 || x > 1 || y < 0 || y > 1 ? null : { x, y };
}
