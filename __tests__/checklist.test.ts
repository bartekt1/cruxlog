import { checklistLabel, checklistProgress, CHECKLIST_LABEL_MAX, DEFAULT_CHECKLIST } from '../src/domain/checklist';

describe('checklist', () => {
  it('cleans the label and rejects empty or too long ones', () => {
    expect(checklistLabel('  Lina   60 m ')).toEqual({ label: 'Lina 60 m' });
    expect(checklistLabel('   ')).toEqual({ error: 'checklist.labelEmpty' });
    expect(checklistLabel('x'.repeat(CHECKLIST_LABEL_MAX + 1))).toEqual({ error: 'checklist.labelTooLong' });
  });
  it('counts ticked items', () => {
    expect(checklistProgress([{ done: true }, { done: 0 }, { done: 1 }])).toEqual({ done: 2, total: 3 });
    expect(checklistProgress([])).toEqual({ done: 0, total: 0 });
  });
  it('has a basic list without repeats', () => {
    expect(new Set(DEFAULT_CHECKLIST).size).toBe(DEFAULT_CHECKLIST.length);
  });
});
