import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { Text } from '../../src/ui/Text';
import { cragUsage, deleteCrag, getCrag, listAreas, saveCrag, type AreaNames, type AreaRow } from '../../src/db/repo';
import { pathNames } from '../../src/domain/areas';
import { validateCragDraft } from '../../src/domain/forms';
import { confirmDelete } from '../../src/ui/confirm';
import { AreaPicker } from '../../src/ui/AreaPicker';
import { Button, ErrorText, Field, Label, LinkButton } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';
import { errorMessage } from '../../src/ui/errors';

/** /crag/edit adds a crag (?areaId=<area> preselects region, area and group), /crag/edit?id=<crag> edits one. */
export default function EditCrag() {
  const { id, areaId } = useLocalSearchParams<{ id?: string; areaId?: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [name, setName] = useState('');
  const [areas, setAreas] = useState<AreaNames>({ region: '', area: '', group: '' });
  const [sectors, setSectors] = useState<string[]>(['']);
  const [description, setDescription] = useState('');
  const [approach, setApproach] = useState('');
  const [areaRows, setAreaRows] = useState<AreaRow[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listAreas(db).then(async (rows) => {
      setAreaRows(rows);
      if (!id) { if (areaId) setAreas(pathNames(rows, areaId)); return; }
      const c = await getCrag(db, id);
      if (!c) return;
      setName(c.name); setAreas(pathNames(rows, c.region_id)); setDescription(c.description); setApproach(c.approach);
    });
  }, [db, id, areaId]);

  async function save() {
    const draft = validateCragDraft({ name, areas, description, approach, sectors: id ? [] : sectors });
    if (!draft.ok) { setError(t(draft.error)); return; }
    setSaving(true);
    try {
      const cragId = await saveCrag(db, id ?? null, draft.value);
      if (id) router.back();
      else router.replace(`/crag/${cragId}`);
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    confirmDelete(t, name, await cragUsage(db, id), async () => {
      await deleteCrag(db, id);
      router.dismissTo('/crags');
    });
  }

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: id ? t('edit.cragTitle') : t('edit.newCragTitle') }} />
      <Label>{t('areas.where')}</Label>
      <AreaPicker areas={areaRows} value={areas} onChange={setAreas} invalid={{ region: !!error && !areas.region.trim(), area: !!error && !areas.area.trim() }} />
      <Label>{t('edit.cragName')}</Label>
      <Field value={name} onChangeText={setName} accessibilityLabel={t('edit.cragName')} invalid={!!error && !!areas.area.trim() && !name.trim()} />
      {id ? null : (
        <>
          <Label>{t('edit.sectors')}</Label>
          {sectors.map((sec, i) => (
            <Field
              key={i}
              value={sec}
              onChangeText={(v) => setSectors((all) => all.map((x, j) => (j === i ? v : x)))}
              accessibilityLabel={`${t('edit.sector')} ${i + 1}`}
              placeholder={i === 0 ? t('ascent.sectorPlaceholder') : ''}
              style={{ marginTop: i ? 8 : 0 }}
            />
          ))}
          <LinkButton label={t('edit.addAnotherSector')} onPress={() => setSectors((all) => [...all, ''])} />
          <Text style={{ color: th.muted, fontSize: 12 }}>{t('edit.sectorsHint')}</Text>
        </>
      )}
      <Label>{t('edit.description')}</Label>
      <Field value={description} onChangeText={setDescription} accessibilityLabel={t('edit.description')} multiline textAlignVertical="top" style={{ minHeight: 80 }} />
      <Label>{t('crags.approach')}</Label>
      <Field value={approach} onChangeText={setApproach} accessibilityLabel={t('crags.approach')} multiline textAlignVertical="top" style={{ minHeight: 60 }} />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label={saving ? t('common.saving') : t('common.save')} onPress={save} disabled={saving} />
      {id ? <Button label={t('edit.deleteCrag')} onPress={remove} variant="danger" disabled={saving} /> : null}
    </ScrollView>
  );
}
