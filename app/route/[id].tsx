import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';
import { getRoute, listRouteAscents, type AscentRow, type RouteRow } from '../../src/db/repo';
import { formatDay, isoDate } from '../../src/domain/dates';
import { formatGrade, type AscentStyle } from '../../src/domain/grades';
import { routeSummary } from '../../src/domain/history';
import { IconButton } from '../../src/ui/icons';
import { EmptyState, GradeBadge, Screen } from '../../src/ui/kit';
import { useSettings } from '../../src/ui/settingsStore';
import { useTheme } from '../../src/ui/theme';

/** One route: the user's whole history on it and a quick way to log another go. */
export default function RouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const { routeSystem, boulderSystem } = useSettings();
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
  const grade = formatGrade(route.grade_index, route.type === 'boulder' ? boulderSystem : routeSystem, route.type);

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
          title: route.name,
          headerRight: route.source === 'user'
            ? () => <IconButton name="create-outline" size={26} label={t('edit.routeTitle')} onPress={() => router.push({ pathname: '/route/edit', params: { id: route.id } })} />
            : undefined,
        }}
      />
      <FlatList
        data={ascents}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <View style={{ paddingTop: 12, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, color: th.ink, fontSize: 22, fontWeight: '700' }}>{route.name}</Text>
              <GradeBadge text={grade} />
            </View>
            <Pressable onPress={() => router.push(`/crag/${route.crag_id}`)} accessibilityRole="link">
              <Text style={{ color: th.accent }}>{route.crag_name} · {route.sector_name} · {t(`types.${route.type}`)}</Text>
            </Pressable>
            <View style={{ padding: 12, borderRadius: 6, backgroundColor: th.soft, marginTop: 6 }}>
              <Text style={{ color: summary.firstSend ? th.accent : th.ink, fontWeight: '600' }}>{summary.firstSend ? '✓ ' : ''}{status}</Text>
              {summary.ascents ? <Text style={{ color: th.muted, fontSize: 12, marginTop: 2 }}>{t('route.totals', { ascents: summary.ascents, sends: summary.sends })}</Text> : null}
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/ascent/new', params: { routeId: route.id } })}
              accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: th.accent, borderRadius: 6, minHeight: 48, marginTop: 6, opacity: pressed ? 0.85 : 1 })}
            >
              <Ionicons name="add" size={24} color={th.onAccent} />
              <Text style={{ color: th.onAccent, fontWeight: '700', fontSize: 16 }}>{t('route.logAnother')}</Text>
            </Pressable>
            {ascents.length ? <Text accessibilityRole="header" style={{ color: th.muted, fontSize: 12, fontWeight: '600', marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>{t('route.history')}</Text> : null}
          </View>
        }
        ListEmptyComponent={<EmptyState title={t('route.neverTried')} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/ascent/${item.id}`)}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: th.line, opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: th.ink }}>{day(item.date)}</Text>
              <Text style={{ color: th.muted, fontSize: 12 }}>
                {item.attempts > 1 ? t('journal.attempts', { count: item.attempts }) : ''}{item.attempts > 1 && item.partner_name ? ' · ' : ''}{item.partner_name ?? ''}
              </Text>
            </View>
            <Text style={{ color: item.style === 'attempt' ? th.muted : th.accent, fontWeight: '700' }}>{t(`styles.${item.style as AscentStyle}`)}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
