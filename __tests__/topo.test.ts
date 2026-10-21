import {
  clampZoom, commit, FIT, hitPoint, MAX_ZOOM, numberLines, parsePoints, redo, simplify, smoothPath, startHistory, stringifyPoints, toPhoto, undo, zoomAt,
} from '../src/domain/topo';

describe('topo points', () => {
  it('stores compactly and reads back, clamped to the photo; damage gives an empty line', () => {
    const pts = [{ x: 0.123456, y: 0.9 }, { x: 1.2, y: -0.1 }];
    expect(stringifyPoints(pts)).toBe('[[0.1235,0.9],[1,0]]');
    expect(parsePoints(stringifyPoints(pts))).toEqual([{ x: 0.1235, y: 0.9 }, { x: 1, y: 0 }]);
    expect(parsePoints('nonsense')).toEqual([]);
    expect(parsePoints('[[1,"a"],[0.5,0.5]]')).toEqual([{ x: 0.5, y: 0.5 }]);
  });
  it('draws a straight line for two points and a smooth curve through more, ending exactly on the last point', () => {
    expect(smoothPath([], 100, 100)).toBe('');
    expect(smoothPath([{ x: 0, y: 1 }, { x: 0.5, y: 0 }], 100, 200)).toBe('M0.0,200.0 L50.0,0.0');
    const d = smoothPath([{ x: 0.5, y: 1 }, { x: 0.4, y: 0.6 }, { x: 0.6, y: 0.3 }, { x: 0.5, y: 0 }], 100, 100);
    expect(d.startsWith('M50.0,100.0 C')).toBe(true);
    expect((d.match(/C/g) ?? []).length).toBe(3);
    expect(d).toContain(' 40.0,60.0 C'); // passes through the bolts
    expect(d.endsWith(' 50.0,0.0')).toBe(true);
  });
  it('simplifies a finger stroke but keeps its corners', () => {
    const straight = Array.from({ length: 50 }, (_, i) => ({ x: 0.5 + (i % 2) * 0.0005, y: 1 - i / 49 }));
    expect(simplify(straight)).toEqual([straight[0], straight[49]]);
    const corner = [{ x: 0, y: 1 }, { x: 0.25, y: 0.75 }, { x: 0.5, y: 0.5 }, { x: 0.75, y: 0.5 }, { x: 1, y: 0.5 }];
    expect(simplify(corner)).toEqual([{ x: 0, y: 1 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0.5 }]);
  });
  it('finds the point under a finger within a radius in screen pixels', () => {
    const pts = [{ x: 0.5, y: 0.9 }, { x: 0.52, y: 0.5 }];
    expect(hitPoint(pts, { x: 0.53, y: 0.5 }, 1000, 1000, 22)).toBe(1);
    expect(hitPoint(pts, { x: 0.6, y: 0.5 }, 1000, 1000, 22)).toBe(-1);
    expect(hitPoint([], { x: 0, y: 0 }, 1, 1, 22)).toBe(-1);
  });
  it('numbers routes from left to right by their start', () => {
    const n = numberLines([
      { routeId: 'right', points: [{ x: 0.8, y: 1 }] },
      { routeId: 'left', points: [{ x: 0.1, y: 1 }, { x: 0.9, y: 0 }] },
      { routeId: 'none', points: [] },
    ]);
    expect([...n]).toEqual([['left', 1], ['right', 2]]);
  });
});

describe('undo and redo', () => {
  it('steps back and forward, and a new step drops what was undone', () => {
    const a = [{ x: 0, y: 0 }];
    const b = [...a, { x: 1, y: 1 }];
    let h = commit(commit(startHistory([]), a), b);
    expect(h.present).toEqual(b);
    h = undo(h);
    expect(h.present).toEqual(a);
    h = undo(undo(h));
    expect(h.present).toEqual([]);
    expect(undo(h)).toBe(h); // nothing more to undo
    h = redo(h);
    expect(h.present).toEqual(a);
    h = commit(h, [{ x: 0.5, y: 0.5 }]);
    expect(redo(h)).toBe(h); // the undone step is gone
  });
});

describe('zoom', () => {
  const W = 300;
  const H = 400;
  it('maps touches to the photo at rest and when zoomed', () => {
    expect(toPhoto({ x: 0, y: 0 }, FIT, W, H)).toEqual({ x: 0.5, y: 0.5 });
    expect(toPhoto({ x: -150, y: 200 }, FIT, W, H)).toEqual({ x: 0, y: 1 });
    expect(toPhoto({ x: 200, y: 0 }, FIT, W, H)).toBeNull();
    const z = zoomAt(FIT, 2, { x: 0, y: 0 }, W, H);
    expect(z).toEqual({ scale: 2, tx: 0, ty: 0 });
    expect(toPhoto({ x: 150, y: 0 }, z, W, H)).toEqual({ x: 0.75, y: 0.5 });
  });
  it('keeps the point under the fingers in place while zooming', () => {
    const focus = { x: 60, y: -80 };
    const before = toPhoto(focus, FIT, W, H)!;
    const z = zoomAt(FIT, 3, focus, W, H);
    const after = toPhoto(focus, z, W, H)!;
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });
  it('stays within 1×–8× and cannot push the photo off the canvas', () => {
    expect(zoomAt(FIT, 0.5, { x: 0, y: 0 }, W, H).scale).toBe(1);
    expect(zoomAt(FIT, 100, { x: 0, y: 0 }, W, H).scale).toBe(MAX_ZOOM);
    expect(clampZoom({ scale: 1, tx: 50, ty: -50 }, W, H)).toEqual({ scale: 1, tx: 0, ty: 0 });
    expect(clampZoom({ scale: 2, tx: 1000, ty: -1000 }, W, H)).toEqual({ scale: 2, tx: 150, ty: -200 });
  });
});
