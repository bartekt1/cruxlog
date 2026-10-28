import { coordsLabel, mapLink, shareMessage, tripCardRatio, TRIP_RATIO } from '../src/domain/share';

const base = { headline: 'Rysa VI.3 – RP', details: ['Krowia Turnia', '', 'Czarnorzeki › Kamieniec'], message: '', mapLabel: 'Mapa', approxLabel: 'położenie przybliżone' };

describe('share', () => {
  it('writes coordinates with a dot and five decimals', () => {
    expect(coordsLabel({ lat: 49.7422315, lng: 21.7850837 })).toBe('49.74223, 21.78508');
    expect(mapLink({ lat: 49.7422315, lng: 21.7850837 })).toBe('https://www.google.com/maps/search/?api=1&query=49.74223,21.78508');
    expect(mapLink({ lat: -3, lng: 10 })).toBe('https://www.google.com/maps/search/?api=1&query=-3.00000,10.00000');
  });
  it('joins headline and details, skipping empty lines', () => {
    expect(shareMessage({ ...base, place: null })).toBe('Rysa VI.3 – RP\nKrowia Turnia\nCzarnorzeki › Kamieniec');
  });
  it('adds the message and the map link', () => {
    const text = shareMessage({ ...base, message: '  Sobota rano?  ', place: { lat: 49.74, lng: 21.78, approx: false } });
    expect(text).toBe('Rysa VI.3 – RP\nKrowia Turnia\nCzarnorzeki › Kamieniec\n\nSobota rano?\n\nMapa: https://www.google.com/maps/search/?api=1&query=49.74000,21.78000');
  });
  it('says when the position is approximate', () => {
    const text = shareMessage({ ...base, place: { lat: 49.74, lng: 21.78, approx: true } });
    expect(text).toContain('Mapa (położenie przybliżone): https://');
  });
});

describe('tripCardRatio', () => {
  it('keeps a short card at 4:5', () => {
    expect(tripCardRatio(300, 360)).toBe(1.25);
  });
  it('follows the content in between, rounded up', () => {
    expect(tripCardRatio(500, 360)).toBe(1.39);
  });
  it('stops at 9:16 for a long list', () => {
    expect(tripCardRatio(2000, 360)).toBe(TRIP_RATIO.max);
  });
  it('falls back to 4:5 before anything is measured', () => {
    expect(tripCardRatio(0, 360)).toBe(1.25);
    expect(tripCardRatio(500, 0)).toBe(1.25);
  });
});
