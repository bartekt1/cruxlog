import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { listAreas, listCrags, type AreaRow, type CragRow } from '../../src/db/repo';
import { childrenOf, cragCounts, pathLabels } from '../../src/domain/areas';
import { suggest } from '../../src/domain/text';
import { Button, EmptyState, Field } from '../../src/ui/kit';
import { NavRow, SectionTitle } from '../../src/ui/NavRow';
import { useTheme } from '../../src/ui/theme';

/** Crags tab: search, then regions to drill down (region › rejon › group › crag). */
export default function Crags() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [crags, setCrags] = useState<CragRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [query, setQuery] = useState('');
  useFocusEffect(useCallback(() => {
    listCrags(db).then(setCrags);
    listAreas(db).then(setAreas);
  }, [db]));

  const counts = useMemo(() => cragCounts(areas, crags.map((c) => c.region_id)), [areas, crags]);
  const labels = useMemo(() => pathLabels(areas), [areas]);
  const path = (c: CragRow) => (c.region_id ? labels.get(c.region_id) ?? '' : '');
  const hits = query.trim() ? suggest(crags, query, (c) => c.name, (c) => [path(c)], 30) : [];
  const regions = childrenOf(areas, null);
  const loose = crags.filter((c) => !c.region_id);
  const openCrag = (c: CragRow) => router.push(`/crag/${c.id}`);

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <Field value={query} onChangeText={setQuery} placeholder={t('areas.search')} accessibilityLabel={t('areas.search')} returnKeyType="search" />
      {query.trim() ? (
        hits.length ? (
          hits.map((c) => <NavRow key={c.id} title={c.name} subtitle={[path(c), t('crags.routes', { count: c.routes })].filter(Boolean).join(' · ')} onPress={() => openCrag(c)} />)
        ) : (
          <EmptyState title={t('areas.noHits')} />
        )
      ) : (
        <>
          {!crags.length && !regions.length ? <EmptyState title={t('crags.empty')} hint={t('crags.emptyHint')} /> : null}
          {regions.length ? <SectionTitle>{t('areas.regions')}</SectionTitle> : null}
          {regions.map((r) => (
            <NavRow key={r.id} title={r.name} subtitle={t('areas.cragCount', { count: counts.get(r.id) ?? 0 })} onPress={() => router.push(`/area/${r.id}`)} />
          ))}
          {loose.length ? <SectionTitle>{t('crags.noRegion')}</SectionTitle> : null}
          {loose.map((c) => <NavRow key={c.id} title={c.name} subtitle={t('crags.routes', { count: c.routes })} onPress={() => openCrag(c)} />)}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <Button label={t('areas.addRegion')} variant="plain" onPress={() => router.push('/area/new')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('edit.newCragTitle')} variant="plain" onPress={() => router.push('/crag/edit')} />
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}
