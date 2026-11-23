import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteSector, getSector, reportDeletion, saveSector, sectorUsage } from '../../src/db/repo';
import { ASPECTS, parseAspect, type Aspect } from '../../src/domain/aspect';
import { confirmDelete } from '../../src/ui/confirm';
import { Chip, ChipRow, Label } from '../../src/ui/kit';
import { NameEditor } from '../../src/ui/NameEditor';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';

/** Edit a sector (a wall): its name and its aspect ("wystawa", which way it faces), or delete it. */
export default function EditSector() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [aspect, setAspect] = useState<Aspect | null>(null);
  const load = useCallback(() => getSector(db, id), [db, id]);
  useEffect(() => { getSector(db, id).then((s) => setAspect(parseAspect(s?.aspect))); }, [db, id]);
  return (
    <NameEditor
      title={t('edit.sectorTitle')}
      load={load}
      rename={(name) => saveSector(db, id, name, aspect)}
      deleteLabel={t('edit.deleteSector')}
      fromPack={{ note: t('fromPack.sector'), onReport: () => reportDeletion(db, 'sector', id) }}
      onDelete={async (name) => confirmDelete(t, name, await sectorUsage(db, id), async () => { await deleteSector(db, id); router.back(); })}
    >
      <Label>{t('aspect.label')}</Label>
      <Text style={{ color: th.muted, marginBottom: 4 }}>{t('aspect.hint')}</Text>
      <ChipRow>
        <Chip label={t('aspect.none')} on={aspect == null} onPress={() => setAspect(null)} />
        {ASPECTS.map((a) => <Chip key={a} label={t(`aspect.short.${a}`)} accessibilityLabel={t(`aspect.long.${a}`)} on={aspect === a} onPress={() => setAspect(a)} />)}
      </ChipRow>
      {aspect ? <Text style={{ color: th.muted, marginTop: 6 }}>{t('aspect.facing', { name: t(`aspect.long.${aspect}`) })}</Text> : null}
    </NameEditor>
  );
}
