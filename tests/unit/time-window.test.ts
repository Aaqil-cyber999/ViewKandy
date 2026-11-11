import { describe, expect, it } from "vitest";
import {
  isOpenAt,
  latestStart,
  parseOpeningHours,
  type TimeWindow,
} from "@/lib/planner/time-window";

describe("parseOpeningHours", () => {
  it("returns null for missing or unparseable hours", () => {
    expect(parseOpeningHours(null)).toBeNull();
    expect(parseOpeningHours(undefined)).toBeNull();
    expect(parseOpeningHours("")).toBeNull();
    expect(parseOpeningHours("Closed on full moon Poya days")).toBeNull();
    expect(parseOpeningHours("Open daily")).toBeNull();
  });

  it("parses a single window", () => {
    expect(parseOpeningHours("06:00-20:00")).toEqual([{ start: 360, end: 1200 }]);
  });

  it("parses multiple windows and en/em dashes", () => {
    expect(parseOpeningHours("07:30–17:00, 18:00–21:00")).toEqual([
      { start: 450, end: 1020 },
      { start: 1080, end: 1260 },
    ]);
  });

  it("supports 'to' as a separator and dot-separated times", () => {
    expect(parseOpeningHours("09.00 to 17.30")).toEqual([{ start: 540, end: 1050 }]);
  });

  it("wraps windows that cross midnight", () => {
    expect(parseOpeningHours("22:00-02:00")).toEqual([{ start: 1320, end: 1560 }]);
  });

  it("skips invalid hours and very short windows", () => {
    expect(parseOpeningHours("25:00-26:00")).toBeNull();
    expect(parseOpeningHours("10:00-10:02")).toBeNull();
  });

  it("keeps valid windows when one range is invalid", () => {
    expect(parseOpeningHours("25:00-26:00, 09:00-17:00")).toEqual([
      { start: 540, end: 1020 },
    ]);
  });
});

describe("isOpenAt", () => {
  const daytime: TimeWindow[] = [{ start: 360, end: 1200 }];

  it("returns unknown when hours are not known", () => {
    expect(isOpenAt(null, 600)).toBe("unknown");
  });

  it("treats the boundaries as open", () => {
    expect(isOpenAt(daytime, 360)).toBe("open");
    expect(isOpenAt(daytime, 1200)).toBe("open");
  });

  it("returns closed outside the window", () => {
    expect(isOpenAt(daytime, 359)).toBe("closed");
    expect(isOpenAt(daytime, 1201)).toBe("closed");
  });

  it("handles windows that cross midnight", () => {
    const overnight: TimeWindow[] = [{ start: 1320, end: 1560 }];
    expect(isOpenAt(overnight, 1380)).toBe("open");
    expect(isOpenAt(overnight, 60)).toBe("open");
    expect(isOpenAt(overnight, 180)).toBe("closed");
  });

  it("normalises minutes outside a single day", () => {
    expect(isOpenAt(daytime, 600 + 1440)).toBe("open");
    expect(isOpenAt(daytime, 600 - 1440)).toBe("open");
  });
});

describe("latestStart", () => {
  it("returns null for unknown hours", () => {
    expect(latestStart(null)).toBeNull();
  });

  it("returns the latest closing time, normalised past midnight", () => {
    expect(latestStart([{ start: 360, end: 1200 }])).toBe(1200);
    expect(latestStart([{ start: 1320, end: 1560 }])).toBe(120);
  });
});
