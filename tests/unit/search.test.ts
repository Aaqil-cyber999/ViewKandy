import { describe, expect, it } from "vitest";
import { findNearby, searchPlaces } from "@/lib/db/search";
import { makePlace } from "../fixtures/place";

const TEMPLE = makePlace({
  slug: "temple-of-the-tooth",
  name: "Temple of the Tooth",
  category: "religious",
  tags: ["temple", "sacred", "buddhism"],
  priority: 10,
  lat: 7.2936,
  lng: 80.6413,
});

const LAKE = makePlace({
  slug: "kandy-lake",
  name: "Kandy Lake",
  category: "nature",
  tags: ["lake", "walk"],
  priority: 8,
  lat: 7.2906,
  lng: 80.6337,
});

const CAFE = makePlace({
  slug: "cafe-kandy",
  name: "Café Kandy",
  category: "food",
  tags: ["coffee"],
  priority: 2,
  indoor: true,
  featured: true,
  lat: 7.3001,
  lng: 80.6301,
});

const MUSEUM = makePlace({
  slug: "national-museum",
  name: "National Museum",
  category: "museum",
  tags: ["history"],
  priority: 5,
  indoor: true,
  lat: 7.2961,
  lng: 80.6395,
});

const PLACES = [TEMPLE, LAKE, CAFE, MUSEUM];
const CENTER = { lat: 7.2906, lng: 80.6337 };

describe("searchPlaces", () => {
  it("returns every place for an empty query, ordered by priority", () => {
    const results = searchPlaces(PLACES);
    expect(results).toHaveLength(4);
    expect(results.map((place) => place.slug)).toEqual([
      "temple-of-the-tooth",
      "kandy-lake",
      "national-museum",
      "cafe-kandy",
    ]);
  });

  it("matches names, tags and summaries", () => {
    expect(searchPlaces(PLACES, { q: "temple" }).map((p) => p.slug)).toEqual([
      "temple-of-the-tooth",
    ]);
    expect(searchPlaces(PLACES, { q: "walk" }).map((p) => p.slug)).toEqual([
      "kandy-lake",
    ]);
  });

  it("normalises accents", () => {
    expect(searchPlaces(PLACES, { q: "cafe" }).map((p) => p.slug)).toEqual([
      "cafe-kandy",
    ]);
  });

  it("requires every token in multi-word queries", () => {
    expect(searchPlaces(PLACES, { q: "national museum" }).map((p) => p.slug)).toEqual([
      "national-museum",
    ]);
    expect(searchPlaces(PLACES, { q: "national lake" })).toHaveLength(0);
  });

  it("returns nothing for an unknown query", () => {
    expect(searchPlaces(PLACES, { q: "zzzz" })).toHaveLength(0);
  });

  it("filters by category", () => {
    expect(
      searchPlaces(PLACES, { categories: ["religious"] }).map((p) => p.slug),
    ).toEqual(["temple-of-the-tooth"]);
  });

  it("filters indoor and featured places", () => {
    expect(searchPlaces(PLACES, { indoorOnly: true }).map((p) => p.slug)).toEqual([
      "national-museum",
      "cafe-kandy",
    ]);
    expect(searchPlaces(PLACES, { featuredOnly: true }).map((p) => p.slug)).toEqual([
      "cafe-kandy",
    ]);
  });

  it("adds distances and applies a radius", () => {
    const results = searchPlaces(PLACES, { near: CENTER, maxDistanceMeters: 500 });
    expect(results.map((p) => p.slug)).toEqual(["kandy-lake"]);
    expect(results[0]!.distanceMeters).toBeCloseTo(0, 6);
  });

  it("respects the result limit", () => {
    expect(searchPlaces(PLACES, { limit: 2 })).toHaveLength(2);
  });

  it("does not mutate the input order", () => {
    const original = [...PLACES];
    searchPlaces(PLACES, { q: "kandy" });
    expect(PLACES).toEqual(original);
  });
});

describe("findNearby", () => {
  it("returns places inside the radius, nearest first", () => {
    const results = findNearby(PLACES, CENTER, 1000);
    expect(results.map((p) => p.slug)).toEqual([
      "kandy-lake",
      "national-museum",
      "temple-of-the-tooth",
    ]);
    expect(results[0]!.distanceMeters).toBeCloseTo(0, 6);
  });

  it("filters by category and limit", () => {
    expect(findNearby(PLACES, CENTER, 5000, ["religious"]).map((p) => p.slug)).toEqual([
      "temple-of-the-tooth",
    ]);
    expect(findNearby(PLACES, CENTER, 5000, undefined, 1).map((p) => p.slug)).toEqual([
      "kandy-lake",
    ]);
  });

  it("returns nothing for a tiny radius away from every place", () => {
    expect(findNearby(PLACES, { lat: 7.4, lng: 80.8 }, 10)).toHaveLength(0);
  });
});
