import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, ScrollView, Text } from 'react-native';
import { createRoute, getCrag, listCragRoutes, listSectors, type CragDetail, type CragRouteRow, type SectorRow } from '../../src/db/repo';
import { validateRouteDraft } from '../../src/domain/forms';
import { formatGrade, gradeExample, systemsFor, type GradeSystem, type RouteType } from '../../src/domain/grades';
import { sameName } from '../../src/domain/text';
import { Button, Chip, ChipRow, ErrorText, Field, Label } from '../../src/ui/kit';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';

/** /route/new?cragId=<crag>[&sector=<name>]: add one or more routes to a crag, without an ascent. */
export default function NewRoutes() {
  const { cragId, sector: sectorParam } = useLocalSearchParams<{ cragId: string; sector?: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const settings = useSettings();
  const [crag, setCrag] = useState<CragDetail | null>(null);
  const [sectors, setSectors] = useState<SectorRow[]>([]);
  const [existing, setExisting] = useState<CragRouteRow[]>([]);
  const [sector, setSector] = useState(sectorParam ?? '');
  const [name, setName] = useState('');
  const [type, setType] = useState<RouteType>('sport');
  const [system, setSystem] = useState<GradeSystem>(settings.routeSystem);
  const [grade, setGrade] = useState('');
  const [error, setError] = useState('');
  const [added, setAdded] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const reload = () => {
    listSectors(db, cragId).then(setSectors);
    listCragRoutes(db, cragId).then(setExisting);
  };
  useEffect(() => {
    getCrag(db, cragId).then(setCrag);
    reload();
  }, [db, cragId]);

  function pickType(next: RouteType) {
    setType(next);
    setSystem(systemsFor(next).includes(system) ? system : settings.routeSystem);
  }

  const duplicate = name.trim() ? existing.find((r) => sameName(r.name, name)) ?? null : null;

  async function save(more: boolean) {
    if (!crag) return;
    if (duplicate) { setError(t('edit.routeExists', { name: duplicate.name, sector: duplicate.sector_name })); return; }
    const draft = validateRouteDraft({ crag: crag.name, sector, name, type, system, grade });
    if (!draft.ok) { setError(t(draft.error, { example: gradeExample(system, type) })); return; }
    setError('');
    setSaving(true);
    try {
      const v = draft.value;
      await createRoute(db, cragId, { sectorName: sector.trim(), name: v.name, type, gradeLabel: v.gradeLabel, gradeSystem: system, gradeIndex: v.gradeIndex });
      if (!more) { router.back(); return; }
      // Keep sector, type and grade system for the next route; clear the rest.
      setAdded((a) => [...a, `${v.name} (${formatGrade(v.gradeIndex, system, type)})`]);
      setName(''); setGrade('');
      Keyboard.dismiss();
      reload();
    } catch (e) {
      setError(t('common.failed', { message: (e as Error).message }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: t('edit.addRoutesTitle') }} />
      {crag ? <Text style={{ color: th.muted }}>{[crag.region, crag.name].filter(Boolean).join(' · ')}</Text> : null}
      {added.length ? <Text style={{ color: th.accent, marginTop: 8 }}>✓ {t('edit.addedRoutes', { list: added.join(', ') })}</Text> : null}

      <Label>{t('edit.sector')}</Label>
      <Field value={sector} onChangeText={setSector} accessibilityLabel={t('edit.sector')} placeholder={t('edit.sectorOptional')} />
      {sectors.length ? (
        <ChipRow>
          {sectors.map((s) => <Chip key={s.id} label={s.name} on={sameName(s.name, sector)} onPress={() => setSector(sameName(s.name, sector) ? '' : s.name)} />)}
        </ChipRow>
      ) : null}

      <Label>{t('ascent.name')}</Label>
      <Field value={name} onChangeText={setName} accessibilityLabel={t('ascent.name')} invalid={!!duplicate} />
      {duplicate ? <Text style={{ color: th.warn, marginTop: 4 }}>{t('edit.routeExists', { name: duplicate.name, sector: duplicate.sector_name })}</Text> : null}

      <Label>{t('ascent.type')}</Label>
      <ChipRow>
        {(['sport', 'multipitch'] as RouteType[]).map((x) => <Chip key={x} label={t(`types.${x}`)} on={type === x} onPress={() => pickType(x)} />)}
      </ChipRow>
      <Label>{t('ascent.gradeSystem')}</Label>
      <ChipRow>{systemsFor(type).map((s) => <Chip key={s} label={s.toUpperCase()} on={system === s} onPress={() => setSystem(s)} />)}</ChipRow>
      <Label>{t('ascent.grade')}</Label>
      <Field value={grade} onChangeText={setGrade} accessibilityLabel={t('ascent.grade')} autoCapitalize="characters" autoCorrect={false}
        placeholder={t('ascent.gradeExample', { example: gradeExample(system, type) })} />

      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label={t('edit.saveAndNext')} onPress={() => save(true)} disabled={saving || !crag} />
      <Button label={t('edit.saveAndClose')} onPress={() => save(false)} variant="plain" disabled={saving || !crag} />
    </ScrollView>
  );
}
