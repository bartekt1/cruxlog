import { formatTripDates, tripStatus, tripSummary, validateTrip, type TripAscent } from '../src/domain/trips';

const draft = { name: ' Majówka ', startDate: '2026-05-01', endDate: '2026-05-03', message: ' Zbiórka 8:00 ', cragIds: ['c1', 'c1'], routeIds: ['r1', 'r2', 'r1'] };

describe('validateTrip', () => {
  it('trims, drops repeats and keeps the order', () => {
    expect(validateTrip(draft)).toEqual({ ok: true, value: { ...draft, name: 'Majówka', message: 'Zbiórka 8:00', cragIds: ['c1'], routeIds: ['r1', 'r2'] } });
  });
  it('makes a one-day trip when the end is left out', () => {
    const v = validateTrip({ ...draft, endDate: '' });
    expect(v.ok && v.value.endDate).toBe('2026-05-01');
  });
  it('needs a name, days in order and a crag', () => {
    expect(validateTrip({ ...draft, name: ' ' })).toEqual({ ok: false, error: 'trip.errors.name' });
    expect(validateTrip({ ...draft, endDate: '2026-04-30' })).toEqual({ ok: false, error: 'trip.errors.dates' });
    expect(validateTrip({ ...draft, startDate: '2026-02-30' })).toEqual({ ok: false, error: 'trip.errors.dates' });
    expect(validateTrip({ ...draft, cragIds: [] })).toEqual({ ok: false, error: 'trip.errors.place' });
  });
});

describe('tripStatus and dates', () => {
  const t = { start_date: '2026-05-01', end_date: '2026-05-03' };
  it('is planned, ongoing or done by the day', () => {
    expect(tripStatus(t, '2026-04-30')).toBe('planned');
    expect(tripStatus(t, '2026-05-01')).toBe('ongoing');
    expect(tripStatus(t, '2026-05-03')).toBe('ongoing');
    expect(tripStatus(t, '2026-05-04')).toBe('done');
  });
  it('writes the days short', () => {
    expect(formatTripDates('2026-05-01', '2026-05-03', 'en')).toMatch(/^1–.*3.*2026$/);
    expect(formatTripDates('2026-04-30', '2026-05-02', 'en')).toMatch(/April.*–.*May.*2026/);
    expect(formatTripDates('2026-12-30', '2027-01-02', 'en')).toMatch(/2026.*–.*2027/);
    expect(formatTripDates('2026-05-02', '2026-05-02', 'en')).toMatch(/Sat.*2026/);
  });
});

describe('tripSummary', () => {
  const a = (route_id: string, grade_index: number, style: TripAscent['style'], date = '2026-05-01'): TripAscent => ({ route_id, route_name: route_id.toUpperCase(), grade_index, style, date });
  it('counts sends, attempts, days, the hardest and the proposed routes done', () => {
    const s = tripSummary([a('r1', 5, 'rp'), a('r2', 8, 'attempt'), a('r3', 7, 'os', '2026-05-02'), a('r1', 5, 'rp', '2026-05-02')], ['r1', 'r2', 'r4']);
    expect(s).toMatchObject({ sends: 3, attempts: 1, days: 2, hardest: { gradeIndex: 7, name: 'R3' }, planned: { done: 1, total: 3 } });
    expect(s.sent.map((x) => x.route_id)).toEqual(['r3', 'r1']);
  });
  it('is empty without ascents', () => {
    expect(tripSummary([], [])).toMatchObject({ sends: 0, attempts: 0, days: 0, hardest: null, planned: { done: 0, total: 0 }, sent: [] });
  });
});
