import { describe, expect, it } from "vitest";
import {
  KANDY_BOUNDS,
  KANDY_CENTER,
  bboxAround,
  bearingDegrees,
  distanceMeters,
  formatDistance,
  formatDuration,
  formatMinutesAsTime,
  interpolate,
  isInsideKandy,
  parseTimeToMinutes,
} from "@/lib/geo/distance";

const TEMPLE = { lat: 7.2936, lng: 80.6413 };

describe("distanceMeters", () => {
  it("returns zero for the same point", () => {
    expect(distanceMeters(KANDY_CENTER, KANDY_CENTER)).toBe(0);
  });

  it("matches the great-circle distance from the city centre to the Temple of the Tooth", () => {
    expect(distanceMeters(KANDY_CENTER, TEMPLE)).toBeCloseTo(902.19, 1);
  });

  it("is symmetric", () => {
    expect(distanceMeters(KANDY_CENTER, TEMPLE)).toBeCloseTo(
      distanceMeters(TEMPLE, KANDY_CENTER),
      6,
    );
  });
});

describe("bearingDegrees", () => {
  it("returns the north-east bearing to the temple", () => {
    expect(bearingDegrees(KANDY_CENTER, TEMPLE)).toBeCloseTo(68.3, 1);
  });
});

describe("formatDistance", () => {
  it("formats metres below one kilometre", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(902)).toBe("900 m");
    expect(formatDistance(949)).toBe("950 m");
  });

  it("formats kilometres with one decimal under 9.5 km", () => {
    expect(formatDistance(1200)).toBe("1.2 km");
    expect(formatDistance(9499)).toBe("9.5 km");
  });

  it("formats long distances without decimals", () => {
    expect(formatDistance(12000)).toBe("12 km");
  });

  it("returns a dash for non-finite input", () => {
    expect(formatDistance(Number.NaN)).toBe("—");
    expect(formatDistance(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("formats minutes", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(59)).toBe("59 min");
  });

  it("formats whole and partial hours", () => {
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(90)).toBe("1 hr 30 min");
    expect(formatDuration(125.4)).toBe("2 hr 5 min");
  });

  it("returns a dash for invalid durations", () => {
    expect(formatDuration(-1)).toBe("—");
    expect(formatDuration(Number.NaN)).toBe("—");
  });
});

describe("formatMinutesAsTime", () => {
  it("wraps around midnight", () => {
    expect(formatMinutesAsTime(0)).toBe("00:00");
    expect(formatMinutesAsTime(1439)).toBe("23:59");
    expect(formatMinutesAsTime(1440)).toBe("00:00");
    expect(formatMinutesAsTime(-30)).toBe("23:30");
  });
});

describe("parseTimeToMinutes", () => {
  it("parses 24-hour times", () => {
    expect(parseTimeToMinutes("09:30")).toBe(570);
    expect(parseTimeToMinutes("9:05")).toBe(545);
    expect(parseTimeToMinutes(" 23:59 ")).toBe(1439);
  });

  it("rejects malformed or out-of-range times", () => {
    expect(parseTimeToMinutes("24:00")).toBeNull();
    expect(parseTimeToMinutes("9:5")).toBeNull();
    expect(parseTimeToMinutes("09:60")).toBeNull();
    expect(parseTimeToMinutes("noon")).toBeNull();
  });
});

describe("isInsideKandy", () => {
  it("accepts the city centre and the temple", () => {
    expect(isInsideKandy(KANDY_CENTER.lat, KANDY_CENTER.lng)).toBe(true);
    expect(isInsideKandy(TEMPLE.lat, TEMPLE.lng)).toBe(true);
  });

  it("rejects Colombo", () => {
    expect(isInsideKandy(6.9271, 79.8612)).toBe(false);
  });

  it("includes the exact bounds", () => {
    expect(isInsideKandy(KANDY_BOUNDS.south, KANDY_BOUNDS.west)).toBe(true);
    expect(isInsideKandy(KANDY_BOUNDS.north, KANDY_BOUNDS.east)).toBe(true);
  });
});

describe("bboxAround", () => {
  it("returns a padded box around the centre", () => {
    const box = bboxAround(KANDY_CENTER, 1000);
    expect(box.south).toBeLessThan(KANDY_CENTER.lat);
    expect(box.north).toBeGreaterThan(KANDY_CENTER.lat);
    expect(box.west).toBeLessThan(KANDY_CENTER.lng);
    expect(box.east).toBeGreaterThan(KANDY_CENTER.lng);
    expect(box.north - box.south).toBeCloseTo(0.01798, 3);
  });
});

describe("interpolate", () => {
  it("returns the endpoints at t=0 and t=1", () => {
    expect(interpolate(KANDY_CENTER, TEMPLE, 0)).toEqual(KANDY_CENTER);
    expect(interpolate(KANDY_CENTER, TEMPLE, 1)).toEqual(TEMPLE);
  });

  it("returns the midpoint at t=0.5", () => {
    expect(interpolate(KANDY_CENTER, TEMPLE, 0.5)).toEqual({
      lat: (KANDY_CENTER.lat + TEMPLE.lat) / 2,
      lng: (KANDY_CENTER.lng + TEMPLE.lng) / 2,
    });
  });
});
