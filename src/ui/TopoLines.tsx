import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { smoothPath, type Pt, type TopoMode } from '../domain/topo';
import { F } from './fonts';
import { useTheme } from './theme';

export type DrawnLine = { routeId: string; mode: TopoMode; points: Pt[]; number?: number; dim?: boolean };

/**
 * Topo lines over a photo shown in a box `width`×`height` (the photo fills the box exactly). Each line: a red curve with a
 * white edge, small rings on the bolts, a double ring on the anchor and the route number in a red disc at the start.
 * `selected` marks a point of the line being edited.
 */
export function TopoLines({ lines, width, height, selected }: {
  lines: DrawnLine[]; width: number; height: number; selected?: { routeId: string; index: number } | null;
}) {
  const th = useTheme();
  if (!width || !height) return null;
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      {lines.map((l) => {
        if (!l.points.length) return null;
        const d = smoothPath(l.points, width, height);
        const px = l.points.map((p) => ({ x: p.x * width, y: p.y * height }));
        const last = px.length - 1;
        return (
          <G key={l.routeId} opacity={l.dim ? 0.45 : 1}>
            {px.length > 1 ? (
              <>
                <Path d={d} stroke={th.topoHalo} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <Path d={d} stroke={th.topo} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : null}
            {l.mode === 'bolts' ? px.slice(1, last).map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={4.5} fill={th.topoHalo} stroke={th.topo} strokeWidth={2} />
            )) : null}
            {last > 0 ? (
              <>
                <Circle cx={px[last].x} cy={px[last].y} r={8} fill="none" stroke={th.topoHalo} strokeWidth={5} />
                <Circle cx={px[last].x} cy={px[last].y} r={8} fill="none" stroke={th.topo} strokeWidth={2.5} />
                <Circle cx={px[last].x} cy={px[last].y} r={3} fill={th.topo} />
              </>
            ) : null}
            <Circle cx={px[0].x} cy={px[0].y} r={11} fill={th.topo} stroke={th.topoHalo} strokeWidth={2} />
            {l.number != null ? (
              <SvgText x={px[0].x} y={px[0].y + 4.5} fontSize={13} fontFamily={F.cond} fill={th.topoHalo} textAnchor="middle">{String(l.number)}</SvgText>
            ) : null}
            {selected?.routeId === l.routeId && px[selected.index] ? (
              <Circle cx={px[selected.index].x} cy={px[selected.index].y} r={16} fill="none" stroke={th.topoHalo} strokeWidth={3} strokeDasharray="5,4" />
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}

/** Where a photo of `photoW`×`photoH` sits when fitted ("contain") into a box `boxW`×`boxH`. */
export function fitRect(photoW: number, photoH: number, boxW: number, boxH: number): { left: number; top: number; width: number; height: number } {
  if (!photoW || !photoH || !boxW || !boxH) return { left: 0, top: 0, width: 0, height: 0 };
  const s = Math.min(boxW / photoW, boxH / photoH);
  const width = photoW * s;
  const height = photoH * s;
  return { left: (boxW - width) / 2, top: (boxH - height) / 2, width, height };
}
