import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { searchRoutes, type RouteRow } from '../db/repo';
import { routeGrade } from '../domain/grades';
import { F } from './fonts';
import { Field, GradeBadge, LinkButton, Suggestions } from './kit';
import { useSettings } from './settingsStore';
import { Text } from './Text';
import { useTheme } from './theme';

export type PickedRoute = Pick<RouteRow, 'id' | 'name' | 'crag_name' | 'grade_index' | 'grade_label' | 'grade_system' | 'type'>;

/** Pick a route from the catalog by typing its name (or its crag's); shows the choice with a way to change it. */
export function RoutePicker({ value, onChange }: { value: PickedRoute | null; onChange: (r: PickedRoute | null) => void }) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<RouteRow[]>([]);

  useEffect(() => {
    if (!query.trim()) { setHits([]); return; }
    let live = true;
    searchRoutes(db, query, 6).then((r) => { if (live) setHits(r); });
    return () => { live = false; };
  }, [db, query]);

  if (value) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, backgroundColor: th.surface, borderWidth: 1, borderColor: th.line }}>
        <GradeBadge text={routeGrade(value, routeSystem)} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: th.ink, fontFamily: F.semi, fontSize: 16 }}>{value.name}</Text>
          <Text style={{ color: th.muted, fontSize: 13 }}>{value.crag_name}</Text>
        </View>
        <LinkButton label={t('common.change')} onPress={() => { onChange(null); setQuery(''); }} />
      </View>
    );
  }
  return (
    <View>
      <Field value={query} onChangeText={setQuery} placeholder={t('goals.routeSearch')} accessibilityLabel={t('goals.route')} />
      <Suggestions
        items={hits.map((r) => ({ key: r.id, title: r.name, subtitle: `${r.crag_name} · ${r.sector_name}`, badge: routeGrade(r, routeSystem) }))}
        onPick={(id) => { const r = hits.find((x) => x.id === id); if (r) onChange(r); }}
      />
    </View>
  );
}
