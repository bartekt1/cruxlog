import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteSector, getSector, renameSector, sectorUsage } from '../../src/db/repo';
import { confirmDelete } from '../../src/ui/confirm';
import { NameEditor } from '../../src/ui/NameEditor';

export default function EditSector() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const load = useCallback(() => getSector(db, id), [db, id]);
  return (
    <NameEditor
      title={t('edit.sectorTitle')}
      load={load}
      rename={(name) => renameSector(db, id, name)}
      deleteLabel={t('edit.deleteSector')}
      onDelete={async (name) => confirmDelete(t, name, await sectorUsage(db, id), async () => { await deleteSector(db, id); router.back(); })}
    />
  );
}
