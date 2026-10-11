import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';
import { deleteRoute, getRoute, listSectorNames, routeUsage, updateRoute, type RouteRow } from '../../src/db/repo';
import { validateRouteDraft } from '../../src/domain/forms';
import { formatGrade, gradeExample, systemsFor, type GradeSystem, type RouteType } from '../../src/domain/grades';
import { confirmDelete } from '../../src/ui/confirm';
import { Button, Chip, ChipRow, ErrorText, Field, Label } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

/** /route/edit?id=<route> edits one of the user's own routes. */
export default function EditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [route, setRoute] = useState<RouteRow | null>(null);
  const [sectors, setSectors] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [type, setType] = useState<RouteType>('sport');
  const [system, setSystem] = useState<GradeSystem>('kr');
  const [grade, setGrade] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRoute(db, id).then((r) => {
      if (!r) return;
      setRoute(r); setName(r.name); setSector(r.sector_name); setType(r.type); setSystem(r.grade_system);
      setGrade(formatGrade(r.grade_index, r.grade_system, r.type));
      listSectorNames(db, r.crag_id).then(setSectors);
    });
  }, [db, id]);

  function pickType(next: RouteType) {
    setType(next);
    if (!systemsFor(next).includes(system)) setSystem(systemsFor(next)[0]);
  }

  async function save() {
    if (!route) return;
    const draft = validateRouteDraft({ crag: route.crag_name, sector, name, type, system, grade });
    if (!draft.ok) { setError(t(draft.error, { example: gradeExample(system, type) })); return; }
    setSaving(true);
    try {
      const v = draft.value;
      await updateRoute(db, id, { sectorName: v.sectorName, name: v.name, type, gradeLabel: v.gradeLabel, gradeSystem: system, gradeIndex: v.gradeIndex });
      router.back();
    } catch (e) {
      setError(t('common.failed', { message: (e as Error).message }));
      setSaving(false);
    }
  }

  async function remove() {
    confirmDelete(t, name, await routeUsage(db, id), async () => {
      await deleteRoute(db, id);
      router.back();
    });
  }

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: t('edit.routeTitle') }} />
      {route ? <Text style={{ color: th.muted }}>{route.crag_name}</Text> : null}
      <Label>{t('edit.name')}</Label>
      <Field value={name} onChangeText={setName} accessibilityLabel={t('edit.name')} />
      <Label>{t('edit.sector')}</Label>
      <Field value={sector} onChangeText={setSector} accessibilityLabel={t('edit.sector')} />
      {sectors.length > 1 ? (
        <ChipRow>{sectors.map((s) => <Chip key={s} label={s} on={sector.trim() === s} onPress={() => setSector(s)} />)}</ChipRow>
      ) : null}
      <Label>{t('ascent.type')}</Label>
      <ChipRow>
        {(['sport', 'boulder', 'multipitch'] as RouteType[]).map((x) => <Chip key={x} label={t(`types.${x}`)} on={type === x} onPress={() => pickType(x)} />)}
      </ChipRow>
      <Label>{t('ascent.gradeSystem')}</Label>
      <ChipRow>{systemsFor(type).map((s) => <Chip key={s} label={s.toUpperCase()} on={system === s} onPress={() => setSystem(s)} />)}</ChipRow>
      <Label>{t('ascent.grade')}</Label>
      <Field value={grade} onChangeText={setGrade} accessibilityLabel={t('ascent.grade')} autoCapitalize="characters" autoCorrect={false}
        placeholder={t('ascent.gradeExample', { example: gradeExample(system, type) })} />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label={saving ? t('common.saving') : t('common.save')} onPress={save} disabled={saving || !route} />
      <Button label={t('edit.deleteRoute')} onPress={remove} variant="danger" disabled={saving || !route} />
    </ScrollView>
  );
}
