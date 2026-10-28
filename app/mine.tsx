import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, View } from 'react-native';
import { deleteMine, listAreas, listMyCrags, listMyRoutes, type AreaRow, type MyCrag, type MyRoute } from '../src/db/repo';
import { pathLabel } from '../src/domain/areas';
import { routeGrade } from '../src/domain/grades';
import { deletionSummary, mineKey, type MineItem } from '../src/domain/mine';
import { ask } from '../src/ui/confirm';
import { runOrAlert } from '../src/ui/errors';
import { F } from '../src/ui/fonts';
import { Button, EmptyState, GradeBadge, HIT, Label, Screen } from '../src/ui/kit';
import { GroupedRow } from '../src/ui/rows';
import { useSettings } from '../src/ui/settingsStore';
import { Text } from '../src/ui/Text';
import { useTheme } from '../src/ui/theme';

type Item = ({ kind: 'crag' } & MyCrag) | ({ kind: 'route' } & MyRoute);

/**
 * /mine: the crags and routes the user added (not from packs or files), to open or to delete several at once, e.g. test
 * entries. "Select" (or holding a row) turns on ticking; deleting also drops their changes not yet sent to the shared base.
 */
export default function Mine() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();
  const [crags, setCrags] = useState<MyCrag[]>([]);
  const [routes, setRoutes] = useState<MyRoute[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([listMyCrags(db), listMyRoutes(db), listAreas(db)]).then(([c, r, a]) => { setCrags(c); setRoutes(r); setAreas(a); });
  }, [db]);
  useFocusEffect(load);

  const items: MineItem[] = useMemo(() => [
    ...crags.map((c) => ({ kind: 'crag' as const, id: c.id, routes: c.routes, ascents: c.ascents })),
    ...routes.map((r) => ({ kind: 'route' as const, id: r.id, routes: 1, ascents: r.ascents })),
  ], [crags, routes]);
  const sections = [
    ...(crags.length ? [{ key: 'crags', title: t('mine.crags'), data: crags.map((c) => ({ kind: 'crag' as const, ...c })) as Item[] }] : []),
    ...(routes.length ? [{ key: 'routes', title: t('mine.routes'), data: routes.map((r) => ({ kind: 'route' as const, ...r })) as Item[] }] : []),
  ];

  const toggle = (key: string) => setChosen((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const stopSelecting = () => { setSelecting(false); setChosen(new Set()); };
  const remove = async () => {
    const sum = deletionSummary(items, chosen);
    const lines = [t('mine.sumCrags', { count: sum.crags }), t('mine.sumRoutes', { count: sum.routes })];
    if (sum.ascents) lines.push(t('mine.sumAscents', { count: sum.ascents }));
    const ok = await ask(t('mine.deleteTitle'), `${lines.join('\n')}\n\n${t('mine.deleteNote')}`, t('common.delete'), t('common.cancel'));
    if (!ok) return;
    setBusy(true);
    const pick = (kind: Item['kind']) => items.filter((i) => i.kind === kind && chosen.has(mineKey(i))).map((i) => i.id);
    if (await runOrAlert(() => deleteMine(db, pick('crag'), pick('route')))) { stopSelecting(); load(); }
    setBusy(false);
  };

  const row = (item: Item, index: number, count: number) => {
    const key = mineKey(item);
    const on = chosen.has(key);
    const open = () => (selecting ? toggle(key) : router.push(item.kind === 'crag' ? `/crag/${item.id}` : `/route/${item.id}`));
    return (
      <GroupedRow first={index === 0} last={index === count - 1} onPress={open}
        accessibilityHint={selecting ? undefined : t('mine.holdHint')}>
        <Pressable onLongPress={() => { setSelecting(true); toggle(key); }} onPress={open} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          accessibilityRole={selecting ? 'checkbox' : 'button'} accessibilityState={selecting ? { checked: on } : undefined}>
          {selecting ? <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? th.accent : th.outline} /> : null}
          {item.kind === 'route' ? <GradeBadge size="sm" text={routeGrade(item, routeSystem)} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={{ color: th.ink, fontFamily: F.semi, fontSize: 16 }} numberOfLines={1}>{item.name}</Text>
            <Text style={{ color: th.muted, fontSize: 13 }} numberOfLines={1}>
              {item.kind === 'crag'
                ? [item.region_id ? pathLabel(areas, item.region_id) : '', t('mine.routeCount', { count: item.routes }), item.ascents ? t('mine.ascentCount', { count: item.ascents }) : ''].filter(Boolean).join(' · ')
                : [item.sector_name === item.crag_name ? item.crag_name : `${item.crag_name} › ${item.sector_name}`, item.ascents ? t('mine.ascentCount', { count: item.ascents }) : ''].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </Pressable>
      </GroupedRow>
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{
        title: t('mine.title'),
        headerRight: items.length ? () => (
          <Pressable onPress={() => (selecting ? stopSelecting() : setSelecting(true))} hitSlop={HIT} accessibilityRole="button" style={{ padding: 8 }}>
            <Text style={{ color: th.accent, fontFamily: F.semi }}>{selecting ? t('mine.done') : t('mine.select')}</Text>
          </Pressable>
        ) : undefined,
      }} />
      <SectionList
        sections={sections}
        keyExtractor={(i) => mineKey(i)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={<Text style={{ color: th.muted, marginTop: 8 }}>{t('mine.hint')}</Text>}
        ListEmptyComponent={<EmptyState title={t('mine.empty')} hint={t('mine.emptyHint')} />}
        renderSectionHeader={({ section }) => <Label>{section.title}</Label>}
        renderItem={({ item, index, section }) => row(item, index, section.data.length)}
      />
      {selecting ? (
        <View style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: th.line }}>
          <Button label={chosen.size === items.length ? t('mine.none') : t('mine.all')} variant="plain"
            onPress={() => setChosen(chosen.size === items.length ? new Set() : new Set(items.map(mineKey)))} />
          <Button label={t('mine.deleteChosen', { count: chosen.size })} variant="danger" onPress={remove} disabled={busy || !chosen.size} />
        </View>
      ) : null}
    </Screen>
  );
}
