// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOsmServicesCache,
  fetchNearbyOsmServices,
  normalizeOsmElement,
} from "@/lib/maps/overpass";

const center = { lat: 7.2906, lng: 80.6337 };

beforeEach(() => {
  clearOsmServicesCache();
  vi.unstubAllGlobals();
});

describe("normalizeOsmElement", () => {
  it("maps a named OSM node with a category and distance", () => {
    const service = normalizeOsmElement(
      {
        type: "node",
        id: 123,
        lat: 7.291,
        lon: 80.634,
        tags: {
          amenity: "atm",
          name: "City ATM",
          "addr:street": "Temple Street",
          "addr:housenumber": "12",
          opening_hours: "24/7",
          phone: "+94 81 000 0000",
        },
      },
      center,
    );

    expect(service).toMatchObject({
      id: "node/123",
      name: "City ATM",
      category: "ATM",
      address: "12 Temple Street",
      openingHours: "24/7",
      phone: "+94 81 000 0000",
      osmUrl: "https://www.openstreetmap.org/node/123",
    });
    expect(service?.distanceMeters).toBeGreaterThan(0);
  });

  it("labels unnamed services without inventing a name", () => {
    const service = normalizeOsmElement(
      { type: "node", id: 456, lat: 7.29, lon: 80.63, tags: { amenity: "toilets" } },
      center,
    );

    expect(service?.name).toBe("Public toilets (unnamed in OSM)");
    expect(service?.category).toBe("Public toilets");
  });

  it("ignores non-node elements and missing coordinates", () => {
    expect(normalizeOsmElement({ type: "way", id: 1 }, center)).toBeNull();
    expect(normalizeOsmElement({ type: "node", id: 2 }, center)).toBeNull();
  });
});

describe("fetchNearbyOsmServices", () => {
  it("normalises an Overpass response and keeps ODbL attribution", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          elements: [
            {
              type: "node",
              id: 123,
              lat: 7.291,
              lon: 80.634,
              tags: { amenity: "pharmacy", name: "Hill Pharmacy" },
            },
            { type: "way", id: 999, tags: { amenity: "atm" } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNearbyOsmServices(center);

    expect(result.source).toBe("openstreetmap");
    expect(result.license).toBe("ODbL");
    expect(result.services).toHaveLength(1);
    expect(result.services[0]?.name).toBe("Hill Pharmacy");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://overpass-api.de/api/interpreter",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("degrades to an explicit unavailable state on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await fetchNearbyOsmServices(center);

    expect(result.source).toBe("unavailable");
    expect(result.services).toEqual([]);
    expect(result.warning).toMatch(/unavailable/i);
  });
});
