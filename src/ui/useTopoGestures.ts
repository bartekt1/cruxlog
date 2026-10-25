import { useMemo, useRef } from 'react';
import { PanResponder, type GestureResponderEvent, type PanResponderInstance } from 'react-native';
import { clampZoom, fingerDistance, fingerMidpoint, hitPoint, pinchZoom, simplify, toPhoto, type History, type Pt, type TopoMode, type Zoom } from '../domain/topo';

const HIT_RADIUS = 24; // px: how near a finger must be to grab a point
const TAP_SLOP = 8; // px: a touch that moves less than this is a tap
const HOLD_MS = 350; // a finger held this long on an empty spot shows the magnifier and places a point where it is lifted

type Gesture =
  | { kind: 'pinch'; dist: number; mid: { x: number; y: number }; zoom: Zoom }
  | { kind: 'drag'; index: number; moved: boolean }
  | { kind: 'pan'; start: { x: number; y: number }; zoom: Zoom; moved: boolean; at: number }
  | { kind: 'place'; at: Pt }
  | { kind: 'stroke'; points: Pt[] };

const pinchStart = (touches: { x: number; y: number }[], zoom: Zoom): Gesture =>
  ({ kind: 'pinch', dist: fingerDistance(touches), mid: fingerMidpoint(touches), zoom });

export type TopoState = {
  zoom: Zoom; box: { width: number; height: number }; canvas: { w: number; h: number }; points: Pt[]; history: History; mode: TopoMode;
};
export type TopoActions = {
  setZoom: (z: Zoom) => void;
  /** The line while a point is dragged or a stroke drawn, before the step is recorded; null when done. */
  setDraft: (points: Pt[] | null) => void;
  /** Records a step (undoable) and selects point `selected` (-1 = none). */
  step: (points: Pt[], selected: number) => void;
  setSelected: (index: number) => void;
  /** The magnifier: the finger on the canvas (px from its top left) and the photo point under it; null hides it. */
  setLoupe: (loupe: { x: number; y: number; at: Pt } | null) => void;
};

/**
 * The fingers on the topo editor's photo. Bolts mode: a tap adds a point, dragging a point moves it (with the magnifier),
 * a finger held still on an empty spot shows the magnifier and adds a point where it is lifted, one finger moved on an
 * empty spot moves a zoomed photo. By hand: one finger draws a piece of the line. Two fingers always zoom and move the photo.
 */
export function useTopoGestures(state: TopoState, actions: TopoActions): PanResponderInstance {
  // The touch handler is made once, so it reads the latest values through a ref.
  const live = useRef({ ...state, ...actions });
  live.current = { ...state, ...actions };
  const gesture = useRef<Gesture | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useMemo(() => {
    const rel = (x: number, y: number) => ({ x: x - live.current.canvas.w / 2, y: y - live.current.canvas.h / 2 });
    const touchesOf = (e: GestureResponderEvent) => e.nativeEvent.touches.map((tch) => rel(tch.locationX, tch.locationY));
    const showLoupe = (touch: { x: number; y: number }, at: Pt) =>
      live.current.setLoupe({ x: touch.x + live.current.canvas.w / 2, y: touch.y + live.current.canvas.h / 2, at });
    const stopHold = () => { if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; } };
    const end = () => { stopHold(); live.current.setLoupe(null); };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const touches = touchesOf(e);
        const { zoom: z, box: b, points: pts, mode: m } = live.current;
        if (touches.length >= 2) { gesture.current = pinchStart(touches, z); return; }
        const at = toPhoto(touches[0], z, b.width, b.height);
        if (m === 'free' && at) { gesture.current = { kind: 'stroke', points: [at] }; return; }
        const hit = at ? hitPoint(pts, at, b.width * z.scale, b.height * z.scale, HIT_RADIUS) : -1;
        gesture.current = hit >= 0
          ? { kind: 'drag', index: hit, moved: false }
          : { kind: 'pan', start: touches[0], zoom: z, moved: false, at: Date.now() };
        if (hit < 0 && at) {
          // Held still: becomes "place a point", with the magnifier showing exactly where.
          holdTimer.current = setTimeout(() => {
            holdTimer.current = null;
            const g = gesture.current;
            if (g?.kind !== 'pan' || g.moved) return;
            gesture.current = { kind: 'place', at };
            showLoupe(touches[0], at);
          }, HOLD_MS);
        }
      },
      onPanResponderMove: (e) => {
        const touches = touchesOf(e);
        const g = gesture.current;
        const { zoom: z, box: b, points: pts, setDraft, setZoom } = live.current;
        if (!g) return;
        if (touches.length >= 2) {
          // A second finger turns any gesture into a pinch; a point being dragged or a stroke is cancelled.
          if (g.kind !== 'pinch') {
            if (g.kind === 'drag' || g.kind === 'stroke') setDraft(null);
            end();
            gesture.current = pinchStart(touches, z);
            return;
          }
          setZoom(pinchZoom(g, touches, b.width, b.height));
          return;
        }
        if (g.kind === 'stroke') {
          const at = toPhoto(touches[0], z, b.width, b.height);
          if (!at) return;
          g.points.push(at);
          setDraft([...live.current.history.present, ...g.points]);
        } else if (g.kind === 'drag') {
          const at = toPhoto(touches[0], z, b.width, b.height);
          if (!at) return;
          g.moved = true;
          setDraft(pts.map((p, i) => (i === g.index ? at : p)));
          showLoupe(touches[0], at);
        } else if (g.kind === 'place') {
          const at = toPhoto(touches[0], z, b.width, b.height);
          if (!at) return;
          g.at = at;
          showLoupe(touches[0], at);
        } else if (g.kind === 'pan') {
          const dx = touches[0].x - g.start.x;
          const dy = touches[0].y - g.start.y;
          if (!g.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
          g.moved = true;
          stopHold();
          setZoom(clampZoom({ ...g.zoom, tx: g.zoom.tx + dx, ty: g.zoom.ty + dy }, b.width, b.height));
        }
      },
      onPanResponderRelease: () => {
        const g = gesture.current;
        gesture.current = null;
        end();
        if (!g) return;
        const { zoom: z, box: b, points: pts, history: h, step, setDraft, setSelected } = live.current;
        if (g.kind === 'stroke') {
          // The stroke is thinned out (finer when zoomed in) and continues the line drawn so far.
          step([...h.present, ...simplify(g.points, 0.004 / z.scale)], -1);
          setDraft(null);
        } else if (g.kind === 'drag') {
          if (g.moved) step(pts, g.index); else setSelected(g.index); // a tap on a point only selects it
          setDraft(null);
        } else if (g.kind === 'place') {
          step([...h.present, g.at], h.present.length);
        } else if (g.kind === 'pan' && !g.moved && Date.now() - g.at < 600) {
          const at = toPhoto(g.start, z, b.width, b.height);
          if (at) step([...h.present, at], h.present.length);
        }
      },
      onPanResponderTerminate: () => { gesture.current = null; end(); live.current.setDraft(null); },
    });
  }, []); // it reads everything through the ref, so it never needs to be made again
}
