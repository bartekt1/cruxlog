import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';
import { cragUsage, deleteCrag, getCrag, listRegions, saveCrag, type RegionRow } from '../../src/db/repo';
import { validateCragDraft } from '../../src/domain/forms';
import { confirmDelete } from '../../src/ui/confirm';
import { sameName, suggest } from '../../src/domain/text';
import { Button, Chip, ChipRow, ErrorText, Field, Label, LinkButton } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

/** /crag/edit adds a crag (?region=<name> preselects the region), /crag/edit?id=<crag> edits one of the user's own. */
export default function EditCrag() {
  const { id, region: regionParam } = useLocalSearchParams<{ id?: string; region?: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [name, setName] = useState('');
  const [region, setRegion] = useState(regionParam ?? '');
  const [sectors, setSectors] = useState<string[]>(['']);
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
    const draft = validateCragDraft({ name, region, description, approach, sectors: id ? [] : sectors });
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
      <Label>{t('edit.regionRequired')}</Label>
      <Field value={region} onChangeText={setRegion} accessibilityLabel={t('edit.regionRequired')} placeholder={t('edit.regionPlaceholder')} invalid={!!error && !region.trim()} />
      {regions.length ? (
        <ChipRow>
          {suggest(regions.map((g) => g.name), region, (x) => x, () => [], 8).map((g) => (
            <Chip key={g} label={g} on={sameName(g, region)} onPress={() => setRegion(sameName(g, region) ? '' : g)} />
          ))}
        </ChipRow>
      ) : null}
      <Label>{t('edit.cragName')}</Label>
      <Field value={name} onChangeText={setName} accessibilityLabel={t('edit.cragName')} invalid={!!error && !!region.trim() && !name.trim()} />
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
