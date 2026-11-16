import { describe, expect, it } from "vitest";
import { freshnessLabel, freshnessMinutes } from "@/lib/reports/config";
import {
  reportImagePathSchema,
  reportModerationSchema,
  reportSubmissionSchema,
} from "@/lib/validation/schemas";

const VALID_REPORT = {
  placeSlug: "kandy-lake",
  category: "crowd" as const,
  issue: "Busy",
  severity: "info" as const,
  description: "The lake loop is busy with a school group this afternoon.",
};

const VALID_PATH = "reports/2026-11-16/123e4567-e89b-12d3-a456-426614174000.jpg";

describe("reportSubmissionSchema", () => {
  it("accepts a normal text report", () => {
    const parsed = reportSubmissionSchema.parse(VALID_REPORT);
    expect(parsed.issue).toBe("Busy");
    expect(parsed.severity).toBe("info");
  });

  it("accepts only storage object paths produced by the upload route", () => {
    expect(reportSubmissionSchema.safeParse({ ...VALID_REPORT, imagePath: VALID_PATH }).success).toBe(true);
    expect(reportImagePathSchema.safeParse("https://example.com/tracker.png").success).toBe(false);
    expect(reportImagePathSchema.safeParse("reports/../../etc/passwd.jpg").success).toBe(false);
    expect(reportImagePathSchema.safeParse("reports/2026-11-16/not-a-uuid.jpg").success).toBe(false);
    expect(reportImagePathSchema.safeParse("reports/2026-11-16/123e4567-e89b-12d3-a456-426614174000.gif").success).toBe(false);
  });

  it("rejects short descriptions, unknown categories and bad severity", () => {
    expect(reportSubmissionSchema.safeParse({ ...VALID_REPORT, description: "too short" }).success).toBe(false);
    expect(reportSubmissionSchema.safeParse({ ...VALID_REPORT, category: "rumour" }).success).toBe(false);
    expect(reportSubmissionSchema.safeParse({ ...VALID_REPORT, severity: "urgent" }).success).toBe(false);
  });
});

describe("reportModerationSchema", () => {
  it("requires a valid action and allows an optional reason", () => {
    expect(reportModerationSchema.safeParse({ action: "approve" }).success).toBe(true);
    expect(reportModerationSchema.safeParse({ action: "delete" }).success).toBe(false);
    expect(reportModerationSchema.safeParse({ action: "reject", reason: "No" }).success).toBe(false);
    expect(reportModerationSchema.safeParse({ action: "reject", reason: "Duplicate report" }).success).toBe(true);
  });
});

describe("report freshness", () => {
  const now = new Date();
  const iso = now.toISOString();
  const past = new Date(now.getTime() - 60_000).toISOString();
  const future = new Date(now.getTime() + 60 * 60_000).toISOString();

  it("uses short windows for crowd/road reports and keeps pricing historical", () => {
    expect(freshnessMinutes("crowd")).toBe(60);
    expect(freshnessMinutes("road_transport")).toBe(60);
    expect(freshnessMinutes("weather_environment")).toBe(90);
    expect(freshnessMinutes("pricing_experience")).toBeGreaterThan(24 * 60);
  });

  it("labels rejected, resolved, expired and approved reports distinctly", () => {
    expect(freshnessLabel(iso, future, "active", "rejected")).toBe("rejected");
    expect(freshnessLabel(iso, future, "resolved", "approved")).toBe("resolved");
    expect(freshnessLabel(iso, past, "active", "approved")).toBe("potentially_outdated");
    expect(freshnessLabel(iso, future, "active", "approved")).toBe("verified");
  });

  it("marks very recent unapproved reports as recent, then confirming", () => {
    expect(freshnessLabel(iso, future, "pending", "pending")).toBe("recent");
    const old = new Date(now.getTime() - 120 * 60_000).toISOString();
    expect(freshnessLabel(old, future, "pending", "pending")).toBe("confirming");
  });
});
