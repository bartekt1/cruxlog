import { feltGrade, formatGrade, gradeExample, nearbyGrades, otherGrades, parseGrade, ROUTE_LADDER, routeGrade, systemAfterTypeChange } from '../src/domain/grades';

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
  it('rejects a wrong system or an unknown grade', () => {
    expect(parseGrade('VI.3', 'fr', 'sport')).toBeNull();
    expect(parseGrade('9z', 'fr', 'sport')).toBeNull();
  });
});

describe('gradeExample', () => {
  it('gives a label that parses back in the same system', () => {
    for (const [system, type] of [['kr', 'sport'], ['uiaa', 'multipitch'], ['fr', 'sport']] as const) {
      expect(parseGrade(gradeExample(system, type), system, type)).not.toBeNull();
    }
  });
});

describe('guidebook grade forms', () => {
  const kr = (l: string) => parseGrade(l, 'kr', 'sport');
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
  it('still rejects grades from another system or nonsense', () => {
    expect(kr('9z')).toBeNull();
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

describe('own grade', () => {
  it('offers the grades around the route, clipped to the ladder', () => {
    expect(nearbyGrades(5, 2, 2)).toEqual([3, 4, 5, 6, 7]);
    expect(nearbyGrades(0, 2, 1)).toEqual([0, 1]);
    expect(nearbyGrades(ROUTE_LADDER.length - 1, 1, 3)).toEqual([ROUTE_LADDER.length - 2, ROUTE_LADDER.length - 1]);
  });
  it('shows it only when it differs from the route', () => {
    expect(feltGrade(null, 5)).toBeNull();
    expect(feltGrade(5, 5)).toBeNull();
    expect(feltGrade(7, 5)).toBe(7);
  });
});

describe('systemAfterTypeChange', () => {
  it('keeps the chosen system when it fits the new type', () => {
    expect(systemAfterTypeChange('multipitch', 'uiaa', 'kr')).toBe('uiaa');
    expect(systemAfterTypeChange('sport', 'fr', 'kr')).toBe('fr');
  });
});

describe('otherGrades', () => {
  it('lists the grade in the two other systems', () => {
    const i = parseGrade('VI.1', 'kr')!;
    expect(otherGrades({ grade_index: i, type: 'sport' }, 'kr')).toBe(`${formatGrade(i, 'uiaa')} UIAA · ${formatGrade(i, 'fr')} FR`);
    expect(otherGrades({ grade_index: i, type: 'sport', grade_label: 'VI.1+/2', grade_system: 'kr' }, 'fr')).toBe('VI.1+/2 KR · ' + `${formatGrade(i, 'uiaa')} UIAA`);
  });
});
