import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteArea, getArea, renameArea } from '../../src/db/repo';
import type { AreaLevel } from '../../src/domain/areas';
import { confirmDelete } from '../../src/ui/confirm';
import { NameEditor } from '../../src/ui/NameEditor';

/** Rename or delete a region, rejon or group. Deleting moves its crags and sub-areas one level up. */
export default function EditArea() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const [level, setLevel] = useState<AreaLevel>('region');
  useEffect(() => { getArea(db, id).then((a) => a && setLevel(a.level)); }, [db, id]);
  const load = useCallback(() => getArea(db, id), [db, id]);
  return (
    <NameEditor
      title={t(`areas.edit.${level}`)}
      hint={t('areas.deleteHint')}
      load={load}
      rename={(name) => renameArea(db, id, name)}
      deleteLabel={t(`areas.delete.${level}`)}
      fromPack={{ note: t('fromPack.area') }}
      onDelete={(name) => confirmDelete(t, name, null, async () => {
        await deleteArea(db, id);
        router.back();
      })}
    />
  );
}
