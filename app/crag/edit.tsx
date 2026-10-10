import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { cragUsage, deleteCrag, getCrag, listRegions, saveCrag, type RegionRow } from '../../src/db/repo';
import { validateCragDraft } from '../../src/domain/forms';
import { confirmDelete } from '../../src/ui/confirm';
import { Button, Chip, ChipRow, ErrorText, Field, Label } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

/** /crag/edit adds a crag, /crag/edit?id=<crag> edits one of the user's own. */
export default function EditCrag() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [description, setDescription] = useState('');
  const [approach, setApproach] = useState('');
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listRegions(db).then(setRegions);
    if (id) getCrag(db, id).then((c) => {
      if (!c) return;
      setName(c.name); setRegion(c.region ?? ''); setDescription(c.description); setApproach(c.approach);
    });
  }, [db, id]);

  async function save() {
    const draft = validateCragDraft({ name, region, description, approach });
    if (!draft.ok) { setError(t(draft.error)); return; }
    setSaving(true);
    try {
      const cragId = await saveCrag(db, id ?? null, draft.value);
      if (id) router.back();
      else router.replace(`/crag/${cragId}`);
    } catch (e) {
      setError(t('common.failed', { message: (e as Error).message }));
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
      <Label>{t('edit.name')}</Label>
      <Field value={name} onChangeText={setName} accessibilityLabel={t('edit.name')} invalid={!!error && !name.trim()} autoFocus={!id} />
      <Label>{t('edit.region')}</Label>
      <Field value={region} onChangeText={setRegion} accessibilityLabel={t('edit.region')} placeholder={t('edit.regionPlaceholder')} />
      {regions.length ? (
        <ChipRow>
          {regions.map((g) => <Chip key={g.id} label={g.name} on={region.trim() === g.name} onPress={() => setRegion(region.trim() === g.name ? '' : g.name)} />)}
        </ChipRow>
      ) : null}
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
