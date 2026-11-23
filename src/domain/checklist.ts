// The packing checklist: the basic list offered on first use, and the checks on what the user types.

/** The basic list, as keys of `checklist.defaults` in the translations, in packing order. */
export const DEFAULT_CHECKLIST = [
  'rope', 'quickdraws', 'harness', 'helmet', 'belayDevice', 'lockers', 'slings', 'shoes', 'chalk', 'brush',
  'firstAid', 'headlamp', 'water', 'food', 'jacket', 'sunscreen', 'phone', 'topo',
] as const;
export type DefaultChecklistKey = (typeof DEFAULT_CHECKLIST)[number];

export const CHECKLIST_LABEL_MAX = 80;

/** The label to save, or the i18n key of the problem. */
export function checklistLabel(text: string): { label: string } | { error: string } {
  const label = text.trim().replace(/\s+/g, ' ');
  if (!label) return { error: 'checklist.labelEmpty' };
  if (label.length > CHECKLIST_LABEL_MAX) return { error: 'checklist.labelTooLong' };
  return { label };
}

/** How many things are ticked off, out of all. */
export function checklistProgress(items: { done: boolean | number }[]): { done: number; total: number } {
  return { done: items.filter((i) => !!i.done).length, total: items.length };
}
