import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { addAscent, addUserRoute, searchRoutes, type RouteRow } from '../../src/db/repo';
import { ASCENT_STYLES, ROUTE_LADDER, BOULDER_LADDER, formatGrade, parseGrade, systemsFor, type AscentStyle, type GradeSystem, type RouteType } from '../../src/domain/grades';
import { Button, Chip, Field, Label } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function NewAscent() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RouteRow[]>([]);
  const [route, setRoute] = useState<RouteRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [crag, setCrag] = useState('');
  const [sector, setSector] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<RouteType>('sport');
  const [grade, setGrade] = useState('');
  const [system, setSystem] = useState<GradeSystem>('kr');

  const [date, setDate] = useState(today());
  const [style, setStyle] = useState<AscentStyle>('rp');
  const [attempts, setAttempts] = useState('1');
  const [rating, setRating] = useState<number | null>(null);
  const [partner, setPartner] = useState('');
  const [weather, setWeather] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { searchRoutes(db, query).then(setResults); }, [db, query]);

  function pickType(next: RouteType) {
    setType(next);
    setSystem(systemsFor(next)[0]);
  }

  async function save() {
    setError('');
    let routeId = route?.id;
    if (!routeId && creating) {
      const idx = parseGrade(grade, system, type);
      const ladder = type === 'boulder' ? BOULDER_LADDER.length : ROUTE_LADDER.length;
      if (!crag.trim() || !name.trim() || idx == null || idx >= ladder) {
        setError(t('ascent.pickRoute'));
        return;
      }
      routeId = await addUserRoute(db, { cragName: crag.trim(), sectorName: sector.trim() || crag.trim(), name: name.trim(), type, gradeLabel: grade.trim(), gradeSystem: system, gradeIndex: idx });
    }
    if (!routeId) { setError(t('ascent.pickRoute')); return; }
    await addAscent(db, { routeId, date, style, attempts: Math.max(1, Number(attempts) || 1), rating, notes, partnerName: partner, weather });
    router.back();
  }

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Label>{t('ascent.route')}</Label>
      {route ? (
        <Pressable onPress={() => setRoute(null)}>
          <Text style={{ color: th.ink, fontWeight: '600' }}>{route.name} · {route.crag_name} · {formatGrade(route.grade_index, route.grade_system, route.type)}</Text>
        </Pressable>
      ) : creating ? (
        <View style={{ gap: 8 }}>
          <Field value={crag} onChangeText={setCrag} placeholder={t('ascent.crag')} />
          <Field value={sector} onChangeText={setSector} placeholder={t('ascent.sector')} />
          <Field value={name} onChangeText={setName} placeholder={t('ascent.name')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(['sport', 'boulder', 'multipitch'] as RouteType[]).map((x) => <Chip key={x} label={t(`types.${x}`)} on={type === x} onPress={() => pickType(x)} />)}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {systemsFor(type).map((s) => <Chip key={s} label={s.toUpperCase()} on={system === s} onPress={() => setSystem(s)} />)}
          </View>
          <Field value={grade} onChangeText={setGrade} placeholder={t('ascent.grade')} autoCapitalize="characters" />
          <Pressable onPress={() => setCreating(false)}><Text style={{ color: th.accent }}>{t('common.cancel')}</Text></Pressable>
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          <Field value={query} onChangeText={setQuery} placeholder={t('ascent.searchRoute')} />
          {results.slice(0, 6).map((r) => (
            <Pressable key={r.id} onPress={() => setRoute(r)} style={{ paddingVertical: 6 }}>
              <Text style={{ color: th.ink }}>{r.name} <Text style={{ color: th.muted }}>· {r.crag_name} · {formatGrade(r.grade_index, r.grade_system, r.type)}</Text></Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setCreating(true)}><Text style={{ color: th.accent }}>{t('ascent.newRoute')}</Text></Pressable>
        </View>
      )}

      <Label>{t('ascent.date')}</Label>
      <Field value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      <Label>{t('ascent.style')}</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {ASCENT_STYLES.map((s) => <Chip key={s} label={t(`styles.${s}`)} on={style === s} onPress={() => setStyle(s)} />)}
      </View>
      <Label>{t('ascent.attempts')}</Label>
      <Field value={attempts} onChangeText={setAttempts} keyboardType="numeric" />
      <Label>{t('ascent.rating')}</Label>
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(rating === n ? null : n)}>
            <Text style={{ fontSize: 28, color: rating != null && n <= rating ? th.sun : th.line }}>★</Text>
          </Pressable>
        ))}
      </View>
      <Label>{t('ascent.partner')}</Label>
      <Field value={partner} onChangeText={setPartner} />
      <Label>{t('ascent.weather')}</Label>
      <Field value={weather} onChangeText={setWeather} />
      <Label>{t('ascent.notes')}</Label>
      <Field value={notes} onChangeText={setNotes} multiline style={{ minHeight: 70 }} />
      {error ? <Text style={{ color: th.warn, marginTop: 10 }}>{error}</Text> : null}
      <Button label={t('common.save')} onPress={save} />
    </ScrollView>
  );
}
