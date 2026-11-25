import { dailyForecast, metCoord, weatherIcon, type MetResponse } from '../src/domain/metno';

// Times are made from local hours, so the test works in any time zone.
const at = (day: number, hour: number) => new Date(2026, 5, day, hour).toISOString();
const step = (time: string, temp: number, wind: number, symbol: string, rain1?: number, rain6?: number) => ({
  time,
  data: {
    instant: { details: { air_temperature: temp, wind_speed: wind } },
    ...(rain1 != null ? { next_1_hours: { summary: { symbol_code: symbol }, details: { precipitation_amount: rain1 } } } : {}),
    ...(rain6 != null ? { next_6_hours: { summary: { symbol_code: symbol }, details: { precipitation_amount: rain6 } } } : {}),
  },
});

describe('MET forecast', () => {
  it('keeps 3 decimals of the coordinates', () => {
    expect(metCoord(49.742315)).toBe(49.742);
    expect(metCoord(21.78508)).toBe(21.785);
  });
  it('sums the days: temperature range, rain once per hour, strongest wind, the weather near noon', () => {
    const res: MetResponse = { properties: { timeseries: [
      step(at(1, 9), 14, 3, 'cloudy', 0.2, 1),
      step(at(1, 10), 18, 6, 'rain', 1.5, 3),
      step(at(1, 11), 20, 4, 'partlycloudy_day', 0, 0),
      step(at(1, 14), 21, 2, 'fair_day', 0, 0),
      // 6-hourly from here: the 6-hour amount counts
      step(at(2, 6), 9, 2, 'lightrain', undefined, 2.4),
      step(at(2, 12), 17, 8, 'clearsky_day', undefined, 0),
      step(at(2, 18), 12, 1, 'clearsky_night', undefined, 0),
    ] } };
    const days = dailyForecast(res);
    expect(days.map((d) => d.date)).toEqual(['2026-06-01', '2026-06-02']);
    expect(days[0]).toMatchObject({ min: 14, max: 21, rain: 1.7, wind: 6, symbol: 'partlycloudy_day' });
    expect(days[1]).toMatchObject({ min: 9, max: 17, rain: 2.4, wind: 8, symbol: 'clearsky_day' });
  });
  it('gives up to the asked number of days', () => {
    const series = Array.from({ length: 10 }, (_, i) => step(at(i + 1, 12), 10, 1, 'fair_day', undefined, 0));
    expect(dailyForecast({ properties: { timeseries: series } }, 4)).toHaveLength(4);
    expect(dailyForecast({ properties: { timeseries: [] } })).toEqual([]);
  });
  it('picks an icon for each kind of weather', () => {
    expect(['clearsky_day', 'fair_night', 'partlycloudy_day', 'cloudy', 'fog', 'lightrainshowers_day', 'heavyrain', 'sleet', 'snowshowers_polartwilight', 'rainandthunder', ''].map(weatherIcon))
      .toEqual(['sunny-outline', 'partly-sunny-outline', 'partly-sunny-outline', 'cloudy-outline', 'cloudy-outline', 'rainy-outline', 'rainy-outline', 'snow-outline', 'snow-outline', 'thunderstorm-outline', 'help-outline']);
  });
});
