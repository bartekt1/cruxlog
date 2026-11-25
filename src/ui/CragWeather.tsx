import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { weatherIcon } from '../domain/metno';
import { F } from './fonts';
import { Card } from './kit';
import { fetchForecast, type Forecast } from './metno';
import { Text } from './Text';
import { useTheme } from './theme';

const hm = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * The weather for the next days at a crag (MET Norway), on the crag screen. Only the crag's coordinates leave the phone;
 * without signal the last forecast shows with the time it was fetched. A crag without a position shows nothing.
 */
export function CragWeather({ lat, lng }: { lat: number | null; lng: number | null }) {
  const th = useTheme();
  const { t, i18n } = useTranslation();
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) return;
    let live = true;
    setForecast(null);
    setFailed(false);
    fetchForecast(lat, lng).then((f) => { if (live) setForecast(f); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [lat, lng]);

  if (lat == null || lng == null) return null;
  const weekday = (date: string, i: number) => (i === 0 ? t('weather.today') : new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'short' }));

  return (
    <Card style={{ padding: 12, marginTop: 8 }}>
      <Text style={{ color: th.ink, fontFamily: F.semi, fontSize: 16 }}>{t('weather.title')}</Text>
      {forecast?.days.length ? (
        <View style={{ flexDirection: 'row', marginTop: 8, gap: 4 }}>
          {forecast.days.map((d, i) => (
            <View key={d.date} accessible style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
              accessibilityLabel={t('weather.dayA11y', { day: weekday(d.date, i), min: Math.round(d.min), max: Math.round(d.max), rain: d.rain, wind: Math.round(d.wind) })}>
              <Text style={{ color: th.muted, fontSize: 12, textTransform: 'uppercase' }}>{weekday(d.date, i)}</Text>
              <Ionicons name={weatherIcon(d.symbol)} size={24} color={th.ink} />
              <Text style={{ color: th.ink, fontFamily: F.cond, fontSize: 16 }}>{Math.round(d.max)}°</Text>
              <Text style={{ color: th.muted, fontFamily: F.cond, fontSize: 13 }}>{Math.round(d.min)}°</Text>
              {d.rain > 0 ? <Text style={{ color: th.accent, fontSize: 11 }}>{t('weather.rain', { mm: d.rain })}</Text> : null}
              <Text style={{ color: th.muted, fontSize: 11 }}>{t('weather.wind', { ms: Math.round(d.wind) })}</Text>
            </View>
          ))}
        </View>
      ) : failed ? (
        <Text style={{ color: th.muted, marginTop: 6 }}>{t('weather.offline')}</Text>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <ActivityIndicator color={th.accent} />
          <Text style={{ color: th.muted }}>{t('weather.loading')}</Text>
        </View>
      )}
      {forecast ? (
        <Text style={{ color: th.muted, fontSize: 11, marginTop: 8 }}>
          {[t(forecast.stale ? 'weather.stale' : 'weather.fetched', { when: hm(new Date(forecast.fetchedAt)) }), t('weather.source')].join(' · ')}
        </Text>
      ) : null}
    </Card>
  );
}
