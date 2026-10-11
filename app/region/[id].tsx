import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteRegion, getRegion, renameRegion } from '../../src/db/repo';
import { confirmDelete } from '../../src/ui/confirm';
import { NameEditor } from '../../src/ui/NameEditor';

export default function EditRegion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const load = useCallback(() => getRegion(db, id), [db, id]);
  return (
    <NameEditor
      title={t('edit.regionTitle')}
      hint={t('edit.regionDeleteHint')}
      load={load}
      rename={(name) => renameRegion(db, id, name)}
      deleteLabel={t('edit.deleteRegion')}
      onDelete={(name) => confirmDelete(t, name, null, async () => { await deleteRegion(db, id); router.back(); })}
    />
  );
}
