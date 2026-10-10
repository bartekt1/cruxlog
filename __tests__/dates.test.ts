import { formatDay, isValidIsoDate, isoDate, relativeDay, shiftDay } from '../src/domain/dates';

describe('dates', () => {
  it('formats a local date as ISO', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('shifts across month and year boundaries', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2025-12-31', 1)).toBe('2026-01-01');
  });
  it('validates real calendar days only', () => {
    expect(isValidIsoDate('2026-10-10')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('10.10.2026')).toBe(false);
    expect(isValidIsoDate('')).toBe(false);
  });
  it('names today and yesterday', () => {
    expect(relativeDay('2026-10-10', '2026-10-10')).toBe('today');
    expect(relativeDay('2026-10-09', '2026-10-10')).toBe('yesterday');
    expect(relativeDay('2026-10-08', '2026-10-10')).toBeNull();
  });
  it('shows the year only for other years', () => {
    expect(formatDay('2026-05-01', 'en', '2026-10-10')).not.toMatch(/2026/);
    expect(formatDay('2025-05-01', 'en', '2026-10-10')).toMatch(/2025/);
    expect(formatDay('garbage', 'en', '2026-10-10')).toBe('garbage');
  });
});
