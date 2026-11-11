import { describe, expect, it } from "vitest";
import { categorySchema } from "@/lib/data/schema";
import {
  adminLoginSchema,
  assistantRequestSchema,
  favoriteRequestSchema,
  plannerFormSchema,
  placeWriteSchema,
  routeRequestSchema,
  savedItinerarySchema,
} from "@/lib/validation/schemas";
import { makePlace } from "../fixtures/place";

const VALID_PLANNER = {
  startPlaceSlug: "kandy-lake",
  startTime: "09:30",
  availableMinutes: "240",
  interests: ["heritage", "food"],
  budgetEnabled: true,
  budgetLkr: "5000",
  travelMode: "walk",
  pace: "balanced",
  includeMeal: true,
  accessibilityNeeded: false,
  groupType: "couple",
  groupSize: "2",
};

describe("plannerFormSchema", () => {
  it("coerces numeric strings from form inputs", () => {
    const parsed = plannerFormSchema.parse(VALID_PLANNER);
    expect(parsed.availableMinutes).toBe(240);
    expect(parsed.budgetLkr).toBe(5000);
    expect(parsed.groupSize).toBe(2);
  });

  it("rejects malformed times", () => {
    expect(
      plannerFormSchema.safeParse({ ...VALID_PLANNER, startTime: "9:30" }).success,
    ).toBe(false);
    expect(
      plannerFormSchema.safeParse({ ...VALID_PLANNER, startTime: "24:00" }).success,
    ).toBe(false);
  });

  it("rejects plans shorter than an hour or longer than twelve hours", () => {
    expect(
      plannerFormSchema.safeParse({ ...VALID_PLANNER, availableMinutes: 30 }).success,
    ).toBe(false);
    expect(
      plannerFormSchema.safeParse({ ...VALID_PLANNER, availableMinutes: 721 }).success,
    ).toBe(false);
  });

  it("requires at least one interest and at most eight", () => {
    expect(
      plannerFormSchema.safeParse({ ...VALID_PLANNER, interests: [] }).success,
    ).toBe(false);
    expect(
      plannerFormSchema.safeParse({
        ...VALID_PLANNER,
        interests: [
          "heritage",
          "religious",
          "nature",
          "viewpoint",
          "museum",
          "experience",
          "food",
          "shopping",
          "hotel",
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects invalid group sizes and budgets", () => {
    expect(
      plannerFormSchema.safeParse({ ...VALID_PLANNER, groupSize: 0 }).success,
    ).toBe(false);
    expect(
      plannerFormSchema.safeParse({ ...VALID_PLANNER, groupSize: 21 }).success,
    ).toBe(false);
    expect(
      plannerFormSchema.safeParse({ ...VALID_PLANNER, budgetLkr: -1 }).success,
    ).toBe(false);
  });
});

describe("assistantRequestSchema", () => {
  it("trims the message", () => {
    expect(assistantRequestSchema.parse({ message: "  hello  " }).message).toBe("hello");
  });

  it("rejects empty and oversized messages", () => {
    expect(assistantRequestSchema.safeParse({ message: "   " }).success).toBe(false);
    expect(
      assistantRequestSchema.safeParse({ message: "x".repeat(2001) }).success,
    ).toBe(false);
  });

  it("limits history to eight turns", () => {
    const history = Array.from({ length: 9 }, () => ({
      role: "user" as const,
      content: "hi",
    }));
    expect(assistantRequestSchema.safeParse({ message: "hi", history }).success).toBe(
      false,
    );
    expect(
      assistantRequestSchema.safeParse({ message: "hi", history: history.slice(0, 8) })
        .success,
    ).toBe(true);
  });

  it("validates optional coordinates", () => {
    expect(
      assistantRequestSchema.safeParse({
        message: "near me",
        near: { lat: 7.29, lng: 80.63 },
      }).success,
    ).toBe(true);
    expect(
      assistantRequestSchema.safeParse({
        message: "near me",
        near: { lat: 91, lng: 80.63 },
      }).success,
    ).toBe(false);
  });
});

describe("routeRequestSchema", () => {
  it("defaults to walking", () => {
    const parsed = routeRequestSchema.parse({
      origin: { lat: 7.29, lng: 80.63 },
      destination: { lat: 7.3, lng: 80.64 },
    });
    expect(parsed.mode).toBe("walk");
  });

  it("rejects out-of-range coordinates and too many waypoints", () => {
    expect(
      routeRequestSchema.safeParse({
        origin: { lat: 91, lng: 80.63 },
        destination: { lat: 7.3, lng: 80.64 },
      }).success,
    ).toBe(false);
    expect(
      routeRequestSchema.safeParse({
        origin: { lat: 7.29, lng: 80.63 },
        destination: { lat: 7.3, lng: 80.64 },
        waypoints: Array.from({ length: 9 }, () => ({ lat: 7.3, lng: 80.64 })),
      }).success,
    ).toBe(false);
  });
});

describe("adminLoginSchema", () => {
  it("requires a valid email and a password", () => {
    expect(
      adminLoginSchema.safeParse({ email: "editor@example.com", password: "x" }).success,
    ).toBe(true);
    expect(
      adminLoginSchema.safeParse({ email: "not-an-email", password: "x" }).success,
    ).toBe(false);
    expect(
      adminLoginSchema.safeParse({ email: "editor@example.com", password: "" }).success,
    ).toBe(false);
  });
});

describe("favoriteRequestSchema", () => {
  it("accepts a slug and rejects empty or oversized values", () => {
    expect(favoriteRequestSchema.safeParse({ placeSlug: "temple" }).success).toBe(true);
    expect(favoriteRequestSchema.safeParse({ placeSlug: "" }).success).toBe(false);
    expect(
      favoriteRequestSchema.safeParse({ placeSlug: "x".repeat(141) }).success,
    ).toBe(false);
  });
});

describe("savedItinerarySchema", () => {
  it("accepts an id, title and arbitrary itinerary payload", () => {
    expect(
      savedItinerarySchema.safeParse({
        id: "itin_1",
        title: "Morning walk",
        itinerary: { stops: [] },
      }).success,
    ).toBe(true);
  });
});

describe("placeWriteSchema", () => {
  const valid = makePlace({ slug: "temple" });

  it("accepts a valid place without images", () => {
    expect(placeWriteSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invented or out-of-range facts", () => {
    expect(
      placeWriteSchema.safeParse({ ...valid, entryFeeLkr: -100 }).success,
    ).toBe(false);
    expect(placeWriteSchema.safeParse({ ...valid, lat: 91 }).success).toBe(false);
    expect(
      placeWriteSchema.safeParse({
        ...valid,
        verification: { ...valid.verification, status: "trusted" },
      }).success,
    ).toBe(false);
    expect(
      placeWriteSchema.safeParse({
        ...valid,
        verification: { ...valid.verification, sourceUrl: "not-a-url" },
      }).success,
    ).toBe(false);
    expect(
      placeWriteSchema.safeParse({
        ...valid,
        locationAccuracy: "exact",
      }).success,
    ).toBe(false);
  });
});

describe("categorySchema", () => {
  it("requires an integer order", () => {
    const category = {
      id: "cat-heritage",
      slug: "heritage",
      name: "Heritage",
      description: "Historic places",
      color: "#f59e0b",
      icon: "landmark",
      order: 1,
    };
    expect(categorySchema.safeParse(category).success).toBe(true);
    expect(categorySchema.safeParse({ ...category, order: 1.5 }).success).toBe(false);
    expect(categorySchema.safeParse({ ...category, slug: "space" }).success).toBe(false);
  });
});
