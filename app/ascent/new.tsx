import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { getAscent, getRoute, listAreas, listCragChoices, listPartners, routeGoals, saveAscent, type AreaRow, type CragChoice, type RouteRow } from '../../src/db/repo';
import { pathLabels, pathNames } from '../../src/domain/areas';
import { isoDate, shiftDay } from '../../src/domain/dates';
import { isFirstTry, validateAscentDraft, validateNewRoute } from '../../src/domain/forms';
import { ASCENT_STYLES, feltGrade, formatGrade, gradeExample, nearbyGrades, parseGrade, routeGrade, type AscentStyle } from '../../src/domain/grades';
import { sameName, sectorLine, suggest } from '../../src/domain/text';
import { NewRouteForm, type NewRouteDraft } from '../../src/ui/ascent/NewRouteForm';
import { RouteChooser } from '../../src/ui/ascent/RouteChooser';
import { useAscentPhotos } from '../../src/ui/ascent/useAscentPhotos';
import { DateField } from '../../src/ui/DateField';
import { errorMessage } from '../../src/ui/errors';
import { Button, Chip, ChipRow, ErrorText, Field, HIT, Label, LinkButton, Suggestions, type SuggestionItem } from '../../src/ui/kit';
import { PhotoEditor } from '../../src/ui/PhotoViews';
import { storePhoto } from '../../src/ui/photos';
import { SwitchRow } from '../../src/ui/rows';
import { useSettings } from '../../src/ui/settingsStore';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';

type FieldName = 'route' | 'crag' | 'name' | 'grade' | 'date' | 'attempts' | 'region';
const FIELD_OF: Record<string, FieldName> = {
  'ascent.pickRoute': 'route', 'ascent.errors.crag': 'crag', 'ascent.errors.name': 'name', 'ascent.errors.grade': 'grade',
  'ascent.errors.date': 'date', 'ascent.errors.attempts': 'attempts', 'ascent.errors.region': 'region',
};
const NO_AREAS = { region: '', area: '', group: '' };

// Also the edit screen: /ascent/new?id=<ascent> edits, /ascent/new?routeId=<route> starts on that route.
export default function NewAscent() {
  const { id, routeId } = useLocalSearchParams<{ id?: string; routeId?: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const settings = useSettings();

  const [route, setRoute] = useState<RouteRow | null>(null);
  // A new route typed with the ascent, instead of a chosen one.
  const [creating, setCreating] = useState(false);
  const [newRoute, setNewRoute] = useState<NewRouteDraft>({ crag: '', sector: '', name: '', type: 'sport', system: settings.routeSystem, grade: '', areas: NO_AREAS });
  const [crags, setCrags] = useState<CragChoice[]>([]);
  const [areaRows, setAreaRows] = useState<AreaRow[]>([]);
  const labels = useMemo(() => pathLabels(areaRows), [areaRows]);
  const [partners, setPartners] = useState<string[]>([]);
  const [partnerFocus, setPartnerFocus] = useState(false);

  const today = isoDate(new Date());
  const [date, setDate] = useState(today);
  const [style, setStyle] = useState<AscentStyle>('rp');
  const [attempts, setAttempts] = useState('1');
  const [rating, setRating] = useState<number | null>(null);
  const [felt, setFelt] = useState<number | null>(null);
  const [partner, setPartner] = useState('');
  const [weather, setWeather] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<{ key: string; field?: FieldName; message?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  // An attempt can make the route a project in one go (new ascents only).
  const [asProject, setAsProject] = useState(false);
  const [isProject, setIsProject] = useState(false);
  const photos = useAscentPhotos(db, id);

  useEffect(() => {
    let live = true;
    if (id) {
      getAscent(db, id).then((a) => {
        if (!a || !live) return;
        setRoute(a.route); setDate(a.date); setStyle(a.style); setAttempts(String(a.attempts)); setRating(a.rating); setFelt(a.felt_grade_index);
        setPartner(a.partner_name ?? ''); setWeather(a.weather); setNotes(a.notes);
      });
    } else if (routeId) {
      getRoute(db, routeId).then((r) => { if (r && live) setRoute(r); });
    }
    return () => { live = false; };
  }, [db, id, routeId]);

  useEffect(() => {
    listCragChoices(db).then(setCrags);
    listAreas(db).then(setAreaRows);
    listPartners(db).then(setPartners);
  }, [db]);

  useEffect(() => {
    if (!route) { setIsProject(false); return; }
    let live = true;
    routeGoals(db, route.id).then((g) => { if (live) setIsProject(g.some((x) => x.kind === 'project')); });
    return () => { live = false; };
  }, [db, route?.id]);

  // The crag typed in the new-route form, if it already exists (ignoring case and Polish letters).
  const existingCrag = crags.find((c) => sameName(c.name, newRoute.crag)) ?? null;
  const cragPath = (c: CragChoice) => (c.region_id ? labels.get(c.region_id) ?? '' : '');

  const pickRoute = (r: RouteRow) => { setRoute(r); setCreating(false); setError(null); };
  const startCreating = (name: string) => { setNewRoute({ ...newRoute, name, crag: '', sector: '', areas: NO_AREAS }); setCreating(true); };
  // From a crag found in the search: new route on that crag, crag and region already filled in.
  const startOnCrag = (c: CragChoice) => { setNewRoute({ ...newRoute, name: '', crag: c.name, sector: '', areas: pathNames(areaRows, c.region_id) }); setCreating(true); };

  const nameItems = (names: string[], typed: string, limit = 5): SuggestionItem[] =>
    suggest(names, typed, (x) => x, () => [], limit).filter((x) => !sameName(x, typed)).map((x) => ({ key: x, title: x }));

  function pickStyle(next: AscentStyle) {
    setStyle(next);
    if (isFirstTry(next)) setAttempts('1');
  }

  const fail = (key: string) => setError({ key, field: FIELD_OF[key] });
  const scrollRef = useRef<ScrollView>(null);

  async function save() {
    if (saving) return;
    setError(null);
    const draft = validateAscentDraft({ date, attempts });
    let typed = null;
    if (!route && creating) {
      const r = validateNewRoute({ ...newRoute, cragHasArea: !!existingCrag?.region_id });
      if (!r.ok) return fail(r.error);
      typed = r.value;
    }
    if (!route && !typed) return fail('ascent.pickRoute');
    if (!draft.ok) return fail(draft.error);

    setSaving(true);
    try {
      // The new picture files go into place first (a failed save leaves them for the startup tidy-up), then one transaction
      // writes the route, the ascent, the photo rows and the project goal, so Save after an error never makes a second ascent.
      const { fresh, removeIds } = photos.changes();
      for (const p of fresh) storePhoto(p);
      await saveAscent(db, {
        id: id ?? null,
        routeId: route?.id,
        newRoute: route ? undefined : {
          ...typed!, cragName: existingCrag?.name ?? typed!.cragName, type: newRoute.type, gradeSystem: newRoute.system, areas: newRoute.areas,
        },
        ascent: {
          date: draft.value.date, style, attempts: draft.value.attempts, rating, notes: notes.trim(), partnerName: partner, weather: weather.trim(),
          feltGradeIndex: baseGrade == null ? null : feltGrade(felt, baseGrade),
        },
        removePhotoIds: removeIds,
        addPhotos: fresh.map((p) => ({ id: p.id, width: p.width, height: p.height, bytes: p.bytes })),
        asProject: !id && style === 'attempt' && asProject && !isProject,
      });
      router.back();
    } catch (e) {
      setError({ key: 'common.failedText', message: errorMessage(e) });
      setSaving(false);
    }
  }

  // Another route chosen in a new ascent: the own grade picked for the previous one no longer applies.
  useEffect(() => { if (!id) setFelt(null); }, [id, route?.id]);

  // The route's grade the own grade is compared with: the chosen route, or the grade typed for a new one.
  const baseGrade = route ? route.grade_index : creating ? parseGrade(newRoute.grade, newRoute.system) : null;

  const errorText = error ? t(error.key, { example: gradeExample(newRoute.system, newRoute.type), message: error.message ?? '' }) : '';
  const bad = (f: FieldName) => error?.field === f;

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: th.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {id ? <Stack.Screen options={{ title: t('ascent.editTitle') }} /> : null}
      <Label>{t('ascent.route')}</Label>
      {route ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: th.surface, borderWidth: 1, borderColor: th.line }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: th.ink, fontWeight: '600' }}>{route.name}</Text>
            <Text style={{ color: th.muted, fontSize: 12 }}>{sectorLine(route.crag_name, route.sector_name)} · {routeGrade(route, route.grade_system)}</Text>
          </View>
          <LinkButton label={t('common.change')} onPress={() => setRoute(null)} />
        </View>
      ) : creating ? (
        <NewRouteForm value={newRoute} onChange={setNewRoute} crags={crags} areaRows={areaRows} cragPath={cragPath} existingCrag={existingCrag}
          bad={bad} onUseExisting={pickRoute} onCancel={() => setCreating(false)}
          scrollTo={(y) => scrollRef.current?.scrollTo({ y, animated: true })} />
      ) : (
        <RouteChooser crags={crags} cragPath={cragPath} invalid={bad('route')} onPick={pickRoute} onNewRoute={startCreating} onCragHit={startOnCrag} />
      )}

      <Label>{t('ascent.date')}</Label>
      <ChipRow>
        <Chip label={t('common.today')} on={date === today} onPress={() => setDate(today)} />
        <Chip label={t('common.yesterday')} on={date === shiftDay(today, -1)} onPress={() => setDate(shiftDay(today, -1))} />
      </ChipRow>
      <DateField value={date} onChange={setDate} label={t('ascent.date')} />

      <Label>{t('ascent.style')}</Label>
      <ChipRow>
        {ASCENT_STYLES.map((s) => <Chip key={s} label={t(`styles.${s}`)} on={style === s} onPress={() => pickStyle(s)} />)}
      </ChipRow>

      {isFirstTry(style) ? null : (
        <>
          <Label>{t('ascent.attempts')}</Label>
          <Field value={attempts} onChangeText={setAttempts} keyboardType="number-pad" accessibilityLabel={t('ascent.attempts')} invalid={bad('attempts')} style={{ width: 96 }} />
        </>
      )}

      {!id && style === 'attempt' ? (
        isProject ? (
          <Text style={{ color: th.muted, marginTop: 10 }}>{t('goals.isProject')}</Text>
        ) : (
          <SwitchRow label={t('goals.asProject')} value={asProject} onChange={setAsProject} />
        )
      ) : null}

      {baseGrade != null ? (
        <>
          <Label>{t('ascent.felt')}</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingRight: 8 }}>
            {nearbyGrades(baseGrade, 4, 4).map((i) => (
              <Chip key={i} label={i === baseGrade ? t('ascent.feltSame', { grade: formatGrade(i, settings.routeSystem) }) : formatGrade(i, settings.routeSystem)}
                on={(feltGrade(felt, baseGrade) ?? baseGrade) === i} onPress={() => setFelt(i === baseGrade ? null : i)} />
            ))}
          </ScrollView>
        </>
      ) : null}

      <Label>{t('ascent.rating')}</Label>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => setRating(rating === n ? null : n)}
            hitSlop={HIT}
            accessibilityRole="button"
            accessibilityLabel={t('ascent.ratingStar', { n })}
            accessibilityState={{ selected: rating === n }}
          >
            <Text style={{ fontSize: 32, color: rating != null && n <= rating ? th.sun : th.outline }}>★</Text>
          </Pressable>
        ))}
      </View>

      <Label>{t('ascent.partner')}</Label>
      <Field
        value={partner} onChangeText={setPartner} accessibilityLabel={t('ascent.partner')} autoCapitalize="words"
        onFocus={() => setPartnerFocus(true)} onBlur={() => setPartnerFocus(false)}
      />
      {partnerFocus ? <Suggestions items={nameItems(partners, partner)} onPick={(p) => { setPartner(p); setPartnerFocus(false); }} /> : null}
      <Label>{t('ascent.weather')}</Label>
      <Field value={weather} onChangeText={setWeather} accessibilityLabel={t('ascent.weather')} />
      <Label>{t('ascent.notes')}</Label>
      <Field value={notes} onChangeText={setNotes} accessibilityLabel={t('ascent.notes')} multiline textAlignVertical="top" style={{ minHeight: 80 }} />
      <Label>{t('photos.title')}</Label>
      <PhotoEditor photos={photos.photos} busy={photos.busy} onAdd={photos.add} onRemove={photos.remove} />

      {error ? <ErrorText>{errorText}</ErrorText> : null}
      <Button label={saving ? t('common.saving') : t('common.save')} onPress={save} disabled={saving} />
    </ScrollView>
  );
}
