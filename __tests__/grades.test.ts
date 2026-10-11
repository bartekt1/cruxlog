import { formatGrade, gradeExample, parseGrade, routeGrade } from '../src/domain/grades';

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

describe('guidebook grade forms', () => {
  const kr = (l: string) => parseGrade(l, 'kr', 'sport');
  const font = (l: string) => parseGrade(l, 'font', 'boulder');
  it('maps in-between Kurtyka grades to the nearest lower step', () => {
    expect(kr('VI+')).toBe(kr('VI'));
    expect(kr('IV+')).toBe(kr('IV'));
    expect(kr('VI-')).toBe(kr('V+'));
    expect(kr('V-')).toBe(kr('IV'));
    expect(kr('IV-')).toBe(kr('III'));
    expect(kr('II')).toBe(kr('III'));
  });
  it('uses the first grade of a range and ignores a question mark', () => {
    expect(kr('VI.4/4+')).toBe(kr('VI.4'));
    expect(kr('VI.5+/6')).toBe(kr('VI.5+'));
    expect(kr('VI+/1')).toBe(kr('VI'));
    expect(kr('VI.5?')).toBe(kr('VI.5'));
  });
  it('handles boulder forms and the new top grade', () => {
    expect(font('4+')).toBe(font('4'));
    expect(font('8A+')).toBe(font('8A')! + 1);
    expect(formatGrade(font('8A+')!, 'v', 'boulder')).toBe('V12');
  });
  it('still rejects grades from another system or nonsense', () => {
    expect(kr('9z')).toBeNull();
    expect(font('VI.3')).toBeNull();
    expect(kr('')).toBeNull();
    expect(kr('/')).toBeNull();
  });
  it('keeps exact grades unchanged', () => {
    expect(parseGrade('VI+', 'uiaa', 'sport')).toBe(5);
    expect(kr('VI.1+')).toBe(6);
  });
});

describe('routeGrade', () => {
  const r = { grade_index: parseGrade('VI.4/4+', 'kr', 'sport')!, grade_label: 'VI.4/4+', grade_system: 'kr' as const, type: 'sport' as const };
  it('shows the guidebook label in its own system and the ladder grade in others', () => {
    expect(routeGrade(r, 'kr')).toBe('VI.4/4+');
    expect(routeGrade(r, 'fr')).toBe('7a');
    expect(routeGrade({ ...r, grade_label: '' }, 'kr')).toBe('VI.4');
  });
});
