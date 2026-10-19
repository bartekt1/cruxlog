import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { getRoute, listRouteAscents, type AscentRow, type RouteRow } from '../../src/db/repo';
import { formatDay, isoDate } from '../../src/domain/dates';
import { type AscentStyle, feltGrade, formatGrade, routeGrade } from '../../src/domain/grades';
import { routeSummary } from '../../src/domain/history';
import { IconButton } from '../../src/ui/icons';
import { Contours } from '../../src/ui/Contours';
import { F } from '../../src/ui/fonts';
import { Card, EmptyState, GradeBadge, Screen, Title } from '../../src/ui/kit';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';

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

  useFocusEffect(useCallback(() => {
    getRoute(db, id).then((r) => {
      if (!r) { router.back(); return; } // deleted from the edit screen
      setRoute(r);
    });
    listRouteAscents(db, id).then(setAscents);
  }, [db, id, router]));

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
          headerRight: () => <IconButton name="create-outline" size={26} label={t('edit.routeTitle')} onPress={() => router.push({ pathname: '/route/edit', params: { id: route.id } })} />,
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
            <Text style={{ color: item.style === 'attempt' ? th.muted : th.accent, fontFamily: F.cond, fontSize: 17 }}>{t(`styles.${item.style as AscentStyle}`)}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
