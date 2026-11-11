import { describe, expect, it } from "vitest";
import { formatMinutesAsTime } from "@/lib/geo/distance";
import {
  describeItinerary,
  generateItinerary,
  rescheduleStops,
  totalDistanceBetweenStops,
} from "@/lib/planner/itinerary-generator";
import type { PlannerPreferences } from "@/lib/planner/types";
import { makePlace } from "../fixtures/place";

const PLACES = [
  makePlace({
    slug: "temple",
    name: "Temple",
    lat: 7.2936,
    lng: 80.6413,
    category: "heritage",
    estimatedVisitMinutes: 60,
    priority: 10,
    featured: true,
  }),
  makePlace({
    slug: "museum",
    name: "Museum",
    lat: 7.2961,
    lng: 80.6395,
    category: "museum",
    estimatedVisitMinutes: 45,
    priority: 5,
  }),
  makePlace({
    slug: "viewpoint",
    name: "Viewpoint",
    lat: 7.2867,
    lng: 80.6412,
    category: "viewpoint",
    estimatedVisitMinutes: 30,
    priority: 8,
  }),
  makePlace({
    slug: "cafe",
    name: "Cafe",
    lat: 7.3001,
    lng: 80.6301,
    category: "food",
    estimatedVisitMinutes: 30,
    priority: 3,
  }),
  makePlace({
    slug: "lake",
    name: "Lake",
    lat: 7.2906,
    lng: 80.6337,
    category: "nature",
    estimatedVisitMinutes: 40,
    priority: 9,
  }),
];

const NOW = new Date("2026-11-11T08:00:00.000Z");

function prefs(overrides: Partial<PlannerPreferences> = {}): PlannerPreferences {
  return {
    startPlaceSlug: null,
    start: { lat: 7.2906, lng: 80.6337, label: "Kandy city centre" },
    startTime: "09:00",
    availableMinutes: 300,
    interests: ["heritage", "museum", "viewpoint", "food"],
    budgetLkr: 5000,
    travelMode: "walk",
    pace: "balanced",
    includeMeal: true,
    accessibilityNeeded: false,
    groupType: "couple",
    groupSize: 2,
    mustIncludeSlugs: [],
    ...overrides,
  };
}

describe("generateItinerary", () => {
  it("builds a feasible, internally consistent itinerary", () => {
    const itinerary = generateItinerary(PLACES, prefs(), { now: NOW });

    expect(itinerary.stops.length).toBeGreaterThan(0);
    expect(itinerary.stops.length).toBeLessThanOrEqual(PLACES.length);
    expect(itinerary.generatedAt).toBe(NOW.toISOString());
    expect(itinerary.startTime).toBe("09:00");
    expect(itinerary.assumptions).toHaveLength(5);

    itinerary.stops.forEach((stop, index) => {
      expect(stop.order).toBe(index + 1);
      expect(stop.departureMinutes - stop.arrivalMinutes).toBe(stop.visitMinutes);
      expect(stop.travel.minutes).toBeGreaterThanOrEqual(1);
      expect(stop.travel.source).toBe("estimate");
    });

    const last = itinerary.stops[itinerary.stops.length - 1]!;
    expect(last.departureMinutes).toBeLessThanOrEqual(540 + 300);
    expect(itinerary.endTime).toBe(formatMinutesAsTime(last.departureMinutes));

    const visit = itinerary.stops.reduce((sum, stop) => sum + stop.visitMinutes, 0);
    const travel = itinerary.stops.reduce((sum, stop) => sum + stop.travel.minutes, 0);
    expect(itinerary.totals.visitMinutes).toBe(visit);
    expect(itinerary.totals.travelMinutes).toBe(travel);
    expect(itinerary.totals.totalMinutes).toBe(visit + travel);
    expect(itinerary.alternatives.length).toBeLessThanOrEqual(4);
  });

  it("includes a meal stop when requested", () => {
    const itinerary = generateItinerary(PLACES, prefs({ includeMeal: true }), {
      now: NOW,
    });
    expect(itinerary.stops.some((stop) => stop.place.category === "food")).toBe(true);
  });

  it("does not include food stops when meals are off", () => {
    const itinerary = generateItinerary(
      PLACES,
      prefs({ includeMeal: false, interests: ["heritage", "museum", "viewpoint"] }),
      { now: NOW },
    );
    expect(itinerary.stops.some((stop) => stop.place.category === "food")).toBe(false);
  });

  it("honours pinned places that fit the window", () => {
    const itinerary = generateItinerary(
      PLACES,
      prefs({ availableMinutes: 180, mustIncludeSlugs: ["museum"] }),
      { now: NOW },
    );
    expect(itinerary.stops.some((stop) => stop.place.slug === "museum")).toBe(true);
  });

  it("warns about unknown entry fees and estimates", () => {
    const itinerary = generateItinerary(PLACES, prefs(), { now: NOW });
    expect(itinerary.warnings.join(" ")).toMatch(/no verified entry fee/i);
    expect(itinerary.assumptions.join(" ")).toMatch(/not live traffic/i);
    expect(itinerary.budgetStatus).toBe("unknown");
  });

  it("flags an over-budget plan", () => {
    const itinerary = generateItinerary(PLACES, prefs({ budgetLkr: 100 }), {
      now: NOW,
    });
    expect(itinerary.budgetStatus).toBe("over");
    expect(itinerary.warnings.join(" ")).toMatch(/above your LKR 100 budget/i);
  });

  it("warns when accessibility is not documented", () => {
    const itinerary = generateItinerary(
      PLACES,
      prefs({ accessibilityNeeded: true }),
      { now: NOW },
    );
    expect(
      itinerary.stops.some((stop) =>
        stop.warnings.includes("Accessibility not documented"),
      ),
    ).toBe(true);
  });

  it("returns an empty, explained plan when nothing fits", () => {
    const longVisits = PLACES.map((place) => ({
      ...place,
      estimatedVisitMinutes: 120,
    }));
    const itinerary = generateItinerary(
      longVisits,
      prefs({ interests: ["shopping"], includeMeal: false, availableMinutes: 60 }),
      { now: NOW },
    );
    expect(itinerary.stops).toHaveLength(0);
    expect(itinerary.warnings.join(" ")).toMatch(/No stops fit/i);
    expect(describeItinerary(itinerary)).toMatch(/No itinerary could be built/i);
  });

  it("can start from a named place", () => {
    const itinerary = generateItinerary(
      PLACES,
      prefs({ startPlaceSlug: "temple", availableMinutes: 120 }),
      { now: NOW },
    );
    expect(itinerary.start.label).toBe("Temple");
    expect(itinerary.stops.every((stop) => stop.place.slug !== "temple")).toBe(true);
  });
});

describe("rescheduleStops", () => {
  it("recomputes times after a user reorder", () => {
    const itinerary = generateItinerary(PLACES, prefs(), { now: NOW });
    const reversed = [...itinerary.stops].reverse().map((stop) => stop.place.slug);
    const updated = rescheduleStops(itinerary, reversed);

    expect(updated.stops.map((stop) => stop.place.slug)).toEqual(reversed);
    expect(updated.endTime).toBe(
      formatMinutesAsTime(
        updated.stops[updated.stops.length - 1]!.departureMinutes,
      ),
    );
    updated.stops.forEach((stop, index) => {
      expect(stop.order).toBe(index + 1);
    });
  });

  it("ignores unknown slugs", () => {
    const itinerary = generateItinerary(PLACES, prefs(), { now: NOW });
    const slugs = itinerary.stops.map((stop) => stop.place.slug);
    const updated = rescheduleStops(itinerary, ["does-not-exist", ...slugs]);
    expect(updated.stops).toHaveLength(slugs.length);
  });
});

describe("describeItinerary", () => {
  it("summarises a plan in one line", () => {
    const itinerary = generateItinerary(PLACES, prefs(), { now: NOW });
    const description = describeItinerary(itinerary);
    expect(description).toContain("stops");
    expect(description).toContain(itinerary.stops[0]!.place.name);
  });
});

describe("totalDistanceBetweenStops", () => {
  it("sums estimated travel from the start through every stop", () => {
    const itinerary = generateItinerary(PLACES, prefs(), { now: NOW });
    expect(totalDistanceBetweenStops(itinerary)).toBeGreaterThan(0);
    expect(totalDistanceBetweenStops(itinerary)).toBe(
      itinerary.totals.travelMeters,
    );
  });
});
