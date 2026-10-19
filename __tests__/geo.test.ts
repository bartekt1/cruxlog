import { boundsOf, distanceM, formatDistance, isLatLng, nearest } from '../src/domain/geo';

describe('geo', () => {
  it('measures distances on the ground', () => {
    // Kamieniec to Prządki in Czarnorzeki is roughly 2.5 km.
    const d = distanceM({ lat: 49.7425, lng: 21.7853 }, { lat: 49.7436, lng: 21.8183 });
    expect(d).toBeGreaterThan(2200);
    expect(d).toBeLessThan(2600);
    expect(distanceM({ lat: 50, lng: 20 }, { lat: 50, lng: 20 })).toBe(0);
  });
  it('accepts only real coordinates', () => {
    expect(isLatLng(49.7, 21.8)).toBe(true);
    expect(isLatLng(null, 21.8)).toBe(false);
    expect(isLatLng(0, 0)).toBe(false);
    expect(isLatLng(95, 10)).toBe(false);
  });
  it('picks the nearest crags with a position', () => {
    const crags = [
      { id: 'far', lat: 50.3, lng: 19.8 },
      { id: 'none', lat: null, lng: null },
      { id: 'near', lat: 49.7426, lng: 21.7851 },
      { id: 'mid', lat: 49.7436, lng: 21.8183 },
    ];
    expect(nearest(crags, { lat: 49.7425, lng: 21.7853 }, 2).map((c) => c.id)).toEqual(['near', 'mid']);
    expect(nearest(crags, { lat: 49.7425, lng: 21.7853 }, 10, 5000).map((c) => c.id)).toEqual(['near', 'mid']);
  });
  it('writes distances for people', () => {
    expect(formatDistance(42, 'pl')).toBe('40 m');
    expect(formatDistance(1234, 'pl')).toBe('1,2 km');
    expect(formatDistance(1234, 'en')).toBe('1.2 km');
    expect(formatDistance(18400, 'pl')).toBe('18 km');
  });
  it('frames points with a margin', () => {
    expect(boundsOf([])).toBeNull();
    expect(boundsOf([{ lat: 49, lng: 21 }, { lat: 50, lng: 20 }], 0)).toEqual([20, 49, 21, 50]);
  });
});
