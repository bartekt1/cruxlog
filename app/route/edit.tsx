import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { Text } from '../../src/ui/Text';
import { deleteRoute, getRoute, listSectorNames, reportDeletion, routeUsage, updateRoute, type RouteRow } from '../../src/db/repo';
import { validateOptionalNumber, validateRouteDraft } from '../../src/domain/forms';
import { formatGrade, gradeExample, type GradeSystem, type RouteType } from '../../src/domain/grades';
import { confirmDelete } from '../../src/ui/confirm';
import { FromPack } from '../../src/ui/FromPack';
import { Button, Chip, ChipRow, ErrorText, Field, Label } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';
import { errorMessage } from '../../src/ui/errors';
import { GradeFields } from '../../src/ui/GradeFields';

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
  const [length, setLength] = useState('');
  const [bolts, setBolts] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRoute(db, id).then((r) => {
      if (!r) return;
      setRoute(r); setName(r.name); setSector(r.sector_name); setType(r.type); setSystem(r.grade_system);
      setGrade(r.grade_label || formatGrade(r.grade_index, r.grade_system, r.type));
      setLength(r.length_m != null ? String(r.length_m) : ''); setBolts(r.bolts != null ? String(r.bolts) : '');
      listSectorNames(db, r.crag_id).then(setSectors);
    });
  }, [db, id]);


  async function save() {
    if (!route) return;
    const draft = validateRouteDraft({ crag: route.crag_name, sector, name, type, system, grade });
    if (!draft.ok) { setError(t(draft.error, { example: gradeExample(system, type) })); return; }
    const lengthM = validateOptionalNumber(length, false);
    const boltCount = validateOptionalNumber(bolts, true);
    if (!lengthM.ok || !boltCount.ok) { setError(t('edit.errors.number')); return; }
    setSaving(true);
    try {
      const v = draft.value;
      await updateRoute(db, id, { sectorName: v.sectorName, name: v.name, type, gradeLabel: v.gradeLabel, gradeSystem: system, gradeIndex: v.gradeIndex,
        lengthM: lengthM.value, bolts: boltCount.value });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
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
      <GradeFields value={{ type, system, grade }} onChange={(v) => { setType(v.type); setSystem(v.system); setGrade(v.grade); }} />
      <Label>{t('route.lengthLabel')}</Label>
      <Field value={length} onChangeText={setLength} accessibilityLabel={t('route.lengthLabel')} keyboardType="decimal-pad" placeholder={t('common.optional')} />
      <Label>{t('route.boltsLabel')}</Label>
      <Field value={bolts} onChangeText={setBolts} accessibilityLabel={t('route.boltsLabel')} keyboardType="number-pad" placeholder={t('common.optional')} />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label={saving ? t('common.saving') : t('common.save')} onPress={save} disabled={saving || !route} />
      {/* Routes from a pack or an import are not deleted one by one; they can be reported as gone. */}
      {!route ? null : route.source === 'user' ? <Button label={t('edit.deleteRoute')} onPress={remove} variant="danger" disabled={saving} />
        : <FromPack note={t('fromPack.route')} name={route.name} onReport={() => reportDeletion(db, 'route', id)} />}
    </ScrollView>
  );
}
