export interface WeatherCondition {
  label: string;
  icon:
    | "sun"
    | "cloud-sun"
    | "cloud"
    | "fog"
    | "drizzle"
    | "rain"
    | "snow"
    | "storm";
  rainy: boolean;
}

const CONDITIONS: Record<number, WeatherCondition> = {
  0: { label: "Clear sky", icon: "sun", rainy: false },
  1: { label: "Mainly clear", icon: "sun", rainy: false },
  2: { label: "Partly cloudy", icon: "cloud-sun", rainy: false },
  3: { label: "Overcast", icon: "cloud", rainy: false },
  45: { label: "Fog", icon: "fog", rainy: false },
  48: { label: "Depositing rime fog", icon: "fog", rainy: false },
  51: { label: "Light drizzle", icon: "drizzle", rainy: true },
  53: { label: "Drizzle", icon: "drizzle", rainy: true },
  55: { label: "Dense drizzle", icon: "drizzle", rainy: true },
  56: { label: "Freezing drizzle", icon: "drizzle", rainy: true },
  57: { label: "Dense freezing drizzle", icon: "drizzle", rainy: true },
  61: { label: "Light rain", icon: "rain", rainy: true },
  63: { label: "Rain", icon: "rain", rainy: true },
  65: { label: "Heavy rain", icon: "rain", rainy: true },
  66: { label: "Freezing rain", icon: "rain", rainy: true },
  67: { label: "Heavy freezing rain", icon: "rain", rainy: true },
  71: { label: "Light snow", icon: "snow", rainy: false },
  73: { label: "Snow", icon: "snow", rainy: false },
  75: { label: "Heavy snow", icon: "snow", rainy: false },
  77: { label: "Snow grains", icon: "snow", rainy: false },
  80: { label: "Light showers", icon: "rain", rainy: true },
  81: { label: "Showers", icon: "rain", rainy: true },
  82: { label: "Violent showers", icon: "rain", rainy: true },
  85: { label: "Snow showers", icon: "snow", rainy: false },
  86: { label: "Heavy snow showers", icon: "snow", rainy: false },
  95: { label: "Thunderstorm", icon: "storm", rainy: true },
  96: { label: "Thunderstorm with hail", icon: "storm", rainy: true },
  99: { label: "Severe thunderstorm with hail", icon: "storm", rainy: true },
};

export function describeWeatherCode(code: number): WeatherCondition {
  return CONDITIONS[code] ?? { label: "Unknown conditions", icon: "cloud", rainy: false };
}
