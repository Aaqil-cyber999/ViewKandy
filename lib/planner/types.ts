import type { CategorySlug, Place } from "@/types/place";

export type TravelMode = "walk" | "drive";
export type Pace = "relaxed" | "balanced" | "fast";
export type GroupType = "solo" | "couple" | "family" | "friends";

export interface PlannerPreferences {
  startPlaceSlug: string | null;
  start: { lat: number; lng: number; label: string };
  /** HH:MM local time. */
  startTime: string;
  availableMinutes: number;
  interests: CategorySlug[];
  budgetLkr: number | null;
  travelMode: TravelMode;
  pace: Pace;
  includeMeal: boolean;
  accessibilityNeeded: boolean;
  groupType: GroupType;
  groupSize: number;
  /** Places the traveller explicitly pinned; included when feasible. */
  mustIncludeSlugs?: string[];
}

export interface TravelLeg {
  meters: number;
  minutes: number;
  source: "estimate" | "routes_api";
}

export interface ItineraryStop {
  place: Place;
  order: number;
  arrivalMinutes: number;
  departureMinutes: number;
  visitMinutes: number;
  travel: TravelLeg;
  costLkr: number | null;
  costKnown: boolean;
  hoursStatus: "open" | "closed" | "unknown";
  warnings: string[];
}

export interface ItineraryTotals {
  visitMinutes: number;
  travelMinutes: number;
  totalMinutes: number;
  travelMeters: number;
  knownEntryCostLkr: number;
  unknownEntryCostCount: number;
  mealCostLkr: number;
  transportCostLkr: number;
  estimatedTotalLkr: number;
}

export interface Itinerary {
  id: string;
  stops: ItineraryStop[];
  start: { lat: number; lng: number; label: string };
  startTime: string;
  endTime: string;
  mode: TravelMode;
  totals: ItineraryTotals;
  assumptions: string[];
  warnings: string[];
  alternatives: Place[];
  budgetLkr: number | null;
  budgetStatus: "within" | "over" | "unknown";
  generatedAt: string;
}
