import type { TravelMode } from "./types";

/**
 * Explicit, inspectable cost assumptions. These are ESTIMATES for planning,
 * not quotes. The UI labels them as such. Verified entry fees come from the
 * database when an admin has recorded them.
 */
export const COST_ASSUMPTIONS = {
  mealPerPersonLkr: 1200,
  tukTukPerKmLkr: 120,
  taxiPerKmLkr: 260,
  walkingCostLkr: 0,
} as const;

export function estimateTransportCostLkr(
  meters: number,
  mode: TravelMode,
  groupSize: number,
): number {
  if (mode === "walk") return 0;
  const km = meters / 1000;
  // A tuk-tuk seats up to 3 passengers; larger groups need more vehicles.
  const vehicles = Math.max(1, Math.ceil(groupSize / 3));
  return Math.round(km * COST_ASSUMPTIONS.tukTukPerKmLkr * vehicles);
}

export function estimateMealCostLkr(groupSize: number): number {
  return COST_ASSUMPTIONS.mealPerPersonLkr * Math.max(1, groupSize);
}

export interface BudgetSummary {
  knownEntryCostLkr: number;
  unknownEntryCostCount: number;
  mealCostLkr: number;
  transportCostLkr: number;
  estimatedTotalLkr: number;
}

export function summariseBudget(input: {
  entryCosts: Array<number | null>;
  travelMeters: number;
  mode: TravelMode;
  groupSize: number;
  includeMeal: boolean;
}): BudgetSummary {
  const knownEntryCostLkr = input.entryCosts.reduce<number>(
    (sum, cost) => sum + (cost ?? 0),
    0,
  );
  const unknownEntryCostCount = input.entryCosts.filter((c) => c === null).length;
  const mealCostLkr = input.includeMeal ? estimateMealCostLkr(input.groupSize) : 0;
  const transportCostLkr = estimateTransportCostLkr(
    input.travelMeters,
    input.mode,
    input.groupSize,
  );
  return {
    knownEntryCostLkr,
    unknownEntryCostCount,
    mealCostLkr,
    transportCostLkr,
    estimatedTotalLkr: knownEntryCostLkr + mealCostLkr + transportCostLkr,
  };
}

export function budgetStatus(
  estimatedTotalLkr: number,
  budgetLkr: number | null,
  unknownEntryCostCount: number,
): "within" | "over" | "unknown" {
  if (budgetLkr === null) return "unknown";
  if (estimatedTotalLkr > budgetLkr) return "over";
  if (unknownEntryCostCount > 0) return "unknown";
  return "within";
}
