import { formatMinutesAsTime, formatDuration, distanceMeters } from "@/lib/geo/distance";
import type { Place } from "@/types/place";
import { budgetStatus, summariseBudget } from "./budget";
import {
  buildGreedyOrder,
  estimateTravel,
  improveOrderTwoOpt,
  insertMealStop,
  isCandidate,
  parseStartTime,
  scheduleRoute,
  scoreCandidate,
  type CandidateOptions,
} from "./route-optimizer";
import { isOpenAt, parseOpeningHours } from "./time-window";
import type { Itinerary, ItineraryStop, PlannerPreferences } from "./types";

export interface GeneratorContext {
  rainLikely?: boolean;
  now?: Date;
}

function makeId(): string {
  return `itin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function generateItinerary(
  places: Place[],
  prefs: PlannerPreferences,
  context: GeneratorContext = {},
): Itinerary {
  const startPlace = prefs.startPlaceSlug
    ? places.find((p) => p.slug === prefs.startPlaceSlug)
    : undefined;

  const start = startPlace
    ? { lat: startPlace.lat, lng: startPlace.lng, label: startPlace.name }
    : { ...prefs.start, label: prefs.start.label || "Kandy city centre" };

  const startMinutes = parseStartTime(prefs.startTime);
  const endLimit = startMinutes + Math.max(60, prefs.availableMinutes);

  const options: CandidateOptions = {
    interests: prefs.interests,
    includeMeal: prefs.includeMeal,
    accessibilityNeeded: prefs.accessibilityNeeded,
    availableMinutes: prefs.availableMinutes,
    mode: prefs.travelMode,
    rainLikely: context.rainLikely,
  };

  const candidates = places.filter(
    (p) => p.slug !== startPlace?.slug && isCandidate(p, options),
  );

  const pinnedSlugs = new Set(prefs.mustIncludeSlugs ?? []);
  const pinned = candidates
    .filter((p) => pinnedSlugs.has(p.slug))
    .sort((a, b) => distanceMeters(start, a) - distanceMeters(start, b));
  const rest = candidates.filter((p) => !pinnedSlugs.has(p.slug));

  const mealCandidates = candidates.filter((p) => p.category === "food");

  const greedy = buildGreedyOrder(
    rest,
    options,
    start,
    startMinutes,
    endLimit,
    prefs.pace,
    pinned,
  );
  const optimised = improveOrderTwoOpt(
    greedy,
    start,
    prefs.travelMode,
    prefs.pace,
    startMinutes,
    endLimit,
  );

  const withMeal = prefs.includeMeal
    ? insertMealStop(
        optimised,
        mealCandidates,
        start,
        prefs.travelMode,
        prefs.pace,
        startMinutes,
        endLimit,
      )
    : { sequence: optimised, inserted: null };

  let finalSequence = withMeal.sequence;
  let schedule = scheduleRoute(finalSequence, start, startMinutes, prefs.travelMode, prefs.pace);

  // Safety net: if the final sequence is somehow infeasible, fall back to a
  // schedule that is guaranteed to fit.
  if (!schedule.feasible) {
    finalSequence = finalSequence.slice(0, Math.max(0, finalSequence.length - 1));
    schedule = scheduleRoute(finalSequence, start, startMinutes, prefs.travelMode, prefs.pace);
  }

  const selectedSlugs = new Set(finalSequence.map((p) => p.slug));

  const stops: ItineraryStop[] = schedule.stops.map((scheduled, index) => {
    const hours = parseOpeningHours(scheduled.place.openingHours);
    const warnings: string[] = [];
    if (!hours) warnings.push("Opening hours not verified");
    if (prefs.accessibilityNeeded && !scheduled.place.accessibility) {
      warnings.push("Accessibility not documented");
    }
    if (scheduled.hoursStatus === "unknown") {
      warnings.push("Confirm it is open before travelling");
    }
    return {
      place: scheduled.place,
      order: index + 1,
      arrivalMinutes: scheduled.arrivalMinutes,
      departureMinutes: scheduled.departureMinutes,
      visitMinutes: scheduled.visitMinutes,
      travel: scheduled.travel,
      costLkr: scheduled.place.entryFeeLkr,
      costKnown: scheduled.place.entryFeeLkr !== null,
      hoursStatus: scheduled.hoursStatus,
      warnings,
    };
  });

  const budget = summariseBudget({
    entryCosts: stops.map((s) => s.costLkr),
    travelMeters: schedule.totalTravelMeters,
    mode: prefs.travelMode,
    groupSize: prefs.groupSize,
    includeMeal: prefs.includeMeal,
  });

  const totalVisit = stops.reduce((sum, s) => sum + s.visitMinutes, 0);
  const totalTravel = stops.reduce((sum, s) => sum + s.travel.minutes, 0);
  const warnings: string[] = [];

  if (stops.length === 0) {
    warnings.push(
      "No stops fit inside the selected time and interests. Try a longer window or more interests.",
    );
  }
  if (budget.unknownEntryCostCount > 0) {
    warnings.push(
      `${budget.unknownEntryCostCount} stop${budget.unknownEntryCostCount === 1 ? "" : "s"} have no verified entry fee — the total may be higher.`,
    );
  }
  const status = budgetStatus(budget.estimatedTotalLkr, prefs.budgetLkr, budget.unknownEntryCostCount);
  if (status === "over") {
    warnings.push(
      `Estimated spend is above your LKR ${prefs.budgetLkr?.toLocaleString()} budget.`,
    );
  }
  if (prefs.travelMode === "drive") {
    warnings.push(
      "Driving times include a 6-minute parking allowance per leg and do not reflect live traffic.",
    );
  }
  if (prefs.availableMinutes >= 300 && stops.length < 3) {
    warnings.push(
      "Few places matched your interests and time window. Add interests or start earlier.",
    );
  }

  const assumptions = [
    `Travel times are geometric estimates for ${prefs.travelMode === "walk" ? "walking (4.2 km/h)" : "driving (20 km/h city average)"}, including a street-detour factor — not live traffic.`,
    "Visit durations are editorial estimates adjusted for your pace.",
    "Entry fees are only included where an admin has recorded a verified amount.",
    prefs.includeMeal
      ? "Meal allowance is an estimate of LKR 1,200 per person."
      : "No meal stop is included.",
    prefs.travelMode === "drive"
      ? "Transport cost is a tuk-tuk estimate of LKR 120 per km per vehicle."
      : "Walking is assumed to have no transport cost.",
  ];

  const alternatives = candidates
    .filter((p) => !selectedSlugs.has(p.slug))
    .map((p) => ({ place: p, score: scoreCandidate(p, options, start) }))
    .sort((a, b) => b.score - a.score || a.place.slug.localeCompare(b.place.slug))
    .slice(0, 4)
    .map((entry) => entry.place);

  return {
    id: makeId(),
    stops,
    start,
    startTime: formatMinutesAsTime(startMinutes),
    endTime: formatMinutesAsTime(schedule.endMinutes),
    mode: prefs.travelMode,
    totals: {
      visitMinutes: totalVisit,
      travelMinutes: totalTravel,
      totalMinutes: schedule.endMinutes - startMinutes,
      travelMeters: schedule.totalTravelMeters,
      ...budget,
    },
    assumptions,
    warnings,
    alternatives,
    budgetLkr: prefs.budgetLkr,
    budgetStatus: status,
    generatedAt: (context.now ?? new Date()).toISOString(),
  };
}

/** Human-readable one-line summary used by the assistant and saved cards. */
export function describeItinerary(itinerary: Itinerary): string {
  if (itinerary.stops.length === 0) {
    return `No itinerary could be built for ${formatDuration(itinerary.totals.totalMinutes)}.`;
  }
  const names = itinerary.stops.map((s) => s.place.name).join(" → ");
  return `${formatDuration(itinerary.totals.totalMinutes)} · ${itinerary.stops.length} stops · ${names}`;
}

/** Recompute timing after a user reorders stops in the UI. */
export function rescheduleStops(
  itinerary: Itinerary,
  orderedSlugs: string[],
): Itinerary {
  const placeMap = new Map(itinerary.stops.map((s) => [s.place.slug, s.place]));
  const sequence = orderedSlugs
    .map((slug) => placeMap.get(slug))
    .filter((p): p is Place => Boolean(p));

  const startMinutes = parseStartTime(itinerary.startTime);
  const schedule = scheduleRoute(
    sequence,
    itinerary.start,
    startMinutes,
    itinerary.mode,
    "balanced",
  );

  const stops: ItineraryStop[] = schedule.stops.map((scheduled, index) => ({
    place: scheduled.place,
    order: index + 1,
    arrivalMinutes: scheduled.arrivalMinutes,
    departureMinutes: scheduled.departureMinutes,
    visitMinutes: scheduled.visitMinutes,
    travel: scheduled.travel,
    costLkr: scheduled.place.entryFeeLkr,
    costKnown: scheduled.place.entryFeeLkr !== null,
    hoursStatus: isOpenAt(parseOpeningHours(scheduled.place.openingHours), scheduled.arrivalMinutes),
    warnings: [],
  }));

  const budget = summariseBudget({
    entryCosts: stops.map((s) => s.costLkr),
    travelMeters: schedule.totalTravelMeters,
    mode: itinerary.mode,
    groupSize: 2,
    includeMeal: stops.some((s) => s.place.category === "food"),
  });

  return {
    ...itinerary,
    stops,
    endTime: formatMinutesAsTime(schedule.endMinutes),
    totals: {
      visitMinutes: stops.reduce((sum, s) => sum + s.visitMinutes, 0),
      travelMinutes: stops.reduce((sum, s) => sum + s.travel.minutes, 0),
      totalMinutes: schedule.endMinutes - startMinutes,
      travelMeters: schedule.totalTravelMeters,
      ...budget,
    },
    warnings: schedule.feasible
      ? itinerary.warnings
      : [...itinerary.warnings, "Some stops may fall outside verified opening hours."],
  };
}

export function totalDistanceBetweenStops(itinerary: Itinerary): number {
  let total = 0;
  let current: { lat: number; lng: number } = itinerary.start;
  for (const stop of itinerary.stops) {
    total += estimateTravel(current, stop.place, itinerary.mode).meters;
    current = stop.place;
  }
  return total;
}
