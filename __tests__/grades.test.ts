import { formatGrade, gradeExample, parseGrade } from '../src/domain/grades';

describe('grades', () => {
  it('parses and converts route grades', () => {
    const i = parseGrade('VI.4', 'kr', 'sport');
    expect(i).not.toBeNull();
    expect(formatGrade(i!, 'fr', 'sport')).toBe('7a');
    expect(parseGrade('7a', 'fr', 'sport')).toBe(i);
  });
  it('is tolerant to case and spaces', () => {
    expect(parseGrade(' vi.2 + ', 'kr', 'sport')).toBe(parseGrade('VI.2+', 'kr', 'sport'));
  });
  it('handles boulders', () => {
    const i = parseGrade('6B', 'font', 'boulder')!;
    expect(formatGrade(i, 'v', 'boulder')).toBe('V4');
  });
  it('rejects a wrong system or an unknown grade', () => {
    expect(parseGrade('6B', 'fr', 'boulder')).toBeNull();
    expect(parseGrade('9z', 'fr', 'sport')).toBeNull();
  });
});

describe('gradeExample', () => {
  it('gives a label that parses back in the same system', () => {
    for (const [system, type] of [['kr', 'sport'], ['uiaa', 'multipitch'], ['fr', 'sport'], ['font', 'boulder'], ['v', 'boulder']] as const) {
      expect(parseGrade(gradeExample(system, type), system, type)).not.toBeNull();
    }
  });
});
