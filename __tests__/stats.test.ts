import { parseGrade } from '../src/domain/grades';
import {
  activityByDay, ascentYears, countGoalProgress, gradeGoalProgress, hardestByMonth, hardestByYear, projectProgress, pyramid, styleCounts, topByDays,
  yearCalendar, yearStats, type StatAscent,
} from '../src/domain/stats';

const g = (l: string) => parseGrade(l, 'kr', 'sport');
const data: StatAscent[] = [
  { date: '2026-05-01', type: 'sport', gradeIndex: g('VI.3'), style: 'os' },
  { date: '2026-05-01', type: 'sport', gradeIndex: g('VI.4'), style: 'rp' },
  { date: '2026-05-02', type: 'sport', gradeIndex: g('VI.5'), style: 'attempt' },
  { date: '2025-05-02', type: 'sport', gradeIndex: g('VI.6'), style: 'os' },
];

describe('stats', () => {
  it('counts sends, attempts and days for a year', () => {
    const s = yearStats(data, 2026);
    expect(s.sends).toBe(2);
    expect(s.attempts).toBe(1);
    expect(s.climbingDays).toBe(2);
    expect(s.hardest.sport).toBe(g('VI.4'));
  });
  it('builds a pyramid from sends only', () => {
    const p = pyramid(data, 2026);
    expect(p.get(g('VI.5')!)).toBeUndefined();
    expect(p.get(g('VI.4')!)).toBe(1);
  });
  it('groups by day', () => {
    expect(activityByDay(data).get('2026-05-01')).toBe(2);
  });
});

describe('ascentYears', () => {
  it('lists years with ascents and the current year, newest first', () => {
    expect(ascentYears(data, 2027)).toEqual([2027, 2026, 2025]);
    expect(ascentYears([], 2026)).toEqual([2026]);
  });
});

describe('countGoalProgress', () => {
  it('caps the bar at 100% and marks the goal reached', () => {
    expect(countGoalProgress(200, 50)).toEqual({ value: 50, target: 200, ratio: 0.25, reached: false });
    expect(countGoalProgress(10, 12)).toEqual({ value: 12, target: 10, ratio: 1, reached: true });
  });
});

describe('goals and more stats', () => {
  const a = (date: string, grade: string, style: StatAscent['style'], over: Partial<StatAscent> = {}): StatAscent =>
    ({ date, type: 'sport', gradeIndex: g(grade), style, routeId: over.routeName ?? grade, routeName: grade, cragName: 'Krowia', ...over });
  const log: StatAscent[] = [
    a('2026-05-03', 'VI.3', 'rp', { routeName: 'A', partner: 'Ola' }),
    a('2026-05-03', 'VI.3', 'rp', { routeName: 'A', partner: 'Ola' }), // same route twice
    a('2026-06-07', 'VI.4', 'tr', { routeName: 'B', cragName: 'Okap' }), // top-rope does not count
    a('2026-06-08', 'VI.4', 'flash', { routeName: 'C', cragName: 'Okap', partner: 'Ola' }),
    a('2026-06-09', 'VI.2', 'attempt', { routeName: 'D', attempts: 3 }),
    a('2025-07-01', 'VI.5', 'os', { routeName: 'E' }),
  ];
  it('counts distinct routes led at or above the grade this year', () => {
    expect(gradeGoalProgress(log, g('VI.3')!, 3, 2026)).toMatchObject({ value: 2, target: 3, reached: false, routes: ['A', 'C'] });
    expect(gradeGoalProgress(log, g('VI.4')!, 1, 2026)).toMatchObject({ value: 1, reached: true });
  });
  it('tracks a project: tries, days and the first led send', () => {
    expect(projectProgress(log, 'D')).toEqual({ tries: 3, days: 1, sentOn: null });
    expect(projectProgress(log, 'A')).toEqual({ tries: 2, days: 1, sentOn: '2026-05-03' });
    expect(projectProgress([a('2026-06-07', 'VI.4', 'tr', { routeName: 'B' })], 'B').sentOn).toBeNull();
  });
  it('finds the hardest led send per month and per year', () => {
    const months = hardestByMonth(log, 2026);
    expect(months[4]).toBe(g('VI.3'));
    expect(months[5]).toBe(g('VI.4'));
    expect(months[0]).toBeNull();
    expect(hardestByYear(log)).toEqual([{ year: 2026, gradeIndex: g('VI.4') }, { year: 2025, gradeIndex: g('VI.5') }]);
  });
  it('counts styles and ranks crags and partners by days', () => {
    expect(Object.fromEntries(styleCounts(log, 2026))).toEqual({ rp: 2, tr: 1, flash: 1, attempt: 1 });
    expect(topByDays(log, 2026, (x) => x.cragName)).toEqual([{ name: 'Krowia', days: 2 }, { name: 'Okap', days: 2 }]);
    expect(topByDays(log, 2026, (x) => x.partner)).toEqual([{ name: 'Ola', days: 2 }]);
  });
  it('lays out a whole year by month', () => {
    const cal = yearCalendar(new Map([['2026-02-28', 2]]), 2026);
    expect(cal).toHaveLength(12);
    expect(cal[1]).toHaveLength(28);
    expect(cal[1][27]).toEqual({ key: '2026-02-28', n: 2 });
    expect(yearCalendar(new Map(), 2028)[1]).toHaveLength(29);
  });
});
