import { backupStatus, routeSummary } from '../src/domain/history';

describe('routeSummary', () => {
  it('finds the first send and counts the days it took', () => {
    const s = routeSummary([
      { date: '2026-09-12', style: 'rp', attempts: 1 },
      { date: '2026-08-01', style: 'attempt', attempts: 3 },
      { date: '2026-08-01', style: 'attempt', attempts: 1 },
      { date: '2026-08-20', style: 'attempt', attempts: 2 },
      { date: '2026-10-01', style: 'rp', attempts: 1 },
    ]);
    expect(s).toEqual({ ascents: 5, sends: 2, firstSend: { date: '2026-09-12', style: 'rp' }, daysToSend: 3 });
  });
  it('handles a route that is not sent yet', () => {
    expect(routeSummary([{ date: '2026-08-01', style: 'attempt', attempts: 2 }])).toEqual({ ascents: 1, sends: 0, firstSend: null, daysToSend: null });
    expect(routeSummary([])).toEqual({ ascents: 0, sends: 0, firstSend: null, daysToSend: null });
  });
});

describe('backupStatus', () => {
  const day = 86_400_000;
  const now = Date.UTC(2026, 9, 10);
  it('reminds when there is data and no recent backup', () => {
    expect(backupStatus(null, now, true)).toEqual({ days: null, due: true });
    expect(backupStatus(now - 31 * day, now, true)).toEqual({ days: 31, due: true });
    expect(backupStatus(now - 3 * day, now, true)).toEqual({ days: 3, due: false });
  });
  it('does not nag when there is nothing to back up', () => {
    expect(backupStatus(null, now, false).due).toBe(false);
  });
});
