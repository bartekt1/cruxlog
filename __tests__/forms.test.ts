import { isFirstTry, validateAscentDraft, validateCragDraft, validateGoalDraft, validateName, validateRouteDraft, type RouteDraft } from '../src/domain/forms';
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
    expect(validateRouteDraft({ ...route, type: 'boulder', system: 'font', grade: 'VI.3' })).toEqual({ ok: false, error: 'ascent.errors.grade' });
    expect(validateRouteDraft({ ...route, type: 'boulder', system: 'font', grade: '6b' }).ok).toBe(true);
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
  it('requires a title', () => {
    expect(validateGoalDraft({ kind: 'project', title: '  ', target: '' })).toEqual({ ok: false, error: 'goals.errors.title' });
  });
  it('parses a count target and ignores it for other kinds', () => {
    expect(validateGoalDraft({ kind: 'count', title: '200 sends', target: '200' })).toEqual({ ok: true, value: { title: '200 sends', target: 200 } });
    expect(validateGoalDraft({ kind: 'count', title: 'x', target: '' })).toEqual({ ok: true, value: { title: 'x', target: null } });
    expect(validateGoalDraft({ kind: 'wishlist', title: 'x', target: 'abc' })).toEqual({ ok: true, value: { title: 'x', target: null } });
  });
  it('rejects a non-numeric count target instead of storing NaN', () => {
    expect(validateGoalDraft({ kind: 'count', title: 'x', target: 'abc' })).toEqual({ ok: false, error: 'goals.errors.target' });
    expect(validateGoalDraft({ kind: 'count', title: 'x', target: '0' })).toEqual({ ok: false, error: 'goals.errors.target' });
  });
});

describe('crag and name drafts', () => {
  it('requires a name and trims everything', () => {
    expect(validateName('  ')).toEqual({ ok: false, error: 'edit.errors.name' });
    expect(validateName(' Lewy ')).toEqual({ ok: true, value: 'Lewy' });
    expect(validateCragDraft({ name: '', region: 'Jura', description: '', approach: '' })).toEqual({ ok: false, error: 'edit.errors.name' });
    expect(validateCragDraft({ name: ' Okiennik ', region: ' Jura ', description: ' opis ', approach: '' }))
      .toEqual({ ok: true, value: { name: 'Okiennik', regionName: 'Jura', description: 'opis', approach: '' } });
  });
});
