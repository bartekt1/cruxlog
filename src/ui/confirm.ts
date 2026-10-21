import type { TFunction } from 'i18next';
import { Alert } from 'react-native';
import type { Usage } from '../db/repo';
import { runOrAlert } from './errors';

/** Asks before deleting; lists what goes with it (sectors, routes, ascents) when there is anything. A failed delete is shown. */
export function confirmDelete(t: TFunction, name: string, usage: Usage | null, onConfirm: () => Promise<unknown>) {
  const parts: string[] = [];
  if (usage?.sectors) parts.push(t('edit.countSectors', { count: usage.sectors }));
  if (usage?.routes) parts.push(t('edit.countRoutes', { count: usage.routes }));
  if (usage?.ascents) parts.push(t('edit.countAscents', { count: usage.ascents }));
  const message = parts.length ? `${t('edit.deleteAlso')}\n${parts.join('\n')}` : t('edit.deleteSimple');
  Alert.alert(t('edit.deleteTitle', { name }), message, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.delete'), style: 'destructive', onPress: () => { void runOrAlert(onConfirm); } },
  ]);
}
