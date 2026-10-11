import { fold, matches, sameName, suggest } from '../src/domain/text';

describe('text matching', () => {
  it('folds case and Polish letters', () => {
    expect(fold('  Łysa   Skała ')).toBe('lysa skala');
    expect(fold('ŻÓŁĆ gęś')).toBe('zolc ges');
    expect(sameName('Okiennik', ' okiennik')).toBe(true);
    expect(sameName('Okiennik', 'Okiennik Wielki')).toBe(false);
  });
  it('matches every word in any field, ignoring diacritics', () => {
    expect(matches('lysa', 'Łysa')).toBe(true);
    expect(matches('ŁYSA', 'łysa')).toBe(true);
    expect(matches('rysa okien', 'Rysa Kowalskiego', 'Okiennik')).toBe(true);
    expect(matches('rysa sokol', 'Rysa Kowalskiego', 'Okiennik')).toBe(false);
    expect(matches('  ', 'anything')).toBe(true);
  });
  it('puts names starting with the query first and limits the list', () => {
    const items = ['Zachodnia Rysa', 'Rysa', 'Filar', 'Rysiek', 'Łysa'];
    expect(suggest(items, 'rys', (x) => x)).toEqual(['Rysa', 'Rysiek', 'Zachodnia Rysa']);
    expect(suggest(items, 'lys', (x) => x)).toEqual(['Łysa']);
    expect(suggest(items, '', (x) => x, () => [], 2)).toEqual(['Filar', 'Łysa']);
  });
});
