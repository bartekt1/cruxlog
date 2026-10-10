import { parseGrade } from '../src/domain/grades';
import { activityByDay, ascentYears, countGoalProgress, pyramid, yearStats, type StatAscent } from '../src/domain/stats';

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
    const p = pyramid(data, 2026, 'route');
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
