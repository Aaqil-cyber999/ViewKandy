import { describeWeatherCode, type WeatherCondition } from "./codes";

export interface CurrentWeather {
  temperatureC: number;
  apparentC: number;
  humidity: number;
  precipitationMm: number;
  windKmh: number;
  code: number;
  condition: WeatherCondition;
  time: string;
}

export interface HourlyWeather {
  time: string;
  temperatureC: number;
  precipitationProbability: number;
  code: number;
  condition: WeatherCondition;
}

export interface DailyWeather {
  date: string;
  minC: number;
  maxC: number;
  precipitationProbability: number;
  code: number;
  condition: WeatherCondition;
  sunrise: string;
  sunset: string;
}

export interface WeatherSnapshot {
  latitude: number;
  longitude: number;
  timezone: string;
  fetchedAt: string;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  source: {
    name: "Open-Meteo";
    url: "https://open-meteo.com/";
    license: "CC BY 4.0";
  };
}

export interface WeatherAdvice {
  rainLikely: boolean;
  headline: string;
  indoorAdvice: string;
  outdoorAdvice: string;
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

const CACHE_MS = 15 * 60 * 1000;
const cache = new Map<string, { at: number; data: WeatherSnapshot }>();

export const KANDY_WEATHER_COORDS = { lat: 7.2906, lng: 80.6337 };

/**
 * Fetches live conditions from Open-Meteo (no API key required). Returns null
 * when the upstream service is unavailable — the UI must then show an
 * "unavailable" state, never fabricated values.
 */
export async function fetchWeather(
  lat = KANDY_WEATHER_COORDS.lat,
  lng = KANDY_WEATHER_COORDS.lng,
): Promise<WeatherSnapshot | null> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("longitude", lng.toFixed(4));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
  );
  url.searchParams.set(
    "hourly",
    "temperature_2m,precipitation_probability,weather_code",
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
  );
  url.searchParams.set("timezone", "Asia/Colombo");
  url.searchParams.set("forecast_days", "3");

  try {
    const response = await fetch(url, {
      next: { revalidate: 900 },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error(`[weather] Open-Meteo returned ${response.status}`);
      return null;
    }
    const raw = (await response.json()) as OpenMeteoResponse;
    if (!raw.current || !raw.hourly || !raw.daily) return null;

    const nowIndex = Math.max(
      0,
      raw.hourly.time.findIndex((t) => new Date(t).getTime() >= Date.now() - 30 * 60 * 1000),
    );
    const hourly: HourlyWeather[] = raw.hourly.time
      .slice(nowIndex, nowIndex + 24)
      .map((time, index) => {
        const i = nowIndex + index;
        const code = raw.hourly!.weather_code[i] ?? 0;
        return {
          time,
          temperatureC: raw.hourly!.temperature_2m[i] ?? 0,
          precipitationProbability: raw.hourly!.precipitation_probability[i] ?? 0,
          code,
          condition: describeWeatherCode(code),
        };
      });

    const daily: DailyWeather[] = raw.daily.time.map((date, i) => {
      const code = raw.daily!.weather_code[i] ?? 0;
      return {
        date,
        minC: raw.daily!.temperature_2m_min[i] ?? 0,
        maxC: raw.daily!.temperature_2m_max[i] ?? 0,
        precipitationProbability: raw.daily!.precipitation_probability_max[i] ?? 0,
        code,
        condition: describeWeatherCode(code),
        sunrise: raw.daily!.sunrise[i] ?? "",
        sunset: raw.daily!.sunset[i] ?? "",
      };
    });

    const code = raw.current.weather_code;
    const snapshot: WeatherSnapshot = {
      latitude: raw.latitude,
      longitude: raw.longitude,
      timezone: raw.timezone,
      fetchedAt: new Date().toISOString(),
      current: {
        temperatureC: raw.current.temperature_2m,
        apparentC: raw.current.apparent_temperature,
        humidity: raw.current.relative_humidity_2m,
        precipitationMm: raw.current.precipitation,
        windKmh: raw.current.wind_speed_10m,
        code,
        condition: describeWeatherCode(code),
        time: raw.current.time,
      },
      hourly,
      daily,
      source: {
        name: "Open-Meteo",
        url: "https://open-meteo.com/",
        license: "CC BY 4.0",
      },
    };

    cache.set(key, { at: Date.now(), data: snapshot });
    return snapshot;
  } catch (error) {
    console.error("[weather] fetch failed:", error);
    return null;
  }
}

export function weatherAdvice(weather: WeatherSnapshot): WeatherAdvice {
  const next6 = weather.hourly.slice(0, 6);
  const maxRain = Math.max(
    ...next6.map((h) => h.precipitationProbability),
    weather.current.condition.rainy ? 80 : 0,
  );
  const rainLikely = maxRain >= 50 || weather.current.condition.rainy;

  if (rainLikely) {
    return {
      rainLikely: true,
      headline: `Rain likely (${Math.round(maxRain)}% in the next hours).`,
      indoorAdvice:
        "Prioritise the Temple of the Tooth, the National Museum, the Ceylon Tea Museum or Kandy City Centre.",
      outdoorAdvice:
        "If you go out, keep the lake loop short and carry a rain layer — paths get slippery.",
    };
  }
  return {
    rainLikely: false,
    headline: `Mostly dry (${weather.current.condition.label.toLowerCase()}).`,
    indoorAdvice: "Good conditions for the temple and museum circuit.",
    outdoorAdvice:
      "A good window for the lake loop, Bahirawakanda or the Rajapihilla viewpoint.",
  };
}
