import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { listTrips, type TripRow } from '../db/repo';
import { isoDate } from '../domain/dates';
import { formatTripDates, tripStatus } from '../domain/trips';
import { F } from './fonts';
import { Button, Label } from './kit';
import { Text } from './Text';
import { useTheme } from './theme';

/** The trips at the top of the Plans tab. */
export function TripsSection() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const [trips, setTrips] = useState<TripRow[]>([]);
  useFocusEffect(useCallback(() => { listTrips(db).then(setTrips); }, [db]));
  const today = isoDate(new Date());
  return (
    <>
      {/* Trips first: planned and ongoing ones are what matters this week. */}
      <Label>{t('trip.list')}</Label>
      {trips.map((tr) => {
        const st = tripStatus(tr, today);
        return (
          <Pressable key={tr.id} onPress={() => router.push(`/trip/${tr.id}`)} accessibilityRole="button"
            style={({ pressed }) => ({ marginTop: 8, padding: 14, backgroundColor: th.surface, borderWidth: 1, borderColor: st === 'done' ? th.line : th.accent, borderRadius: 14, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, color: th.ink, fontFamily: F.semi, fontSize: 16 }} numberOfLines={1}>{tr.name}</Text>
              <Text style={{ color: st === 'done' ? th.muted : th.accent, fontFamily: F.semi, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{t(`trip.status.${st}`)}</Text>
            </View>
            <Text style={{ color: th.muted, fontSize: 13 }} numberOfLines={1}>
              {[formatTripDates(tr.start_date, tr.end_date, i18n.language), tr.crags, tr.routes ? t('trip.routesCount', { count: tr.routes }) : ''].filter(Boolean).join(' · ')}
            </Text>
          </Pressable>
        );
      })}
      <Button label={t('trip.new')} variant="plain" onPress={() => router.push('/trip/edit')} />
    </>
  );
}
