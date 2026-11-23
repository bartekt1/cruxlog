import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, now } from './ids';

/** The basic packing list; more lists (per trip, templates) can use other names later. */
export const PACK_LIST = 'pack';

export type ChecklistItem = { id: string; label: string; done: boolean; position: number };

export async function listChecklist(db: SQLiteDatabase, list = PACK_LIST): Promise<ChecklistItem[]> {
  const rows = await db.getAllAsync<{ id: string; label: string; done: number; position: number }>(
    'SELECT id, label, done, position FROM checklist_item WHERE list = ? AND deleted_at IS NULL ORDER BY position, created_at', [list]);
  return rows.map((r) => ({ ...r, done: r.done === 1 }));
}

/** Adds things at the end of the list, in the given order, in one transaction. */
export async function addChecklistItems(db: SQLiteDatabase, labels: string[], list = PACK_LIST): Promise<void> {
  await db.withTransactionAsync(async () => {
    const last = await db.getFirstAsync<{ p: number | null }>('SELECT MAX(position) AS p FROM checklist_item WHERE list = ? AND deleted_at IS NULL', [list]);
    let position = (last?.p ?? -1) + 1;
    const at = now();
    for (const label of labels) {
      await db.runAsync('INSERT INTO checklist_item (id, list, label, done, position, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?)',
        [newId(), list, label, position++, at, at]);
    }
  });
}

export async function setChecklistDone(db: SQLiteDatabase, id: string, done: boolean): Promise<void> {
  await db.runAsync('UPDATE checklist_item SET done = ?, updated_at = ? WHERE id = ?', [done ? 1 : 0, now(), id]);
}

/** Unticks everything, e.g. before packing for the next trip. */
export async function resetChecklist(db: SQLiteDatabase, list = PACK_LIST): Promise<void> {
  await db.runAsync('UPDATE checklist_item SET done = 0, updated_at = ? WHERE list = ? AND done = 1 AND deleted_at IS NULL', [now(), list]);
}

export async function deleteChecklistItem(db: SQLiteDatabase, id: string): Promise<void> {
  const at = now();
  await db.runAsync('UPDATE checklist_item SET deleted_at = ?, updated_at = ? WHERE id = ?', [at, at, id]);
}
