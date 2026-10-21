import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, useWindowDimensions, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { addRouteGoal, getRoute, listPhotos, listRouteAscents, routeGoals, routeTopos, type AscentRow, type GoalRow, type PhotoRow, type RouteRow, type TopoLineRow } from '../../src/db/repo';
import { formatDay, isoDate } from '../../src/domain/dates';
import { type AscentStyle, feltGrade, formatGrade, routeGrade } from '../../src/domain/grades';
import { routeSummary } from '../../src/domain/history';
import { IconButton } from '../../src/ui/icons';
import { Contours } from '../../src/ui/Contours';
import { F } from '../../src/ui/fonts';
import { Card, EmptyState, GradeBadge, LinkButton, Screen, Title } from '../../src/ui/kit';
import { TopoPreview } from '../../src/ui/TopoLines';
import { PhotoBadge } from '../../src/ui/PhotoViews';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';
import { runOrAlert } from '../../src/ui/errors';

/** One route: the user's whole history on it and a quick way to log another go. */
export default function RouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();
  const [route, setRoute] = useState<RouteRow | null>(null);
  const [ascents, setAscents] = useState<AscentRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [topos, setTopos] = useState<{ photo: PhotoRow; lines: TopoLineRow[] }[]>([]);
  const [wallPhotos, setWallPhotos] = useState<PhotoRow[]>([]);
  const { width: screenW, height: screenH } = useWindowDimensions();

  useFocusEffect(useCallback(() => {
    getRoute(db, id).then((r) => {
      if (!r) { router.back(); return; } // deleted from the edit screen
      setRoute(r);
    });
    listRouteAscents(db, id).then(setAscents);
    routeGoals(db, id).then(setGoals);
    routeTopos(db, id).then(setTopos);
  }, [db, id, router]));

  // Wall photos (of its sector, then of its crag) where the route could be drawn when it has no topo yet.
  const sectorId = route?.sector_id;
  const cragId = route?.crag_id;
  useFocusEffect(useCallback(() => {
    if (!sectorId || !cragId) return;
    let live = true;
    Promise.all([listPhotos(db, 'sector', sectorId), listPhotos(db, 'crag', cragId)]).then(([a, b]) => { if (live) setWallPhotos([...a, ...b]); });
    return () => { live = false; };
  }, [db, sectorId, cragId]));

  // Project or wish, picked in a small dialog; the badge then replaces the button.
  const addToGoals = () =>
    Alert.alert(t('goals.addRouteTitle'), t('goals.addRouteQuestion', { name: route?.name ?? '' }), [
      { text: t('common.cancel'), style: 'cancel' },
      ...(['wishlist', 'project'] as const).map((kind) => ({
        text: t(`goals.${kind}`),
        onPress: () => runOrAlert(async () => { await addRouteGoal(db, id, kind); setGoals(await routeGoals(db, id)); }),
      })),
    ]);

  const summary = useMemo(() => routeSummary(ascents), [ascents]);
  const today = isoDate(new Date());
  const day = (iso: string) => formatDay(iso, i18n.language, today);

  if (!route) return <View style={{ flex: 1, backgroundColor: th.bg }} />;
  const grade = routeGrade(route, routeSystem);

  let status: string;
  if (summary.firstSend) {
    status = t('route.sentOn', { date: day(summary.firstSend.date), style: t(`styles.${summary.firstSend.style}`) });
    if (summary.daysToSend && summary.daysToSend > 1) status += ` ${t('route.daysToSend', { n: summary.daysToSend })}`;
  } else {
    status = summary.ascents ? t('route.notSent', { n: summary.ascents }) : t('route.neverTried');
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: t('route.title'),
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <IconButton name="share-social-outline" size={26} label={t('share.title')} onPress={() => router.push({ pathname: '/share', params: { kind: 'route', id: route.id } })} />
              <IconButton name="create-outline" size={26} label={t('edit.routeTitle')} onPress={() => router.push({ pathname: '/route/edit', params: { id: route.id } })} />
            </View>
          ),
        }}
      />
      <FlatList
        data={ascents}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <View style={{ paddingTop: 8, gap: 6 }}>
            <Contours height={160} />
            <Pressable onPress={() => router.push(`/crag/${route.crag_id}`)} accessibilityRole="link">
              <Text style={{ color: th.accent, fontFamily: F.semi, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {route.crag_name} › {route.sector_name} · {t(`types.${route.type}`)}
              </Text>
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}><Title size={40}>{route.name}</Title></View>
              <GradeBadge text={grade} size="lg" />
            </View>
            {route.length_m != null || route.bolts != null ? (
              <Text style={{ color: th.muted }}>
                {[route.length_m != null ? t('route.length', { m: route.length_m }) : '', route.bolts != null ? t('route.bolts', { count: route.bolts }) : '']
                  .filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            {goals.map((g) => (
              <Pressable key={g.id} onPress={() => router.push(`/goal/${g.id}`)} accessibilityRole="link"
                style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingHorizontal: 12, minHeight: 32, borderRadius: 16, backgroundColor: th.badge }}>
                <Ionicons name="flag" size={14} color={th.onBadge} />
                <Text style={{ color: th.onBadge, fontFamily: F.semi, fontSize: 13 }}>{t(g.kind === 'project' ? 'goals.yourProject' : 'goals.yourWish')}</Text>
              </Pressable>
            ))}
            {goals.length ? null : (
              <Pressable onPress={addToGoals} accessibilityRole="button"
                style={({ pressed }) => ({ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingHorizontal: 12, minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: th.accent, opacity: pressed ? 0.6 : 1 })}>
                <Ionicons name="flag-outline" size={15} color={th.accent} />
                <Text style={{ color: th.accent, fontFamily: F.semi, fontSize: 14 }}>{t('goals.addRoute')}</Text>
              </Pressable>
            )}
            <Card style={{ padding: 14, marginTop: 8 }}>
              <Text style={{ color: th.ink, fontFamily: F.semi, fontSize: 16 }}>{summary.firstSend ? '✓ ' : ''}{status}</Text>
              {summary.ascents ? <Text style={{ color: th.muted, fontSize: 13, marginTop: 2 }}>{t('route.totals', { ascents: summary.ascents, sends: summary.sends })}</Text> : null}
            </Card>
            <Pressable
              onPress={() => router.push({ pathname: '/ascent/new', params: { routeId: route.id } })}
              accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: th.cta, borderRadius: 14, minHeight: 54, marginTop: 8, opacity: pressed ? 0.85 : 1 })}
            >
              <Ionicons name="add" size={24} color={th.onCta} />
              <Text style={{ color: th.onCta, fontFamily: F.display, fontSize: 20, letterSpacing: 0.8, textTransform: 'uppercase' }}>{t('route.logAnother')}</Text>
            </Pressable>
            {topos.length || wallPhotos.length ? (
              <Text accessibilityRole="header" style={{ color: th.muted, fontSize: 12, fontFamily: F.semi, marginTop: 18, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1.5 }}>{t('topo.title')}</Text>
            ) : null}
            {topos.map(({ photo, lines }) => (
              <View key={photo.id} style={{ marginBottom: 8 }}>
                <TopoPreview photo={photo} lines={lines} highlight={route.id} width={screenW - 32} maxHeight={screenH * 0.6} label={t('topo.openPhoto', { name: route.name })}
                  onPress={() => router.push({ pathname: '/photo', params: { ownerType: photo.owner_type, ownerId: photo.owner_id, photoId: photo.id } })} />
              </View>
            ))}
            {!topos.length && wallPhotos.length ? (
              <LinkButton label={t('topo.drawThis')} onPress={() => router.push({ pathname: '/topo', params: { photoId: wallPhotos[0].id, routeId: route.id } })} />
            ) : null}
            {ascents.length ? <Text accessibilityRole="header" style={{ color: th.muted, fontSize: 12, fontFamily: F.semi, marginTop: 18, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1.5 }}>{t('route.history')}</Text> : null}
          </View>
        }
        ListEmptyComponent={<EmptyState title={t('route.neverTried')} />}
        // History as a timeline: a dot per ascent on a vertical line, rust for sends.
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => router.push(`/ascent/${item.id}`)}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ width: 16, alignSelf: 'stretch', alignItems: 'center' }}>
              <View style={{ position: 'absolute', top: index === 0 ? 28 : 0, bottom: index === ascents.length - 1 ? '50%' : 0, width: 2, backgroundColor: th.line }} />
              <View style={{ marginTop: 22, width: 12, height: 12, borderRadius: 6, backgroundColor: item.style === 'attempt' ? th.muted : th.accent }} />
            </View>
            <View style={{ flex: 1, paddingVertical: 8 }}>
              <Text style={{ color: th.ink, fontFamily: F.semi }}>{day(item.date)}</Text>
              <Text style={{ color: th.muted, fontSize: 12 }}>
                {[
                  feltGrade(item.felt_grade_index, item.grade_index) != null ? t('ascent.feltFor', { grade: formatGrade(item.felt_grade_index!, routeSystem) }) : '',
                  item.attempts > 1 ? t('journal.attempts', { count: item.attempts }) : '',
                  item.partner_name ?? '',
                ].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {item.photos ? <PhotoBadge count={item.photos} /> : null}
            <Text style={{ color: item.style === 'attempt' ? th.muted : th.accent, fontFamily: F.cond, fontSize: 17 }}>{t(`styles.${item.style as AscentStyle}`)}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
