import { describe, expect, it } from "vitest";
import { describeWeatherCode } from "@/lib/weather/codes";
import {
  weatherAdvice,
  type WeatherSnapshot,
} from "@/lib/weather/open-meteo";

function snapshot(overrides: {
  code: number;
  rainProbability: number;
}): WeatherSnapshot {
  const condition = describeWeatherCode(overrides.code);
  const hourly = Array.from({ length: 6 }, (_, index) => ({
    time: `2026-11-11T0${index}:00`,
    temperatureC: 24,
    precipitationProbability: overrides.rainProbability,
    code: overrides.code,
    condition,
  }));

  return {
    latitude: 7.2906,
    longitude: 80.6337,
    timezone: "Asia/Colombo",
    fetchedAt: "2026-11-11T08:00:00.000Z",
    current: {
      temperatureC: 25,
      apparentC: 27,
      humidity: 80,
      precipitationMm: 0,
      windKmh: 6,
      code: overrides.code,
      condition,
      time: "2026-11-11T08:00",
    },
    hourly,
    daily: [],
    source: {
      name: "Open-Meteo",
      url: "https://open-meteo.com/",
      license: "CC BY 4.0",
    },
  };
}

describe("describeWeatherCode", () => {
  it("maps WMO codes to labels and icons", () => {
    expect(describeWeatherCode(0)).toEqual({
      label: "Clear sky",
      icon: "sun",
      rainy: false,
    });
    expect(describeWeatherCode(61).rainy).toBe(true);
    expect(describeWeatherCode(95).icon).toBe("storm");
    expect(describeWeatherCode(45).icon).toBe("fog");
  });

  it("never invents a condition for unknown codes", () => {
    expect(describeWeatherCode(999)).toEqual({
      label: "Unknown conditions",
      icon: "cloud",
      rainy: false,
    });
  });
});

describe("weatherAdvice", () => {
  it("recommends indoor stops when rain is likely", () => {
    const advice = weatherAdvice(snapshot({ code: 61, rainProbability: 30 }));
    expect(advice.rainLikely).toBe(true);
    expect(advice.headline).toContain("Rain likely");
    expect(advice.indoorAdvice).toMatch(/Temple of the Tooth/);
  });

  it("uses the hourly probability when it is high", () => {
    const advice = weatherAdvice(snapshot({ code: 0, rainProbability: 70 }));
    expect(advice.rainLikely).toBe(true);
    expect(advice.headline).toContain("70%");
  });

  it("recommends outdoor stops when conditions are dry", () => {
    const advice = weatherAdvice(snapshot({ code: 0, rainProbability: 10 }));
    expect(advice.rainLikely).toBe(false);
    expect(advice.headline).toMatch(/Mostly dry/i);
    expect(advice.outdoorAdvice).toMatch(/lake loop/i);
  });
});
