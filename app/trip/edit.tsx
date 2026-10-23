import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { getTrip, listAreas, listCragChoices, listCragRoutes, saveTrip, type CragChoice, type CragRouteRow, type RouteRow } from '../../src/db/repo';
import { pathLabels } from '../../src/domain/areas';
import { isoDate, shiftDay } from '../../src/domain/dates';
import { routeGrade } from '../../src/domain/grades';
import { matches, suggest } from '../../src/domain/text';
import { validateTrip } from '../../src/domain/trips';
import { DateField } from '../../src/ui/DateField';
import { errorMessage } from '../../src/ui/errors';
import { IconButton } from '../../src/ui/icons';
import { Button, Chip, ChipRow, ErrorText, Field, GradeBadge, Label, LinkButton, Suggestions } from '../../src/ui/kit';
import { useSettings } from '../../src/ui/settingsStore';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';

const ROUTE_LIST_LIMIT = 60;

/** /trip/edit?id=<trip> edits, /trip/edit?cragId=<crag> starts a new trip at that crag, plain /trip/edit starts an empty one. */
export default function EditTrip() {
  const { id, cragId } = useLocalSearchParams<{ id?: string; cragId?: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();

  const tomorrow = shiftDay(isoDate(new Date()), 1);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState(tomorrow);
  const [message, setMessage] = useState('');
  const [cragIds, setCragIds] = useState<string[]>(cragId ? [cragId] : []);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [crags, setCrags] = useState<CragChoice[]>([]);
  const [labels, setLabels] = useState<Map<string, string>>(new Map());
  const [cragQuery, setCragQuery] = useState('');
  const [routeQuery, setRouteQuery] = useState('');
  const [cragRoutes, setCragRoutes] = useState<CragRouteRow[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCragChoices(db).then(setCrags);
    listAreas(db).then((a) => setLabels(pathLabels(a)));
    if (!id) return;
    getTrip(db, id).then((x) => {
      if (!x) { router.back(); return; }
      setName(x.name); setStartDate(x.start_date); setEndDate(x.end_date); setMessage(x.message);
      setCragIds(x.crags.map((c) => c.id)); setRoutes(x.routes);
    });
  }, [db, id, router]);

  // The routes that can be proposed: those of the chosen crags.
  useEffect(() => {
    let live = true;
    Promise.all(cragIds.map((c) => listCragRoutes(db, c))).then((all) => { if (live) setCragRoutes(all.flat()); });
    return () => { live = false; };
  }, [db, cragIds]);

  const cragPath = (c: CragChoice) => (c.region_id ? labels.get(c.region_id) ?? '' : '');
  const chosenCrags = cragIds.map((cid) => crags.find((c) => c.id === cid)).filter((c): c is CragChoice => !!c);
  const cragHits = cragQuery.trim() ? suggest(crags.filter((c) => !cragIds.includes(c.id)), cragQuery, (c) => c.name, (c) => [cragPath(c)], 5) : [];
  const chosen = new Set(routes.map((r) => r.id));
  const offered = cragRoutes.filter((r) => !chosen.has(r.id) && matches(routeQuery, r.name)).slice(0, ROUTE_LIST_LIMIT);

  const addCrag = (c: CragChoice) => { setCragIds([...cragIds, c.id]); setCragQuery(''); };
  // Removing a crag also removes its proposed routes.
  const removeCrag = (cid: string) => { setCragIds(cragIds.filter((x) => x !== cid)); setRoutes(routes.filter((r) => r.crag_id !== cid)); };
  const move = (i: number, by: number) => {
    const next = [...routes];
    const [r] = next.splice(i, 1);
    next.splice(Math.max(0, Math.min(next.length, i + by)), 0, r);
    setRoutes(next);
  };
  // A start after the end moves the end with it, so the days stay in order.
  const pickStart = (d: string) => { setStartDate(d); if (endDate < d) setEndDate(d); };

  async function save() {
    if (saving) return;
    const v = validateTrip({ name, startDate, endDate, message, cragIds, routeIds: routes.map((r) => r.id) });
    if (!v.ok) { setError(t(v.error)); return; }
    setSaving(true);
    try {
      const tripId = await saveTrip(db, id ?? null, v.value);
      if (id) router.back(); else router.replace(`/trip/${tripId}`);
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: id ? t('trip.editTitle') : t('trip.newTitle') }} />
      <Label>{t('trip.name')}</Label>
      <Field value={name} onChangeText={setName} placeholder={t('trip.namePlaceholder')} accessibilityLabel={t('trip.name')} invalid={!!error && !name.trim()} />

      <Label>{t('trip.from')}</Label>
      <DateField value={startDate} onChange={pickStart} label={t('trip.from')} allowFuture />
      <Label>{t('trip.to')}</Label>
      <DateField value={endDate} onChange={setEndDate} label={t('trip.to')} allowFuture />
      {endDate !== startDate ? <LinkButton label={t('trip.oneDay')} onPress={() => setEndDate(startDate)} /> : null}

      <Label>{t('trip.crags')}</Label>
      {chosenCrags.length ? (
        <ChipRow>{chosenCrags.map((c) => <Chip key={c.id} label={`${c.name}  ✕`} on onPress={() => removeCrag(c.id)} />)}</ChipRow>
      ) : null}
      <Field value={cragQuery} onChangeText={setCragQuery} placeholder={t('trip.addCrag')} accessibilityLabel={t('trip.addCrag')} autoCorrect={false} />
      <Suggestions items={cragHits.map((c) => ({ key: c.id, title: c.name, subtitle: cragPath(c) || undefined }))}
        onPick={(key) => { const c = crags.find((x) => x.id === key); if (c) addCrag(c); }} />

      <Label>{t('trip.routes', { count: routes.length })}</Label>
      {routes.length ? null : <Text style={{ color: th.muted }}>{t('trip.routesHint')}</Text>}
      {routes.map((r, i) => (
        <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderColor: th.line }}>
          <GradeBadge size="sm" text={routeGrade(r, routeSystem)} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: th.ink }} numberOfLines={1}>{r.name}</Text>
            <Text style={{ color: th.muted, fontSize: 12 }} numberOfLines={1}>{r.crag_name}</Text>
          </View>
          <IconButton name="arrow-up" size={20} label={t('trip.moveUp', { name: r.name })} onPress={() => move(i, -1)} />
          <IconButton name="arrow-down" size={20} label={t('trip.moveDown', { name: r.name })} onPress={() => move(i, 1)} />
          <IconButton name="close" size={20} label={t('trip.removeRoute', { name: r.name })} onPress={() => setRoutes(routes.filter((x) => x.id !== r.id))} />
        </View>
      ))}
      {cragIds.length ? (
        <>
          <Field value={routeQuery} onChangeText={setRouteQuery} placeholder={t('trip.searchRoutes')} accessibilityLabel={t('trip.searchRoutes')} autoCorrect={false} style={{ marginTop: 10 }} />
          <Suggestions title={t('trip.tapToAdd')} items={offered.map((r) => ({ key: r.id, title: r.name, subtitle: `${r.crag_name} › ${r.sector_name}`, badge: routeGrade(r, routeSystem) }))}
            onPick={(key) => { const r = cragRoutes.find((x) => x.id === key); if (r) setRoutes([...routes, r]); }} />
        </>
      ) : null}

      <Label>{t('trip.message')}</Label>
      <Field value={message} onChangeText={setMessage} placeholder={t('trip.messagePlaceholder')} accessibilityLabel={t('trip.message')} multiline maxLength={140} textAlignVertical="top" style={{ minHeight: 70 }} />

      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label={saving ? t('common.saving') : t('common.save')} onPress={save} disabled={saving} />
    </ScrollView>
  );
}
