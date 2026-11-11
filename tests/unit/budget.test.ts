import { describe, expect, it } from "vitest";
import {
  COST_ASSUMPTIONS,
  budgetStatus,
  estimateMealCostLkr,
  estimateTransportCostLkr,
  summariseBudget,
} from "@/lib/planner/budget";

describe("estimateTransportCostLkr", () => {
  it("charges nothing for walking", () => {
    expect(estimateTransportCostLkr(5000, "walk", 4)).toBe(0);
  });

  it("uses the tuk-tuk rate for driving", () => {
    expect(estimateTransportCostLkr(1000, "drive", 1)).toBe(
      COST_ASSUMPTIONS.tukTukPerKmLkr,
    );
  });

  it("adds a vehicle for groups larger than three", () => {
    expect(estimateTransportCostLkr(2000, "drive", 4)).toBe(480);
    expect(estimateTransportCostLkr(2000, "drive", 7)).toBe(720);
  });

  it("rounds to whole rupees", () => {
    expect(estimateTransportCostLkr(1234, "drive", 1)).toBe(148);
  });
});

describe("estimateMealCostLkr", () => {
  it("charges at least one meal", () => {
    expect(estimateMealCostLkr(0)).toBe(1200);
    expect(estimateMealCostLkr(1)).toBe(1200);
  });

  it("multiplies by group size", () => {
    expect(estimateMealCostLkr(3)).toBe(3600);
  });
});

describe("summariseBudget", () => {
  it("sums known entry fees and counts unknown ones", () => {
    const summary = summariseBudget({
      entryCosts: [1000, null, 500],
      travelMeters: 2000,
      mode: "walk",
      groupSize: 2,
      includeMeal: true,
    });

    expect(summary.knownEntryCostLkr).toBe(1500);
    expect(summary.unknownEntryCostCount).toBe(1);
    expect(summary.mealCostLkr).toBe(2400);
    expect(summary.transportCostLkr).toBe(0);
    expect(summary.estimatedTotalLkr).toBe(3900);
  });

  it("includes driving transport and skips meals when not requested", () => {
    const summary = summariseBudget({
      entryCosts: [],
      travelMeters: 2000,
      mode: "drive",
      groupSize: 4,
      includeMeal: false,
    });

    expect(summary.mealCostLkr).toBe(0);
    expect(summary.transportCostLkr).toBe(480);
    expect(summary.estimatedTotalLkr).toBe(480);
  });
});

describe("budgetStatus", () => {
  it("is unknown when no budget was set", () => {
    expect(budgetStatus(5000, null, 0)).toBe("unknown");
  });

  it("is over when the estimate exceeds the budget", () => {
    expect(budgetStatus(6000, 5000, 0)).toBe("over");
  });

  it("is unknown when an entry fee is missing", () => {
    expect(budgetStatus(4000, 5000, 1)).toBe("unknown");
  });

  it("is within when the estimate fits and all fees are known", () => {
    expect(budgetStatus(4000, 5000, 0)).toBe("within");
    expect(budgetStatus(5000, 5000, 0)).toBe("within");
  });
});
