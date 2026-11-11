import { describe, expect, it } from "vitest";
import { seedCategories, seedPlaces, seedTours } from "@/lib/data";
import { isInsideKandy } from "@/lib/geo/distance";

describe("seed catalogue integrity", () => {
  it("contains the documented number of records", () => {
    expect(seedCategories).toHaveLength(12);
    expect(seedPlaces).toHaveLength(34);
    expect(seedTours).toHaveLength(5);
  });

  it("has unique ids and slugs", () => {
    expect(new Set(seedPlaces.map((place) => place.id)).size).toBe(seedPlaces.length);
    expect(new Set(seedPlaces.map((place) => place.slug)).size).toBe(seedPlaces.length);
    expect(new Set(seedCategories.map((category) => category.slug)).size).toBe(
      seedCategories.length,
    );
  });

  it("keeps every place inside the Kandy bounding box", () => {
    for (const place of seedPlaces) {
      expect(isInsideKandy(place.lat, place.lng), place.slug).toBe(true);
    }
  });

  it("only references categories that exist", () => {
    const slugs = new Set(seedCategories.map((category) => category.slug));
    for (const place of seedPlaces) {
      expect(slugs.has(place.category), place.slug).toBe(true);
    }
  });

  it("never ships invented hours, fees, phones, ratings or photos", () => {
    for (const place of seedPlaces) {
      expect(place.verification.status, place.slug).toBe("unverified");
      expect(place.verification.source.length, place.slug).toBeGreaterThan(0);
      expect(place.verification.sourceUrl, place.slug).toBeNull();
      expect(place.verification.lastVerifiedAt, place.slug).toBeNull();
      expect(place.openingHours, place.slug).toBeNull();
      expect(place.entryFeeLkr, place.slug).toBeNull();
      expect(place.phone, place.slug).toBeNull();
      expect(place.images ?? [], place.slug).toHaveLength(0);
      expect(["approximate", "district"], place.slug).toContain(
        place.locationAccuracy,
      );
    }
  });

  it("has positive visit durations and finite priorities", () => {
    for (const place of seedPlaces) {
      expect(place.estimatedVisitMinutes, place.slug).toBeGreaterThan(0);
      expect(Number.isFinite(place.priority), place.slug).toBe(true);
    }
  });

  it("points every tour stop at a real place", () => {
    const slugs = new Set(seedPlaces.map((place) => place.slug));
    for (const tour of seedTours) {
      expect(tour.stops.length, tour.slug).toBeGreaterThan(0);
      for (const stop of tour.stops) {
        expect(slugs.has(stop.placeSlug), `${tour.slug}: ${stop.placeSlug}`).toBe(true);
        expect(stop.dwellSeconds).toBeGreaterThan(0);
        expect(stop.range).toBeGreaterThan(0);
      }
    }
  });
});
