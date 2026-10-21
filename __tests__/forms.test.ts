import { isFirstTry, validateAreas, validateNewRoute, validateAscentDraft, validateOptionalNumber, validateCragDraft, validateGoalDraft, type GoalDraft, validateName, validateRouteDraft, type RouteDraft } from '../src/domain/forms';
import { parseGrade } from '../src/domain/grades';

const route: RouteDraft = { crag: ' Test Crag ', sector: '', name: 'Route 1', type: 'sport', system: 'kr', grade: 'VI.3' };

describe('validateRouteDraft', () => {
  it('accepts a valid route and defaults the sector to the crag', () => {
    const r = validateRouteDraft(route);
    expect(r).toEqual({ ok: true, value: { cragName: 'Test Crag', sectorName: 'Test Crag', name: 'Route 1', gradeLabel: 'VI.3', gradeIndex: parseGrade('VI.3', 'kr', 'sport') } });
  });
  it('names the missing field', () => {
    expect(validateRouteDraft({ ...route, crag: ' ' })).toEqual({ ok: false, error: 'ascent.errors.crag' });
    expect(validateRouteDraft({ ...route, name: '' })).toEqual({ ok: false, error: 'ascent.errors.name' });
  });
  it('rejects grades that do not belong to the system or type', () => {
    expect(validateRouteDraft({ ...route, grade: '9z' })).toEqual({ ok: false, error: 'ascent.errors.grade' });
    expect(validateRouteDraft({ ...route, system: 'fr', grade: 'VI.3' })).toEqual({ ok: false, error: 'ascent.errors.grade' });
    expect(validateRouteDraft({ ...route, type: 'multipitch', system: 'fr', grade: '6b' }).ok).toBe(true);
  });
});

describe('validateAscentDraft', () => {
  it('accepts a date and defaults empty attempts to 1', () => {
    expect(validateAscentDraft({ date: '2026-10-10', attempts: '' })).toEqual({ ok: true, value: { date: '2026-10-10', attempts: 1 } });
    expect(validateAscentDraft({ date: '2026-10-10', attempts: '3' })).toEqual({ ok: true, value: { date: '2026-10-10', attempts: 3 } });
  });
  it('rejects bad dates and attempt counts', () => {
    expect(validateAscentDraft({ date: '2026-02-30', attempts: '1' })).toEqual({ ok: false, error: 'ascent.errors.date' });
    for (const attempts of ['0', '-2', '1.5', 'abc']) {
      expect(validateAscentDraft({ date: '2026-10-10', attempts })).toEqual({ ok: false, error: 'ascent.errors.attempts' });
    }
  });
  it('treats onsight and flash as first tries', () => {
    expect(isFirstTry('os')).toBe(true);
    expect(isFirstTry('flash')).toBe(true);
    expect(isFirstTry('rp')).toBe(false);
  });
});

describe('validateGoalDraft', () => {
  const g = (over: Partial<GoalDraft>): GoalDraft => ({ kind: 'count', title: 'x', target: '', gradeIndex: null, routeId: null, ...over });
  const none = { gradeIndex: null, routeId: null };
  it('requires a title, or uses the fallback', () => {
    expect(validateGoalDraft(g({ kind: 'project', title: '  ' }))).toEqual({ ok: false, error: 'goals.errors.title' });
    expect(validateGoalDraft(g({ kind: 'project', title: ' ', fallbackTitle: 'Wielki komin', routeId: 'r1' })))
      .toEqual({ ok: true, value: { title: 'Wielki komin', target: null, gradeIndex: null, routeId: 'r1' } });
  });
  it('parses a count target and keeps only the fields of the kind', () => {
    expect(validateGoalDraft(g({ title: '200 sends', target: '200' }))).toEqual({ ok: true, value: { title: '200 sends', target: 200, ...none } });
    expect(validateGoalDraft(g({ target: '' }))).toEqual({ ok: true, value: { title: 'x', target: null, ...none } });
    expect(validateGoalDraft(g({ kind: 'wishlist', target: 'abc', gradeIndex: 3 }))).toEqual({ ok: true, value: { title: 'x', target: null, ...none } });
    expect(validateGoalDraft(g({ routeId: 'r1' }))).toEqual({ ok: true, value: { title: 'x', target: null, ...none } });
  });
  it('needs a grade for a grade goal and counts one route by default', () => {
    expect(validateGoalDraft(g({ kind: 'grade' }))).toEqual({ ok: false, error: 'goals.errors.grade' });
    expect(validateGoalDraft(g({ kind: 'grade', gradeIndex: 9 }))).toEqual({ ok: true, value: { title: 'x', target: 1, gradeIndex: 9, routeId: null } });
    expect(validateGoalDraft(g({ kind: 'grade', gradeIndex: 9, target: '3' }))).toEqual({ ok: true, value: { title: 'x', target: 3, gradeIndex: 9, routeId: null } });
  });
  it('rejects a non-numeric target instead of storing NaN', () => {
    expect(validateGoalDraft(g({ target: 'abc' }))).toEqual({ ok: false, error: 'goals.errors.target' });
    expect(validateGoalDraft(g({ kind: 'grade', gradeIndex: 9, target: '0' }))).toEqual({ ok: false, error: 'goals.errors.target' });
  });
});

describe('crag and name drafts', () => {
  it('requires a name and trims everything', () => {
    expect(validateName('  ')).toEqual({ ok: false, error: 'edit.errors.name' });
    expect(validateName(' Lewy ')).toEqual({ ok: true, value: 'Lewy' });
    const at = (region: string, area: string, group = '') => ({ region, area, group });
    expect(validateCragDraft({ name: '', areas: at('Jura', 'Rzędkowice'), description: '', approach: '' })).toEqual({ ok: false, error: 'edit.errors.name' });
    expect(validateCragDraft({ name: 'Okiennik', areas: at(' ', 'Rzędkowice'), description: '', approach: '' })).toEqual({ ok: false, error: 'edit.errors.region' });
    expect(validateCragDraft({ name: 'Okiennik', areas: at('Jura', ''), description: '', approach: '' })).toEqual({ ok: false, error: 'edit.errors.area' });
    expect(validateCragDraft({ name: ' Okiennik ', areas: at(' Jura ', ' Rzędkowice ', ' '), description: ' opis ', approach: '', sectors: [' Lewy ', '', 'lewy', 'Prawy'] }))
      .toEqual({ ok: true, value: { name: 'Okiennik', areas: at('Jura', 'Rzędkowice'), description: 'opis', approach: '', sectorNames: ['Lewy', 'Prawy'] } });
  });
});

describe('validateOptionalNumber', () => {
  it('accepts empty, decimals with a comma, and rejects letters, negatives and fractions where whole numbers are needed', () => {
    expect(validateOptionalNumber(' ', false)).toEqual({ ok: true, value: null });
    expect(validateOptionalNumber('18,5', false)).toEqual({ ok: true, value: 18.5 });
    expect(validateOptionalNumber('6', true)).toEqual({ ok: true, value: 6 });
    for (const [text, integer] of [['abc', false], ['-1', false], ['6.5', true], ['9000', false]] as const) {
      expect(validateOptionalNumber(text, integer)).toEqual({ ok: false, error: 'edit.errors.number' });
    }
  });
});

describe('validateAreas', () => {
  it('needs a region and an area, the group is optional', () => {
    expect(validateAreas({ region: ' Jura ', area: ' Sokoliki ', group: '' })).toEqual({ ok: true, value: { region: 'Jura', area: 'Sokoliki', group: '' } });
    expect(validateAreas({ region: '', area: 'Sokoliki', group: '' })).toEqual({ ok: false, error: 'edit.errors.region' });
    expect(validateAreas({ region: 'Jura', area: ' ', group: 'G' })).toEqual({ ok: false, error: 'edit.errors.area' });
  });
});

describe('validateNewRoute', () => {
  const draft = { crag: 'Krowia', sector: '', name: 'Rysa', type: 'sport' as const, system: 'kr' as const, grade: 'VI.1' };
  it('needs a region and an area unless the crag already has one', () => {
    expect(validateNewRoute({ ...draft, areas: { region: '', area: '', group: '' }, cragHasArea: false })).toEqual({ ok: false, error: 'ascent.errors.region' });
    expect(validateNewRoute({ ...draft, areas: { region: '', area: '', group: '' }, cragHasArea: true }).ok).toBe(true);
    expect(validateNewRoute({ ...draft, areas: { region: 'Czarnorzeki', area: 'Kamieniec', group: '' }, cragHasArea: false }).ok).toBe(true);
    expect(validateNewRoute({ ...draft, name: '', areas: { region: '', area: '', group: '' }, cragHasArea: false })).toEqual({ ok: false, error: 'ascent.errors.name' });
  });
});
