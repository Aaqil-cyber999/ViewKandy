import { distanceMeters, parseTimeToMinutes } from "@/lib/geo/distance";
import type { CategorySlug, Place } from "@/types/place";
import { isOpenAt, parseOpeningHours } from "./time-window";
import type { Pace, PlannerPreferences, TravelLeg, TravelMode } from "./types";

export const TRAVEL_MODEL = {
  walk: { speedKmh: 4.2, detourFactor: 1.3, overheadMinutes: 1, label: "walking" },
  drive: { speedKmh: 20, detourFactor: 1.35, overheadMinutes: 6, label: "driving" },
} as const;

export const PACE_MULTIPLIER: Record<Pace, number> = {
  relaxed: 1.25,
  balanced: 1,
  fast: 0.8,
};

/**
 * Geometric travel estimate. This is deliberately NOT presented as live
 * routing: it uses straight-line distance, a street-detour factor and a
 * conservative city speed. Use Google Routes API (server side) when a key is
 * configured and the user asks for real road geometry.
 */
export function estimateTravel(a: { lat: number; lng: number }, b: { lat: number; lng: number }, mode: TravelMode): TravelLeg {
  const straight = distanceMeters(a, b);
  const model = TRAVEL_MODEL[mode];
  const meters = straight * model.detourFactor;
  const minutes = (meters / 1000 / model.speedKmh) * 60 + model.overheadMinutes;
  return {
    meters: Math.round(meters),
    minutes: Math.max(1, Math.round(minutes)),
    source: "estimate",
  };
}

export function visitMinutesFor(place: Place, pace: Pace): number {
  const base = place.estimatedVisitMinutes;
  return Math.max(15, Math.round(base * PACE_MULTIPLIER[pace]));
}

export interface CandidateOptions {
  interests: CategorySlug[];
  includeMeal: boolean;
  accessibilityNeeded: boolean;
  availableMinutes: number;
  mode: TravelMode;
  rainLikely?: boolean;
}

export function isCandidate(place: Place, options: CandidateOptions): boolean {
  const allowed: CategorySlug[] = [
    "heritage",
    "religious",
    "nature",
    "viewpoint",
    "museum",
    "experience",
    "food",
    "shopping",
  ];
  if (!allowed.includes(place.category)) return false;
  if (place.category === "food" && !options.includeMeal) return false;
  if (
    options.accessibilityNeeded &&
    place.accessibility &&
    /not suitable for wheelchairs/i.test(place.accessibility)
  ) {
    return false;
  }
  return true;
}

export function scoreCandidate(
  place: Place,
  options: CandidateOptions,
  from: { lat: number; lng: number },
): number {
  let score = place.priority;
  if (options.interests.includes(place.category)) score += 45;
  if (place.featured) score += 8;
  if (options.rainLikely) score += place.indoor ? 25 : -18;
  if (options.availableMinutes <= 180 && place.estimatedVisitMinutes > 75) score -= 22;
  if (options.availableMinutes >= 300 && place.estimatedVisitMinutes < 25) score -= 6;
  if (place.category === "food" && options.includeMeal) score += 12;
  const travel = estimateTravel(from, place, options.mode);
  score -= travel.minutes * 1.1;
  return score;
}

export interface ScheduledStop {
  place: Place;
  arrivalMinutes: number;
  departureMinutes: number;
  visitMinutes: number;
  travel: TravelLeg;
  hoursStatus: "open" | "closed" | "unknown";
}

export interface ScheduleResult {
  feasible: boolean;
  stops: ScheduledStop[];
  endMinutes: number;
  totalTravelMeters: number;
  blockedBy?: string;
}

export function scheduleRoute(
  sequence: Place[],
  start: { lat: number; lng: number },
  startMinutes: number,
  mode: TravelMode,
  pace: Pace,
): ScheduleResult {
  let cursor = startMinutes;
  let current = start;
  let totalTravelMeters = 0;
  const stops: ScheduledStop[] = [];

  for (const place of sequence) {
    const travel = estimateTravel(current, place, mode);
    const arrival = cursor + travel.minutes;
    const visitMinutes = visitMinutesFor(place, pace);
    const hoursStatus = isOpenAt(parseOpeningHours(place.openingHours), arrival);
    if (hoursStatus === "closed") {
      return {
        feasible: false,
        stops,
        endMinutes: cursor,
        totalTravelMeters,
        blockedBy: `${place.name} is closed at ${formatClock(arrival)}.`,
      };
    }
    const departure = arrival + visitMinutes;
    stops.push({
      place,
      arrivalMinutes: arrival,
      departureMinutes: departure,
      visitMinutes,
      travel,
      hoursStatus,
    });
    totalTravelMeters += travel.meters;
    cursor = departure;
    current = place;
  }

  return { feasible: true, stops, endMinutes: cursor, totalTravelMeters };
}

function formatClock(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(
    normalized % 60,
  ).padStart(2, "0")}`;
}

export function routeCost(
  sequence: Place[],
  start: { lat: number; lng: number },
  mode: TravelMode,
): number {
  let cost = 0;
  let current = start;
  for (const place of sequence) {
    cost += estimateTravel(current, place, mode).minutes;
    current = place;
  }
  return cost;
}

/**
 * Greedy priority + proximity selection, then 2-opt improvement.
 * Deterministic: ties are broken by priority then slug.
 */
export function buildGreedyOrder(
  candidates: Place[],
  options: CandidateOptions,
  start: { lat: number; lng: number },
  startMinutes: number,
  endLimit: number,
  pace: Pace,
  initialSequence: Place[] = [],
): Place[] {
  const remaining = [...candidates];
  const selected: Place[] = [...initialSequence];
  const initialSchedule = scheduleRoute(initialSequence, start, startMinutes, options.mode, pace);
  let current: { lat: number; lng: number } =
    initialSequence.length > 0
      ? initialSequence[initialSequence.length - 1]!
      : start;
  let cursor = initialSchedule.feasible ? initialSchedule.endMinutes : startMinutes;

  if (!initialSchedule.feasible) {
    selected.length = 0;
    current = start;
  }

  while (remaining.length > 0) {
    const scored = remaining
      .map((place) => {
        const travel = estimateTravel(current, place, options.mode);
        const arrival = cursor + travel.minutes;
        const visit = visitMinutesFor(place, pace);
        const hours = isOpenAt(parseOpeningHours(place.openingHours), arrival);
        return {
          place,
          travel,
          arrival,
          visit,
          hours,
          score: scoreCandidate(place, options, current),
        };
      })
      .filter((c) => c.hours !== "closed" && c.arrival + c.visit <= endLimit)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.place.priority !== a.place.priority) return b.place.priority - a.place.priority;
        return a.place.slug.localeCompare(b.place.slug);
      });

    const next = scored[0];
    if (!next) break;
    selected.push(next.place);
    cursor = next.arrival + next.visit;
    current = next.place;
    remaining.splice(remaining.indexOf(next.place), 1);
  }

  return selected;
}

export function improveOrderTwoOpt(
  sequence: Place[],
  start: { lat: number; lng: number },
  mode: TravelMode,
  pace: Pace,
  startMinutes: number,
  endLimit: number,
): Place[] {
  if (sequence.length < 3) return sequence;
  let best = [...sequence];
  let bestCost = routeCost(best, start, mode);
  let improved = true;
  let guard = 0;

  while (improved && guard < 8) {
    improved = false;
    guard += 1;
    for (let i = 0; i < best.length - 1; i += 1) {
      for (let j = i + 1; j < best.length; j += 1) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const schedule = scheduleRoute(candidate, start, startMinutes, mode, pace);
        if (!schedule.feasible || schedule.endMinutes > endLimit) continue;
        const cost = routeCost(candidate, start, mode);
        if (cost < bestCost - 0.5) {
          best = candidate;
          bestCost = cost;
          improved = true;
        }
      }
    }
  }
  return best;
}

/** Insert a meal stop at the position that adds the least travel time. */
export function insertMealStop(
  sequence: Place[],
  mealCandidates: Place[],
  start: { lat: number; lng: number },
  mode: TravelMode,
  pace: Pace,
  startMinutes: number,
  endLimit: number,
): { sequence: Place[]; inserted: Place | null } {
  const alreadyHasFood = sequence.some((p) => p.category === "food");
  if (alreadyHasFood || mealCandidates.length === 0) {
    return { sequence, inserted: null };
  }

  let best: { sequence: Place[]; added: number; place: Place } | null = null;
  const baseline = scheduleRoute(sequence, start, startMinutes, mode, pace).endMinutes;

  for (const place of mealCandidates.slice(0, 12)) {
    for (let index = 0; index <= sequence.length; index += 1) {
      const candidate = [...sequence.slice(0, index), place, ...sequence.slice(index)];
      const schedule = scheduleRoute(candidate, start, startMinutes, mode, pace);
      if (!schedule.feasible || schedule.endMinutes > endLimit) continue;
      const added = schedule.endMinutes - baseline;
      if (!best || added < best.added) best = { sequence: candidate, added, place };
    }
  }

  return best
    ? { sequence: best.sequence, inserted: best.place }
    : { sequence, inserted: null };
}

export function sortByProximity(
  places: Place[],
  from: { lat: number; lng: number },
): Place[] {
  return [...places].sort(
    (a, b) => distanceMeters(from, a) - distanceMeters(from, b),
  );
}

export function parseStartTime(value: string, fallback = 9 * 60): number {
  return parseTimeToMinutes(value) ?? fallback;
}

export function interestLabel(slug: CategorySlug): string {
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export type { PlannerPreferences };
