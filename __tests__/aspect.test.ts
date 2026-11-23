import { aspectAzimuth, ASPECTS, parseAspect } from '../src/domain/aspect';

describe('aspect', () => {
  it('gives the facing direction in degrees', () => {
    expect(ASPECTS.map(aspectAzimuth)).toEqual([0, 45, 90, 135, 180, 225, 270, 315]);
  });
  it('reads letters and Polish or English words', () => {
    expect(['S', 's', ' SW ', 'Pd', 'pd-zach', 'Południowa', 'północno-wschodnia', 'Zachód', 'south-east', 'NW'].map(parseAspect))
      .toEqual(['S', 'S', 'SW', 'S', 'SW', 'S', 'NE', 'W', 'SE', 'NW']);
  });
  it('leaves empty or unknown text out', () => {
    expect([null, undefined, '', 'połowa', 'xyz'].map(parseAspect)).toEqual([null, null, null, null, null]);
  });
});
