// The weather forecast for a crag, from MET Norway (api.met.no), read into days. Fetching and caching: src/ui/metno.ts.
import { isoDate } from './dates';

const HOUR = 3_600_000;

type Series = {
  time: string;
  data: {
    instant: { details: { air_temperature?: number; wind_speed?: number } };
    next_1_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
    next_6_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
  };
};
export type MetResponse = { properties: { timeseries: Series[] } };

/** One day of the forecast, by the phone's local date. */
export type DayForecast = { date: string; min: number; max: number; rain: number; wind: number; symbol: string };

/** Coordinates as MET asks for them: at most 4 decimals; 3 (about 100 m) also lets nearby crags share the cache. */
export const metCoord = (x: number) => Math.round(x * 1000) / 1000;

/**
 * The forecast by day: lowest and highest temperature, rain in mm, strongest wind in m/s and the weather around midday (the
 * symbol nearest noon). Rain counts each hour once: hourly steps use the 1-hour amount, 6-hourly ones the 6-hour amount.
 */
export function dailyForecast(res: MetResponse, days = 5): DayForecast[] {
  const series = res.properties?.timeseries ?? [];
  const out = new Map<string, DayForecast & { noonGap: number }>();
  series.forEach((s, i) => {
    const at = new Date(s.time);
    const date = isoDate(at);
    const temp = s.data.instant.details.air_temperature;
    const wind = s.data.instant.details.wind_speed ?? 0;
    const next = series[i + 1] ? new Date(series[i + 1].time).getTime() - at.getTime() : 0;
    const rain = next === HOUR ? s.data.next_1_hours?.details?.precipitation_amount ?? 0
      : next === 6 * HOUR ? s.data.next_6_hours?.details?.precipitation_amount ?? 0 : 0;
    const symbol = s.data.next_1_hours?.summary?.symbol_code ?? s.data.next_6_hours?.summary?.symbol_code ?? '';
    const noonGap = Math.abs(at.getHours() + at.getMinutes() / 60 - 12);
    const day = out.get(date) ?? { date, min: Infinity, max: -Infinity, rain: 0, wind: 0, symbol: '', noonGap: Infinity };
    if (temp != null) { day.min = Math.min(day.min, temp); day.max = Math.max(day.max, temp); }
    day.rain += rain;
    day.wind = Math.max(day.wind, wind);
    if (symbol && noonGap < day.noonGap) { day.symbol = symbol; day.noonGap = noonGap; }
    out.set(date, day);
  });
  return [...out.values()]
    .filter((d) => Number.isFinite(d.min))
    .slice(0, days)
    .map(({ noonGap: _, ...d }) => ({ ...d, rain: Math.round(d.rain * 10) / 10 }));
}

/** An icon for a MET weather symbol (e.g. "lightrainshowers_day"). */
export function weatherIcon(symbol: string): 'sunny-outline' | 'partly-sunny-outline' | 'cloudy-outline' | 'rainy-outline' | 'snow-outline' | 'thunderstorm-outline' | 'help-outline' {
  const s = symbol.replace(/_(day|night|polartwilight)$/, '');
  if (!s) return 'help-outline';
  if (s.includes('thunder')) return 'thunderstorm-outline';
  if (s.includes('snow') || s.includes('sleet')) return 'snow-outline';
  if (s.includes('rain')) return 'rainy-outline';
  if (s === 'clearsky') return 'sunny-outline';
  if (s === 'fair' || s === 'partlycloudy') return 'partly-sunny-outline';
  return 'cloudy-outline';
}

