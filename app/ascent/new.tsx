import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  addAscent, addUserRoute, getAscent, getRoute, listCragChoices, listCragRoutes, listPartners, listRegions, listSectorNames, recentRoutes, searchRoutes,
  updateAscent, type CragChoice, type CragRouteRow, type RegionRow, type RouteRow,
} from '../../src/db/repo';
import { isoDate, shiftDay } from '../../src/domain/dates';
import { isFirstTry, validateAscentDraft, validateRouteDraft } from '../../src/domain/forms';
import { ASCENT_STYLES, formatGrade, gradeExample, systemsFor, type AscentStyle, type GradeSystem, type RouteType } from '../../src/domain/grades';
import { DateField } from '../../src/ui/DateField';
import { sameName, suggest } from '../../src/domain/text';
import { Button, Chip, ChipRow, ErrorText, Field, HIT, Label, LinkButton, Suggestions, type SuggestionItem } from '../../src/ui/kit';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';

type FieldName = 'route' | 'crag' | 'name' | 'grade' | 'date' | 'attempts';
const FIELD_OF: Record<string, FieldName> = {
  'ascent.pickRoute': 'route', 'ascent.errors.crag': 'crag', 'ascent.errors.name': 'name', 'ascent.errors.grade': 'grade',
  'ascent.errors.date': 'date', 'ascent.errors.attempts': 'attempts',
};

// Also the edit screen: /ascent/new?id=<ascent> edits, /ascent/new?routeId=<route> starts on that route.
export default function NewAscent() {
  const { id, routeId } = useLocalSearchParams<{ id?: string; routeId?: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const settings = useSettings();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RouteRow[]>([]);
  const [route, setRoute] = useState<RouteRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [crag, setCrag] = useState('');
  const [sector, setSector] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<RouteType>('sport');
  const [grade, setGrade] = useState('');
  const [system, setSystem] = useState<GradeSystem>(settings.routeSystem);
  const [region, setRegion] = useState('');
  const [recent, setRecent] = useState<RouteRow[]>([]);
  const [crags, setCrags] = useState<CragChoice[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [sectorNames, setSectorNames] = useState<string[]>([]);
  const [cragRoutes, setCragRoutes] = useState<CragRouteRow[]>([]);
  const [partners, setPartners] = useState<string[]>([]);
  const [focus, setFocus] = useState<'crag' | 'sector' | 'region' | 'partner' | null>(null);

  const today = isoDate(new Date());
  const [date, setDate] = useState(today);
  const [style, setStyle] = useState<AscentStyle>('rp');
  const [attempts, setAttempts] = useState('1');
  const [rating, setRating] = useState<number | null>(null);
  const [partner, setPartner] = useState('');
  const [weather, setWeather] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<{ key: string; field?: FieldName; message?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      getAscent(db, id).then((a) => {
        if (!a) return;
        setRoute(a.route); setDate(a.date); setStyle(a.style); setAttempts(String(a.attempts)); setRating(a.rating);
        setPartner(a.partner_name ?? ''); setWeather(a.weather); setNotes(a.notes);
      });
    } else if (routeId) {
      getRoute(db, routeId).then((r) => { if (r) setRoute(r); });
    }
  }, [db, id, routeId]);

  useEffect(() => {
    recentRoutes(db).then(setRecent);
    listCragChoices(db).then(setCrags);
    listRegions(db).then(setRegions);
    listPartners(db).then(setPartners);
  }, [db]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let live = true;
    searchRoutes(db, query).then((r) => { if (live) setResults(r); });
    return () => { live = false; };
  }, [db, query]);

  // The crag typed in the new-route form, if it already exists (ignoring case and Polish letters).
  const existingCrag = crags.find((c) => sameName(c.name, crag)) ?? null;
  useEffect(() => {
    if (!existingCrag) { setSectorNames([]); setCragRoutes([]); return; }
    listSectorNames(db, existingCrag.id).then(setSectorNames);
    listCragRoutes(db, existingCrag.id).then(setCragRoutes);
  }, [db, existingCrag?.id]);
  const duplicate = name.trim() ? cragRoutes.find((r) => sameName(r.name, name)) ?? null : null;

  const routeItem = (r: RouteRow): SuggestionItem => ({
    key: r.id, title: r.name, subtitle: `${r.crag_name} · ${r.sector_name}`, badge: formatGrade(r.grade_index, r.grade_system, r.type),
  });
  const pickRoute = (rows: RouteRow[]) => (key: string) => {
    const r = rows.find((x) => x.id === key);
    if (r) { setRoute(r); setError(null); }
  };
  const nameItems = (names: string[], typed: string, limit = 5): SuggestionItem[] =>
    suggest(names, typed, (x) => x, () => [], limit).filter((x) => !sameName(x, typed)).map((x) => ({ key: x, title: x }));

  function pickType(next: RouteType) {
    setType(next);
    setSystem(next === 'boulder' ? settings.boulderSystem : systemsFor(next).includes(system) ? system : settings.routeSystem);
  }

  function pickStyle(next: AscentStyle) {
    setStyle(next);
    if (isFirstTry(next)) setAttempts('1');
  }

  function startCreating() {
    setName(query.trim());
    setCrag(''); setSector(''); setRegion('');
    setCreating(true);
  }

  function pickDuplicate() {
    if (!duplicate) return;
    setRoute(duplicate);
    setCreating(false);
    setError(null);
  }

  const fail = (key: string) => setError({ key, field: FIELD_OF[key] });

  async function save() {
    if (saving) return;
    setError(null);
    const draft = validateAscentDraft({ date, attempts });
    let newRoute = null;
    if (!route && creating) {
      const r = validateRouteDraft({ crag, sector, name, type, system, grade });
      if (!r.ok) return fail(r.error);
      newRoute = r.value;
    }
    if (!route && !newRoute) return fail('ascent.pickRoute');
    if (!draft.ok) return fail(draft.error);

    setSaving(true);
    try {
      const rid = route?.id ?? await addUserRoute(db, { ...newRoute!, cragName: existingCrag?.name ?? newRoute!.cragName, type, gradeSystem: system, regionName: region.trim() });
      const values = { routeId: rid, date: draft.value.date, style, attempts: draft.value.attempts, rating, notes: notes.trim(), partnerName: partner, weather: weather.trim() };
      if (id) await updateAscent(db, id, values);
      else await addAscent(db, values);
      router.back();
    } catch (e) {
      setError({ key: 'common.failed', message: (e as Error).message });
      setSaving(false);
    }
  }

  const errorText = error ? t(error.key, { example: gradeExample(system, type), message: error.message ?? '' }) : '';
  const bad = (f: FieldName) => error?.field === f;

  return (
    <ScrollView
      style={{ backgroundColor: th.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {id ? <Stack.Screen options={{ title: t('ascent.editTitle') }} /> : null}
      <Label>{t('ascent.route')}</Label>
      {route ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 6, backgroundColor: th.soft }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: th.ink, fontWeight: '600' }}>{route.name}</Text>
            <Text style={{ color: th.muted, fontSize: 12 }}>{route.crag_name} · {route.sector_name} · {formatGrade(route.grade_index, route.grade_system, route.type)}</Text>
          </View>
          <LinkButton label={t('common.change')} onPress={() => setRoute(null)} />
        </View>
      ) : creating ? (
        <View style={{ gap: 8 }}>
          <Field
            value={crag} onChangeText={setCrag} placeholder={t('ascent.crag')} accessibilityLabel={t('ascent.crag')} invalid={bad('crag')} autoFocus
            onFocus={() => setFocus('crag')} onBlur={() => setFocus(null)}
          />
          {focus === 'crag' ? (
            <Suggestions
              items={suggest(crags, crag, (c) => c.name, (c) => [c.region_name ?? ''], 5).filter((c) => !sameName(c.name, crag))
                .map((c) => ({ key: c.id, title: c.name, subtitle: c.region_name ?? undefined }))}
              onPick={(key) => { const c = crags.find((x) => x.id === key); if (c) setCrag(c.name); }}
            />
          ) : null}
          {existingCrag ? (
            existingCrag.region_name ? <Text style={{ color: th.muted, fontSize: 12 }}>{t('ascent.cragInRegion', { region: existingCrag.region_name })}</Text> : null
          ) : crag.trim() ? (
            <>
              <Text style={{ color: th.muted, fontSize: 12 }}>{t('ascent.newCragHint')}</Text>
              <Field
                value={region} onChangeText={setRegion} placeholder={t('edit.region')} accessibilityLabel={t('edit.region')}
                onFocus={() => setFocus('region')} onBlur={() => setFocus(null)}
              />
              {focus === 'region' ? <Suggestions items={nameItems(regions.map((g) => g.name), region)} onPick={setRegion} /> : null}
            </>
          ) : null}
          <Field
            value={sector} onChangeText={setSector} placeholder={t('ascent.sector')} accessibilityLabel={t('ascent.sector')}
            onFocus={() => setFocus('sector')} onBlur={() => setFocus(null)}
          />
          {focus === 'sector' ? <Suggestions items={nameItems(sectorNames, sector)} onPick={setSector} /> : null}
          <Field value={name} onChangeText={setName} placeholder={t('ascent.name')} accessibilityLabel={t('ascent.name')} invalid={bad('name')} />
          {duplicate ? (
            <View style={{ padding: 12, borderRadius: 6, backgroundColor: th.soft, gap: 4 }}>
              <Text style={{ color: th.ink }}>
                {t('ascent.duplicate', { name: duplicate.name, sector: duplicate.sector_name, grade: formatGrade(duplicate.grade_index, duplicate.grade_system, duplicate.type) })}
              </Text>
              <LinkButton label={t('ascent.useExisting')} onPress={pickDuplicate} />
            </View>
          ) : null}
          <Text style={{ color: th.muted, fontSize: 12 }}>{t('ascent.type')}</Text>
          <ChipRow>
            {(['sport', 'boulder', 'multipitch'] as RouteType[]).map((x) => <Chip key={x} label={t(`types.${x}`)} on={type === x} onPress={() => pickType(x)} />)}
          </ChipRow>
          <Text style={{ color: th.muted, fontSize: 12 }}>{t('ascent.gradeSystem')}</Text>
          <ChipRow>
            {systemsFor(type).map((s) => <Chip key={s} label={s.toUpperCase()} on={system === s} onPress={() => setSystem(s)} />)}
          </ChipRow>
          <Field
            value={grade} onChangeText={setGrade} invalid={bad('grade')} autoCapitalize="characters" autoCorrect={false}
            placeholder={`${t('ascent.grade')} (${t('ascent.gradeExample', { example: gradeExample(system, type) })})`} accessibilityLabel={t('ascent.grade')}
          />
          <LinkButton label={t('common.cancel')} onPress={() => setCreating(false)} />
        </View>
      ) : (
        <View style={{ gap: 4 }}>
          <Field value={query} onChangeText={setQuery} placeholder={t('ascent.searchRoute')} accessibilityLabel={t('ascent.searchRoute')} invalid={bad('route')} autoCorrect={false} />
          {query.trim() ? (
            <Suggestions items={results.map(routeItem)} onPick={pickRoute(results)} />
          ) : (
            <Suggestions title={t('ascent.recent')} items={recent.map(routeItem)} onPick={pickRoute(recent)} />
          )}
          {query.trim() && results.length === 0 ? <Text style={{ color: th.muted, paddingVertical: 6 }}>{t('ascent.noResults', { query: query.trim() })}</Text> : null}
          <LinkButton label={query.trim() ? t('ascent.newRouteNamed', { name: query.trim() }) : t('ascent.newRoute')} onPress={startCreating} />
        </View>
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
        onFocus={() => setFocus('partner')} onBlur={() => setFocus(null)}
      />
      {focus === 'partner' ? <Suggestions items={nameItems(partners, partner)} onPick={(p) => { setPartner(p); setFocus(null); }} /> : null}
      <Label>{t('ascent.weather')}</Label>
      <Field value={weather} onChangeText={setWeather} accessibilityLabel={t('ascent.weather')} />
      <Label>{t('ascent.notes')}</Label>
      <Field value={notes} onChangeText={setNotes} accessibilityLabel={t('ascent.notes')} multiline textAlignVertical="top" style={{ minHeight: 80 }} />

      {error ? <ErrorText>{errorText}</ErrorText> : null}
      <Button label={saving ? t('common.saving') : t('common.save')} onPress={save} disabled={saving} />
    </ScrollView>
  );
}
