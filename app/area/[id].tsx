import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { listAreas, listCrags, type AreaRow, type CragRow } from '../../src/db/repo';
import { areaPath, childLevel, childrenOf, cragCounts } from '../../src/domain/areas';
import { IconButton } from '../../src/ui/icons';
import { Button, EmptyState } from '../../src/ui/kit';
import { NavRow, SectionTitle } from '../../src/ui/NavRow';
import { useTheme } from '../../src/ui/theme';

/** One region, rejon or group: its sub-areas and the crags directly in it. */
export default function AreaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [crags, setCrags] = useState<CragRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[] | null>(null);
  useFocusEffect(useCallback(() => {
    listCrags(db).then(setCrags);
    listAreas(db).then(setAreas);
  }, [db]));

  const area = areas?.find((a) => a.id === id) ?? null;
  const counts = useMemo(() => cragCounts(areas ?? [], crags.map((c) => c.region_id)), [areas, crags]);
  const gone = areas != null && !area;
  useEffect(() => { if (gone) router.back(); }, [gone, router]); // deleted from the edit screen
  if (!areas || !area) return null;

  const parents = areaPath(areas, id).slice(0, -1);
  const children = childrenOf(areas, id);
  const here = crags.filter((c) => c.region_id === id);
  const next = childLevel(area);

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen
        options={{
          title: area.name,
          headerRight: () => <IconButton name="create-outline" size={26} label={t(`areas.edit.${area.level}`)} onPress={() => router.push(`/region/${id}`)} />,
        }}
      />
      <Text style={{ color: th.muted }}>
        {[t(`areas.level.${area.level}`), parents.map((p) => p.name).join(' › ')].filter(Boolean).join(' · ')}
      </Text>
      {children.length ? <SectionTitle>{t(next === 'group' ? 'areas.groups' : 'areas.areas')}</SectionTitle> : null}
      {children.map((a) => (
        <NavRow key={a.id} title={a.name} subtitle={t('areas.cragCount', { count: counts.get(a.id) ?? 0 })} onPress={() => router.push(`/area/${a.id}`)} />
      ))}
      {here.length ? <SectionTitle>{t('crags.title')}</SectionTitle> : null}
      {here.map((c) => <NavRow key={c.id} title={c.name} subtitle={t('crags.routes', { count: c.routes })} onPress={() => router.push(`/crag/${c.id}`)} />)}
      {!children.length && !here.length ? <EmptyState title={t('areas.empty')} /> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {next ? (
          <View style={{ flex: 1 }}>
            <Button label={t(`areas.add.${next}`)} variant="plain" onPress={() => router.push({ pathname: '/area/new', params: { parentId: id } })} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button label={t('edit.newCragTitle')} onPress={() => router.push({ pathname: '/crag/edit', params: { areaId: id } })} />
        </View>
      </View>
    </ScrollView>
  );
}
