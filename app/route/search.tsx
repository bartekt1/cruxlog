import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, View } from 'react-native';
import { findRoutes, listAreas, type AreaRow, type FoundRoute, type RouteStatus } from '../../src/db/repo';
import { areaPath, childrenOf, descendantIds, pathLabels } from '../../src/domain/areas';
import { formatGrade, routeGrade, ROUTE_LADDER, type RouteType } from '../../src/domain/grades';
import { F } from '../../src/ui/fonts';
import { Chip, ChipRow, EmptyState, Field, Label, LinkButton } from '../../src/ui/kit';
import { useSettings } from '../../src/ui/settingsStore';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';
import { RouteCard, routeStatus } from '../../src/ui/rows';

const STATUSES: RouteStatus[] = ['all', 'todo', 'tried', 'sent'];
const TYPES: (RouteType | null)[] = [null, 'sport', 'multipitch'];

/** Route finder: name, grade range, area, own status and type; results easiest first. `?areaId=` starts inside one area. */
export default function RouteSearch() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ areaId?: string }>();
  const { t } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [query, setQuery] = useState('');
  const [minGrade, setMinGrade] = useState<number | null>(null);
  const [maxGrade, setMaxGrade] = useState<number | null>(null);
  const [areaId, setAreaId] = useState<string | null>(params.areaId ?? null);
  const [status, setStatus] = useState<RouteStatus>('all');
  const [type, setType] = useState<RouteType | null>(null);
  const [result, setResult] = useState<{ total: number; rows: FoundRoute[] }>({ total: 0, rows: [] });

  useFocusEffect(useCallback(() => { listAreas(db).then(setAreas); }, [db]));
  const labels = useMemo(() => pathLabels(areas), [areas]);

  // Searched again on every change (the name with a short pause while typing); a late answer never overwrites a newer one.
  const [version, setVersion] = useState(0);
  useFocusEffect(useCallback(() => setVersion((v) => v + 1), []));
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      const areaIds = areaId ? [...descendantIds(areas, areaId)] : null;
      findRoutes(db, { query, minGrade, maxGrade, areaIds, status, type }).then((r) => { if (live) setResult(r); });
    }, query ? 200 : 0);
    return () => { live = false; clearTimeout(timer); };
  }, [db, areas, query, minGrade, maxGrade, areaId, status, type, version]);

  const grades = ROUTE_LADDER.map((_, i) => i);
  const pickMin = (i: number | null) => { setMinGrade(i); if (i != null && maxGrade != null && maxGrade < i) setMaxGrade(i); };
  const pickMax = (i: number | null) => { setMaxGrade(i); if (i != null && minGrade != null && minGrade > i) setMinGrade(i); };
  const gradeRow = (value: number | null, pick: (i: number | null) => void) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Chip label={t('routeSearch.any')} on={value == null} onPress={() => pick(null)} />
      {grades.map((i) => <Chip key={i} label={formatGrade(i, routeSystem)} on={value === i} onPress={() => pick(i)} />)}
    </ScrollView>
  );

  const chosen = areaId ? areaPath(areas, areaId) : [];
  const areaOptions = childrenOf(areas, areaId);

  const filters = (
    <View style={{ paddingTop: 8 }}>
      <Field value={query} onChangeText={setQuery} placeholder={t('routeSearch.name')} accessibilityLabel={t('routeSearch.name')} returnKeyType="search" />
      <Label>{t('routeSearch.from')}</Label>
      {gradeRow(minGrade, pickMin)}
      <Label>{t('routeSearch.to')}</Label>
      {gradeRow(maxGrade, pickMax)}

      <Label>{t('routeSearch.where')}</Label>
      {chosen.length ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          <Text style={{ color: th.ink, fontFamily: F.semi, flexShrink: 1 }}>{chosen.map((a) => a.name).join(' › ')}</Text>
          <LinkButton label={t('routeSearch.up')} onPress={() => setAreaId(chosen.length > 1 ? chosen[chosen.length - 2].id : null)} />
          <LinkButton label={t('routeSearch.everywhere')} onPress={() => setAreaId(null)} />
        </View>
      ) : null}
      {areaOptions.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {areaOptions.map((a) => <Chip key={a.id} label={a.name} onPress={() => setAreaId(a.id)} />)}
        </ScrollView>
      ) : null}

      <Label>{t('routeSearch.status')}</Label>
      <ChipRow>{STATUSES.map((s) => <Chip key={s} label={t(`routeSearch.statuses.${s}`)} on={status === s} onPress={() => setStatus(s)} />)}</ChipRow>
      <Label>{t('ascent.type')}</Label>
      <ChipRow>{TYPES.map((x) => <Chip key={x ?? 'all'} label={x ? t(`types.${x}`) : t('routeSearch.any')} on={type === x} onPress={() => setType(x)} />)}</ChipRow>

      <Label live style={{ marginBottom: 4 }}>
        {result.total > result.rows.length ? t('routeSearch.foundSome', { total: result.total, shown: result.rows.length }) : t('routeSearch.found', { total: result.total })}
      </Label>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: th.bg }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      data={result.rows}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={filters}
      ListEmptyComponent={<EmptyState title={t('routeSearch.none')} hint={t('routeSearch.noneHint')} />}
      renderItem={({ item }) => (
        <RouteCard grade={routeGrade(item, routeSystem)} name={item.name}
          subtitle={[item.region_id ? labels.get(item.region_id) : '', item.crag_name].filter(Boolean).join(' › ')}
          note={routeStatus(t, item)} noteAccent={item.sends > 0} onPress={() => router.push(`/route/${item.id}`)} />
      )}
    />
  );
}
