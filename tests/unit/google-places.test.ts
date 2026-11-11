// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearGooglePlacesCache,
  fetchNearbyGooglePlaces,
  normalizeGooglePlace,
} from "@/lib/maps/google-places";

const center = { lat: 7.2906, lng: 80.6337 };

beforeEach(() => {
  clearGooglePlacesCache();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("normalizeGooglePlace", () => {
  it("maps a complete Google record and computes distance", () => {
    const place = normalizeGooglePlace(
      {
        id: "places/abc",
        displayName: { text: "Kandy Lake" },
        formattedAddress: "Kandy, Sri Lanka",
        location: { latitude: 7.291, longitude: 80.634 },
        rating: 4.6,
        userRatingCount: 1200,
        googleMapsUri: "https://maps.google.com/?cid=1",
        types: ["tourist_attraction"],
        currentOpeningHours: { openNow: true },
      },
      center,
    );

    expect(place).toMatchObject({
      id: "places/abc",
      name: "Kandy Lake",
      address: "Kandy, Sri Lanka",
      rating: 4.6,
      userRatingCount: 1200,
      openNow: true,
      googleMapsUri: "https://maps.google.com/?cid=1",
    });
    expect(place?.distanceMeters).toBeGreaterThan(0);
  });

  it("does not invent a name or coordinate for incomplete records", () => {
    expect(
      normalizeGooglePlace({ id: "places/no-name", location: { latitude: 7.29, longitude: 80.63 } }, center),
    ).toBeNull();
    expect(
      normalizeGooglePlace({ id: "places/no-location", displayName: { text: "Somewhere" } }, center),
    ).toBeNull();
  });
});

describe("fetchNearbyGooglePlaces", () => {
  it("returns an explicit unavailable state without a key", async () => {
    vi.stubEnv("GOOGLE_MAPS_SERVER_API_KEY", "");

    const result = await fetchNearbyGooglePlaces(center);

    expect(result.source).toBe("unavailable");
    expect(result.places).toEqual([]);
    expect(result.warning).toMatch(/not configured/i);
  });

  it("normalises live Google results", async () => {
    vi.stubEnv("GOOGLE_MAPS_SERVER_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          places: [
            {
              id: "places/abc",
              displayName: { text: "Kandy Lake" },
              formattedAddress: "Kandy, Sri Lanka",
              location: { latitude: 7.291, longitude: 80.634 },
              rating: 4.6,
              userRatingCount: 1200,
              googleMapsUri: "https://maps.google.com/?cid=1",
              types: ["tourist_attraction"],
              currentOpeningHours: { openNow: true },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNearbyGooglePlaces(center);

    expect(result.source).toBe("google_places");
    expect(result.places).toHaveLength(1);
    expect(result.places[0]?.name).toBe("Kandy Lake");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places:searchNearby",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-Goog-Api-Key": "test-key" }),
      }),
    );
  });

  it("degrades to an unavailable state on an upstream error", async () => {
    vi.stubEnv("GOOGLE_MAPS_SERVER_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    const result = await fetchNearbyGooglePlaces(center);

    expect(result.source).toBe("unavailable");
    expect(result.places).toEqual([]);
    expect(result.warning).toMatch(/unavailable/i);
  });
});
