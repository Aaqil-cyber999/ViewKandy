import { describe, expect, it } from "vitest";
import { KANDY_CENTER, distanceMeters } from "@/lib/geo/distance";
import {
  buildGreedyOrder,
  estimateTravel,
  improveOrderTwoOpt,
  insertMealStop,
  interestLabel,
  isCandidate,
  parseStartTime,
  routeCost,
  scheduleRoute,
  scoreCandidate,
  sortByProximity,
  visitMinutesFor,
  type CandidateOptions,
} from "@/lib/planner/route-optimizer";
import { makePlace } from "../fixtures/place";

const TEMPLE = makePlace({
  slug: "temple",
  name: "Temple",
  lat: 7.2936,
  lng: 80.6413,
  estimatedVisitMinutes: 60,
  priority: 10,
  featured: true,
});

const MUSEUM = makePlace({
  slug: "museum",
  name: "Museum",
  lat: 7.2961,
  lng: 80.6395,
  category: "museum",
  estimatedVisitMinutes: 45,
  priority: 5,
});

const VIEWPOINT = makePlace({
  slug: "viewpoint",
  name: "Viewpoint",
  lat: 7.2867,
  lng: 80.6412,
  category: "viewpoint",
  estimatedVisitMinutes: 30,
  priority: 8,
});

const CAFE = makePlace({
  slug: "cafe",
  name: "Cafe",
  lat: 7.3001,
  lng: 80.6301,
  category: "food",
  estimatedVisitMinutes: 30,
  priority: 3,
});

const BASE_OPTIONS: CandidateOptions = {
  interests: ["heritage", "museum", "viewpoint", "food"],
  includeMeal: true,
  accessibilityNeeded: false,
  availableMinutes: 300,
  mode: "walk",
};

describe("estimateTravel", () => {
  it("applies the walking detour factor, speed and overhead", () => {
    const leg = estimateTravel(KANDY_CENTER, TEMPLE, "walk");
    expect(leg.meters).toBe(1173);
    expect(leg.minutes).toBe(18);
    expect(leg.source).toBe("estimate");
  });

  it("uses the driving model", () => {
    const leg = estimateTravel(KANDY_CENTER, TEMPLE, "drive");
    expect(leg.meters).toBe(1218);
    expect(leg.minutes).toBe(10);
  });

  it("always takes at least one minute", () => {
    const leg = estimateTravel(KANDY_CENTER, KANDY_CENTER, "walk");
    expect(leg.meters).toBe(0);
    expect(leg.minutes).toBe(1);
  });
});

describe("visitMinutesFor", () => {
  it("adjusts the editorial duration for pace", () => {
    const place = makePlace({ slug: "x", estimatedVisitMinutes: 60 });
    expect(visitMinutesFor(place, "relaxed")).toBe(75);
    expect(visitMinutesFor(place, "balanced")).toBe(60);
    expect(visitMinutesFor(place, "fast")).toBe(48);
  });

  it("never schedules less than 15 minutes", () => {
    const place = makePlace({ slug: "tiny", estimatedVisitMinutes: 10 });
    expect(visitMinutesFor(place, "fast")).toBe(15);
  });
});

describe("isCandidate", () => {
  it("only allows visitable categories", () => {
    expect(isCandidate(TEMPLE, BASE_OPTIONS)).toBe(true);
    expect(
      isCandidate(makePlace({ slug: "hotel", category: "hotel" }), BASE_OPTIONS),
    ).toBe(false);
  });

  it("excludes food when no meal is requested", () => {
    expect(isCandidate(CAFE, BASE_OPTIONS)).toBe(true);
    expect(isCandidate(CAFE, { ...BASE_OPTIONS, includeMeal: false })).toBe(false);
  });

  it("excludes places documented as inaccessible when accessibility is needed", () => {
    const inaccessible = makePlace({
      slug: "steps",
      accessibility: "Not suitable for wheelchairs; steep steps.",
    });
    expect(
      isCandidate(inaccessible, { ...BASE_OPTIONS, accessibilityNeeded: true }),
    ).toBe(false);
    expect(isCandidate(inaccessible, BASE_OPTIONS)).toBe(true);
  });
});

describe("scoreCandidate", () => {
  it("rewards matching interests", () => {
    const matching = scoreCandidate(TEMPLE, BASE_OPTIONS, KANDY_CENTER);
    const nonMatching = scoreCandidate(
      TEMPLE,
      { ...BASE_OPTIONS, interests: ["shopping"] },
      KANDY_CENTER,
    );
    expect(matching).toBeGreaterThan(nonMatching);
  });

  it("prefers indoor places when rain is likely", () => {
    const indoor = makePlace({ slug: "indoor", indoor: true, priority: 0 });
    const outdoor = makePlace({ slug: "outdoor", indoor: false, priority: 0 });
    const rainy = { ...BASE_OPTIONS, rainLikely: true };
    expect(scoreCandidate(indoor, rainy, KANDY_CENTER)).toBeGreaterThan(
      scoreCandidate(outdoor, rainy, KANDY_CENTER),
    );
  });
});

describe("scheduleRoute", () => {
  it("schedules a feasible stop and tracks travel", () => {
    const result = scheduleRoute([TEMPLE], KANDY_CENTER, 540, "walk", "balanced");
    expect(result.feasible).toBe(true);
    expect(result.stops).toHaveLength(1);
    expect(result.stops[0]!.arrivalMinutes).toBe(558);
    expect(result.stops[0]!.departureMinutes).toBe(618);
    expect(result.stops[0]!.visitMinutes).toBe(60);
    expect(result.stops[0]!.hoursStatus).toBe("unknown");
    expect(result.endMinutes).toBe(618);
    expect(result.totalTravelMeters).toBe(1173);
  });

  it("blocks the route when a place is closed on arrival", () => {
    const closed = makePlace({
      slug: "closed",
      name: "Closed Place",
      lat: 7.2936,
      lng: 80.6413,
      openingHours: "09:00-10:00",
    });
    const result = scheduleRoute([closed], KANDY_CENTER, 660, "walk", "balanced");
    expect(result.feasible).toBe(false);
    expect(result.stops).toHaveLength(0);
    expect(result.endMinutes).toBe(660);
    expect(result.blockedBy).toContain("Closed Place is closed at 11:18");
  });

  it("keeps the completed stops when a later stop is closed", () => {
    const closed = makePlace({
      slug: "closed",
      name: "Closed Place",
      lat: 7.2961,
      lng: 80.6395,
      openingHours: "09:00-10:00",
    });
    const result = scheduleRoute([TEMPLE, closed], KANDY_CENTER, 660, "walk", "balanced");
    expect(result.feasible).toBe(false);
    expect(result.stops.map((stop) => stop.place.slug)).toEqual(["temple"]);
    expect(result.blockedBy).toContain("Closed Place is closed");
  });
});

describe("routeCost", () => {
  it("sums the estimated travel minutes", () => {
    expect(routeCost([TEMPLE], KANDY_CENTER, "walk")).toBe(18);
    expect(routeCost([TEMPLE, MUSEUM], KANDY_CENTER, "walk")).toBeGreaterThan(18);
    expect(routeCost([], KANDY_CENTER, "walk")).toBe(0);
  });
});

describe("buildGreedyOrder", () => {
  it("selects places deterministically, breaking ties by slug", () => {
    const alpha = makePlace({
      slug: "alpha",
      lat: 7.2936,
      lng: 80.6413,
      estimatedVisitMinutes: 30,
      priority: 5,
    });
    const beta = makePlace({
      slug: "beta",
      lat: 7.2936,
      lng: 80.6413,
      estimatedVisitMinutes: 30,
      priority: 5,
    });

    const first = buildGreedyOrder(
      [beta, alpha],
      BASE_OPTIONS,
      KANDY_CENTER,
      540,
      600,
      "balanced",
    );
    const second = buildGreedyOrder(
      [alpha, beta],
      BASE_OPTIONS,
      KANDY_CENTER,
      540,
      600,
      "balanced",
    );

    expect(first.map((p) => p.slug)).toEqual(["alpha"]);
    expect(second.map((p) => p.slug)).toEqual(["alpha"]);
  });

  it("does not select a stop that cannot finish before the limit", () => {
    const selected = buildGreedyOrder(
      [TEMPLE],
      BASE_OPTIONS,
      KANDY_CENTER,
      540,
      600,
      "balanced",
    );
    expect(selected).toHaveLength(0);
  });

  it("keeps a feasible initial sequence and appends from the rest", () => {
    const selected = buildGreedyOrder(
      [MUSEUM, VIEWPOINT],
      BASE_OPTIONS,
      KANDY_CENTER,
      540,
      900,
      "balanced",
      [TEMPLE],
    );
    expect(selected[0]!.slug).toBe("temple");
    expect(selected.length).toBeGreaterThan(1);
  });

  it("drops an infeasible initial sequence", () => {
    const closed = makePlace({
      slug: "closed",
      name: "Closed Place",
      lat: 7.2936,
      lng: 80.6413,
      openingHours: "09:00-10:00",
    });
    const selected = buildGreedyOrder(
      [MUSEUM],
      BASE_OPTIONS,
      KANDY_CENTER,
      660,
      900,
      "balanced",
      [closed],
    );
    expect(selected.some((p) => p.slug === "closed")).toBe(false);
  });
});

describe("improveOrderTwoOpt", () => {
  it("preserves the stop set and feasibility", () => {
    const sequence = [TEMPLE, MUSEUM, VIEWPOINT];
    const improved = improveOrderTwoOpt(
      sequence,
      KANDY_CENTER,
      "walk",
      "balanced",
      540,
      900,
    );
    expect(improved.map((p) => p.slug).sort()).toEqual(
      sequence.map((p) => p.slug).sort(),
    );
    expect(scheduleRoute(improved, KANDY_CENTER, 540, "walk", "balanced").feasible).toBe(
      true,
    );
  });

  it("returns short sequences unchanged", () => {
    expect(improveOrderTwoOpt([TEMPLE], KANDY_CENTER, "walk", "balanced", 540, 900)).toEqual([
      TEMPLE,
    ]);
  });
});

describe("insertMealStop", () => {
  it("inserts a food stop when one fits", () => {
    const result = insertMealStop(
      [TEMPLE, MUSEUM],
      [CAFE],
      KANDY_CENTER,
      "walk",
      "balanced",
      540,
      900,
    );
    expect(result.inserted?.slug).toBe("cafe");
    expect(result.sequence.map((p) => p.slug)).toContain("cafe");
  });

  it("does not add a second food stop", () => {
    const sequence = [TEMPLE, CAFE];
    const result = insertMealStop(
      sequence,
      [CAFE],
      KANDY_CENTER,
      "walk",
      "balanced",
      540,
      900,
    );
    expect(result.inserted).toBeNull();
    expect(result.sequence).toBe(sequence);
  });

  it("does nothing when there are no meal candidates", () => {
    const result = insertMealStop(
      [TEMPLE],
      [],
      KANDY_CENTER,
      "walk",
      "balanced",
      540,
      900,
    );
    expect(result.inserted).toBeNull();
    expect(result.sequence).toEqual([TEMPLE]);
  });
});

describe("helpers", () => {
  it("sorts by proximity", () => {
    const sorted = sortByProximity([TEMPLE, VIEWPOINT, MUSEUM], KANDY_CENTER);
    expect(sorted[0]!.slug).toBe("museum");
    expect(sorted).toHaveLength(3);
    const distances = sorted.map((place) => distanceMeters(KANDY_CENTER, place));
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it("parses start times with a fallback", () => {
    expect(parseStartTime("07:15")).toBe(435);
    expect(parseStartTime("not-a-time", 600)).toBe(600);
    expect(parseStartTime("")).toBe(540);
  });

  it("turns category slugs into labels", () => {
    expect(interestLabel("viewpoint")).toBe("Viewpoint");
    expect(interestLabel("heritage")).toBe("Heritage");
  });
});
