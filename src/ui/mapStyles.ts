import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import type { MapBase } from '../domain/settings';

// Map backgrounds, both made from OpenStreetMap data. Kept in one place so a provider can be swapped without other changes.
// OpenFreeMap: free, no key, allowed in apps (https://openfreemap.org). OpenTopoMap: contour lines and hill shading,
// light use only (https://opentopomap.org/about), so it is the optional "hiking" view, not the default.
export const STANDARD_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Fonts for crag names on the map; the topo raster style has none of its own, so it borrows OpenFreeMap's. */
export const LABEL_FONT = ['Noto Sans Regular'];

const TOPO_STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    topo: {
      type: 'raster',
      tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png', 'https://b.tile.opentopomap.org/{z}/{x}/{y}.png', 'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 17,
      attribution: '© OpenStreetMap contributors, SRTM · style © OpenTopoMap (CC-BY-SA)',
    },
  },
  layers: [{ id: 'topo', type: 'raster', source: 'topo' }],
};

export function mapStyle(base: MapBase): string | StyleSpecification {
  return base === 'topo' ? TOPO_STYLE : STANDARD_STYLE_URL;
}

/** Poland, for a first look when no crag has a position and the phone's position is unknown. */
export const DEFAULT_VIEW = { center: [19.4, 51.9] as [number, number], zoom: 5.3 };
