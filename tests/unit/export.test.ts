import { describe, expect, it } from "vitest";
import { itineraryToIcs, itineraryToMarkdown } from "@/lib/planner/export";
import type { Itinerary, ItineraryStop } from "@/lib/planner/types";
import { makePlace } from "../fixtures/place";

function makeStop({
  name,
  ...overrides
}: Partial<ItineraryStop> & { name: string }): ItineraryStop {
  return {
    place: makePlace({
      slug: name.toLowerCase().replace(/[^a-z]+/g, "-"),
      name,
      address: "Kandy, Sri Lanka",
    }),
    order: 1,
    arrivalMinutes: 558,
    departureMinutes: 618,
    visitMinutes: 60,
    travel: { meters: 1173, minutes: 18, source: "estimate" },
    costLkr: null,
    costKnown: false,
    hoursStatus: "unknown",
    warnings: [],
    ...overrides,
  };
}

function makeItinerary(stops: ItineraryStop[]): Itinerary {
  return {
    id: "itin_test",
    stops,
    start: { lat: 7.2906, lng: 80.6337, label: "Kandy city centre" },
    startTime: "09:00",
    endTime: "11:00",
    mode: "walk",
    totals: {
      visitMinutes: stops.reduce((sum, stop) => sum + stop.visitMinutes, 0),
      travelMinutes: stops.reduce((sum, stop) => sum + stop.travel.minutes, 0),
      totalMinutes: 120,
      travelMeters: 1173,
      knownEntryCostLkr: 0,
      unknownEntryCostCount: stops.length,
      mealCostLkr: 0,
      transportCostLkr: 0,
      estimatedTotalLkr: 0,
    },
    assumptions: [],
    warnings: [],
    alternatives: [],
    budgetLkr: null,
    budgetStatus: "unknown",
    generatedAt: "2026-11-11T08:00:00.000Z",
  };
}

describe("itineraryToIcs", () => {
  const itinerary = makeItinerary([
    makeStop({ name: "Temple, Tooth; Kandy" }),
    makeStop({
      name: "Café\nStop",
      order: 2,
      arrivalMinutes: 640,
      departureMinutes: 700,
      travel: { meters: 800, minutes: 12, source: "routes_api" },
    }),
  ]);

  const ics = itineraryToIcs(itinerary, new Date("2026-11-11T00:00:00"));

  it("produces a CRLF calendar with one event per stop", () => {
    expect(ics).toContain("\r\n");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(2);
  });

  it("uses the itinerary date and start time", () => {
    expect(ics).toContain("DTSTART:20261111T091800");
    expect(ics).toContain("DTEND:20261111T101800");
    expect(ics).toContain("DTSTART:20261111T104000");
  });

  it("escapes commas, semicolons and newlines", () => {
    expect(ics).toContain("SUMMARY:Temple\\, Tooth\\; Kandy");
    expect(ics).toContain("SUMMARY:Café\\nStop");
  });

  it("describes live routes differently from estimates", () => {
    expect(ics).toContain("live route");
    expect(ics).toContain("estimate");
  });

  it("includes the calendar name and unique event ids", () => {
    expect(ics).toContain("X-WR-CALNAME:KandyVerse · 09:00 plan");
    expect(ics).toContain("UID:itin_test-0@kandyverse.local");
    expect(ics).toContain("UID:itin_test-1@kandyverse.local");
  });
});

describe("itineraryToMarkdown", () => {
  const itinerary = makeItinerary([
    makeStop({ name: "Temple, Tooth; Kandy" }),
    makeStop({
      name: "Café Stop",
      order: 2,
      arrivalMinutes: 640,
      departureMinutes: 700,
      travel: { meters: 800, minutes: 12, source: "routes_api" },
    }),
  ]);

  const markdown = itineraryToMarkdown(itinerary);

  it("writes a headed, numbered plan", () => {
    expect(markdown).toContain("# KandyVerse plan · 09:00–11:00");
    expect(markdown).toContain("Starting at **Kandy city centre**. Mode: walk.");
    expect(markdown).toContain(
      "1. **09:18–10:18** · Temple, Tooth; Kandy (18 min travel, estimate)",
    );
    expect(markdown).toContain(
      "2. **10:40–11:40** · Café Stop (12 min travel, live route)",
    );
  });

  it("includes totals and an honesty disclaimer", () => {
    expect(markdown).toMatch(/_Totals: 120 min · 30 min travelling · LKR 0 estimated\._/);
    expect(markdown).toContain(
      "_Times and travel are estimates. Verify opening hours before travelling._",
    );
  });
});
