import { z } from "zod";
import { findNearby, searchPlaces } from "@/lib/db/search";
import { distanceMeters, formatDistance, formatDuration } from "@/lib/geo/distance";
import { generateItinerary } from "@/lib/planner/itinerary-generator";
import { estimateTravel } from "@/lib/planner/route-optimizer";
import { estimateTransportCostLkr, estimateMealCostLkr } from "@/lib/planner/budget";
import { fetchWeather, weatherAdvice } from "@/lib/weather/open-meteo";
import type { CategorySlug, Place } from "@/types/place";
import type { TravelMode } from "@/lib/planner/types";

/**
 * Whitelisted tools for the AI assistant. The model never sees SQL and never
 * gets a database connection — only these validated, read-only functions.
 */

const categoryEnum = z.enum([
  "heritage",
  "religious",
  "nature",
  "viewpoint",
  "museum",
  "experience",
  "food",
  "hotel",
  "shopping",
  "transport",
  "health",
  "services",
]);

export const toolArgsSchemas = {
  search_places: z.object({
    query: z.string().max(160).optional(),
    categories: z.array(categoryEnum).max(6).optional(),
    limit: z.number().int().min(1).max(12).optional(),
  }),
  get_place_details: z.object({ slug: z.string().max(120) }),
  find_nearby_places: z.object({
    place_slug: z.string().max(120).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    radius_m: z.number().int().min(100).max(8000).optional(),
    categories: z.array(categoryEnum).max(6).optional(),
  }),
  calculate_route: z.object({
    from_slug: z.string().max(120).optional(),
    to_slug: z.string().max(120),
    mode: z.enum(["walk", "drive"]).optional(),
  }),
  create_itinerary: z.object({
    hours: z.number().min(0.5).max(12).optional(),
    interests: z.array(categoryEnum).max(8).optional(),
    budget_lkr: z.number().min(0).max(1_000_000).optional(),
    start_slug: z.string().max(120).optional(),
    mode: z.enum(["walk", "drive"]).optional(),
    include_meal: z.boolean().optional(),
  }),
  calculate_budget: z.object({
    slugs: z.array(z.string().max(120)).min(1).max(10),
    mode: z.enum(["walk", "drive"]).optional(),
    group_size: z.number().int().min(1).max(20).optional(),
  }),
  get_weather: z.object({}),
  get_opening_hours: z.object({ slug: z.string().max(120).optional() }),
  get_nearby_services: z.object({
    place_slug: z.string().max(120).optional(),
    types: z.array(z.enum(["atm", "health", "services", "transport", "toilets"])).max(5).optional(),
  }),
} as const;

type ToolName = keyof typeof toolArgsSchemas;

const shortPlace = (p: Place) => ({
  slug: p.slug,
  name: p.name,
  category: p.category,
  summary: p.summary,
  lat: p.lat,
  lng: p.lng,
  entry_fee_lkr: p.entryFeeLkr,
  opening_hours: p.openingHours,
  verification: p.verification.status,
});

function findAnchor(places: Place[], slug?: string): Place | undefined {
  if (!slug) return undefined;
  return places.find((p) => p.slug === slug) ?? places.find((p) => p.name.toLowerCase().includes(slug.toLowerCase()));
}

export interface ToolResult {
  ok: boolean;
  data: unknown;
}

export async function executeTool(
  name: string,
  rawArgs: unknown,
  places: Place[],
): Promise<ToolResult> {
  const schema = toolArgsSchemas[name as ToolName];
  if (!schema) return { ok: false, data: { error: `Unknown tool: ${name}` } };

  const parsed = schema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    return { ok: false, data: { error: "Invalid arguments", issues: parsed.error.issues.map((i) => i.message) } };
  }
  const args = parsed.data as Record<string, unknown>;

  switch (name as ToolName) {
    case "search_places": {
      const results = searchPlaces(places, {
        q: (args.query as string | undefined) ?? "",
        categories: args.categories as CategorySlug[] | undefined,
        limit: (args.limit as number | undefined) ?? 6,
      });
      return {
        ok: true,
        data: {
          count: results.length,
          results: results.map((p) => ({ ...shortPlace(p), distance_m: Number.isFinite(p.distanceMeters) ? Math.round(p.distanceMeters) : null })),
        },
      };
    }

    case "get_place_details": {
      const place = findAnchor(places, args.slug as string);
      if (!place) return { ok: false, data: { error: "Place not found in the KandyVerse database." } };
      return {
        ok: true,
        data: {
          ...shortPlace(place),
          description: place.description,
          address: place.address,
          website: place.website,
          accessibility: place.accessibility,
          estimated_visit_minutes: place.estimatedVisitMinutes,
          best_time: place.bestTime,
          practical_notes: place.practicalNotes,
          tags: place.tags,
          source: place.verification.source,
          last_verified_at: place.verification.lastVerifiedAt,
        },
      };
    }

    case "find_nearby_places": {
      const anchor = findAnchor(places, args.place_slug as string | undefined);
      const lat = (args.lat as number | undefined) ?? anchor?.lat;
      const lng = (args.lng as number | undefined) ?? anchor?.lng;
      if (lat === undefined || lng === undefined) {
        return { ok: false, data: { error: "Provide a place_slug or lat/lng." } };
      }
      const results = findNearby(
        places,
        { lat, lng },
        (args.radius_m as number | undefined) ?? 1200,
        args.categories as CategorySlug[] | undefined,
        8,
      );
      return {
        ok: true,
        data: {
          anchor: anchor ? shortPlace(anchor) : { lat, lng },
          results: results.map((p) => ({
            ...shortPlace(p),
            distance_m: Math.round(p.distanceMeters),
            distance_label: formatDistance(p.distanceMeters),
          })),
        },
      };
    }

    case "calculate_route": {
      const to = findAnchor(places, args.to_slug as string);
      const from = findAnchor(places, args.from_slug as string | undefined);
      if (!to) return { ok: false, data: { error: "Destination not found." } };
      const origin = from ?? { lat: 7.2906, lng: 80.6337, name: "Kandy city centre" };
      const mode = ((args.mode as TravelMode | undefined) ?? "walk") as TravelMode;
      const leg = estimateTravel(origin, to, mode);
      return {
        ok: true,
        data: {
          from: from?.name ?? "Kandy city centre",
          to: to.name,
          mode,
          distance_m: leg.meters,
          distance_label: formatDistance(leg.meters),
          duration_min: leg.minutes,
          duration_label: formatDuration(leg.minutes),
          source: "estimate",
          note: "Geometric estimate, not live traffic. Use the route panel for Google Routes geometry when configured.",
        },
      };
    }

    case "create_itinerary": {
      const hours = (args.hours as number | undefined) ?? 4;
      const startSlug = (args.start_slug as string | undefined) ?? null;
      const startPlace = startSlug ? findAnchor(places, startSlug) : undefined;
      const itinerary = generateItinerary(places, {
        startPlaceSlug: startPlace?.slug ?? null,
        start: startPlace
          ? { lat: startPlace.lat, lng: startPlace.lng, label: startPlace.name }
          : { lat: 7.2906, lng: 80.6337, label: "Kandy city centre" },
        startTime: "09:00",
        availableMinutes: Math.round(hours * 60),
        interests: (args.interests as CategorySlug[] | undefined) ?? [],
        budgetLkr: (args.budget_lkr as number | undefined) ?? null,
        travelMode: ((args.mode as TravelMode | undefined) ?? "walk") as TravelMode,
        pace: "balanced",
        includeMeal: (args.include_meal as boolean | undefined) ?? hours >= 4,
        accessibilityNeeded: false,
        groupType: "couple",
        groupSize: 2,
      });
      return {
        ok: true,
        data: {
          stops: itinerary.stops.map((s) => ({
            order: s.order,
            slug: s.place.slug,
            name: s.place.name,
            arrive: s.arrivalMinutes,
            depart: s.departureMinutes,
            visit_min: s.visitMinutes,
            travel_min: s.travel.minutes,
            travel_m: s.travel.meters,
            entry_fee_lkr: s.costLkr,
            hours_status: s.hoursStatus,
          })),
          totals: itinerary.totals,
          warnings: itinerary.warnings,
          assumptions: itinerary.assumptions,
        },
      };
    }

    case "calculate_budget": {
      const selected = (args.slugs as string[])
        .map((slug) => findAnchor(places, slug))
        .filter((p): p is Place => Boolean(p));
      const known = selected.reduce((sum, p) => sum + (p.entryFeeLkr ?? 0), 0);
      const unknown = selected.filter((p) => p.entryFeeLkr === null).length;
      const groupSize = (args.group_size as number | undefined) ?? 1;
      const mode = ((args.mode as TravelMode | undefined) ?? "walk") as TravelMode;
      return {
        ok: true,
        data: {
          places: selected.map(shortPlace),
          known_entry_total_lkr: known,
          unknown_entry_fees: unknown,
          meal_estimate_lkr: estimateMealCostLkr(groupSize),
          transport_estimate_lkr: estimateTransportCostLkr(3000, mode, groupSize),
          note: "Only verified entry fees are counted. Estimates are clearly labelled.",
        },
      };
    }

    case "get_weather": {
      const weather = await fetchWeather();
      if (!weather) return { ok: false, data: { error: "Weather service unavailable." } };
      const advice = weatherAdvice(weather);
      return {
        ok: true,
        data: {
          current: {
            temp_c: weather.current.temperatureC,
            feels_like_c: weather.current.apparentC,
            condition: weather.current.condition.label,
            humidity: weather.current.humidity,
            wind_kmh: weather.current.windKmh,
          },
          next_hours: weather.hourly.slice(0, 6).map((h) => ({
            time: h.time,
            temp_c: h.temperatureC,
            rain_probability: h.precipitationProbability,
          })),
          advice,
          fetched_at: weather.fetchedAt,
          source: weather.source,
        },
      };
    }

    case "get_opening_hours": {
      const target = findAnchor(places, args.slug as string | undefined);
      const candidates = target ? [target] : places.filter((p) => p.openingHours);
      return {
        ok: true,
        data: {
          note:
            candidates.length === 0
              ? "No opening hours are verified in the database yet. Do not guess them."
              : "Only verified hours are shown.",
          places: candidates.slice(0, 8).map((p) => ({
            slug: p.slug,
            name: p.name,
            opening_hours: p.openingHours,
            verification: p.verification.status,
            website: p.website,
          })),
        },
      };
    }

    case "get_nearby_services": {
      const anchor = findAnchor(places, args.place_slug as string | undefined);
      const center = anchor ?? { lat: 7.2906, lng: 80.6337 };
      const types = (args.types as string[] | undefined) ?? ["atm", "health", "services"];
      const map: Record<string, CategorySlug[]> = {
        atm: ["services"],
        health: ["health"],
        services: ["services"],
        transport: ["transport"],
        toilets: ["services"],
      };
      const categories = [...new Set(types.flatMap((t) => map[t] ?? []))];
      const results = findNearby(places, center, 2000, categories, 8);
      return {
        ok: true,
        data: {
          anchor: anchor?.name ?? "Kandy city centre",
          results: results.map((p) => ({
            ...shortPlace(p),
            distance_label: formatDistance(distanceMeters(center, p)),
          })),
        },
      };
    }

    default:
      return { ok: false, data: { error: "Unhandled tool." } };
  }
}

/** JSON schemas in the shape expected by the OpenAI Responses API. */
export const OPENAI_TOOLS = [
  {
    type: "function" as const,
    name: "search_places",
    description:
      "Search the KandyVerse tourism database by free text and/or categories. Use this before recommending any place.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text search, e.g. 'temple history'." },
        categories: {
          type: "array",
          items: { type: "string", enum: categoryEnum.options },
        },
        limit: { type: "integer", minimum: 1, maximum: 12 },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "get_place_details",
    description: "Fetch verified and editorial details for one place by slug.",
    strict: false,
    parameters: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "find_nearby_places",
    description: "Find places within a radius of a known place or coordinate.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        place_slug: { type: "string" },
        lat: { type: "number" },
        lng: { type: "number" },
        radius_m: { type: "integer", minimum: 100, maximum: 8000 },
        categories: { type: "array", items: { type: "string", enum: categoryEnum.options } },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "calculate_route",
    description:
      "Estimate distance and travel time between two places. Returns an estimate, not live traffic.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        from_slug: { type: "string" },
        to_slug: { type: "string" },
        mode: { type: "string", enum: ["walk", "drive"] },
      },
      required: ["to_slug"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "create_itinerary",
    description:
      "Build a time-constrained itinerary using the deterministic planner. Use when the user gives a duration or asks for a plan.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        hours: { type: "number", minimum: 0.5, maximum: 12 },
        interests: { type: "array", items: { type: "string", enum: categoryEnum.options } },
        budget_lkr: { type: "number" },
        start_slug: { type: "string" },
        mode: { type: "string", enum: ["walk", "drive"] },
        include_meal: { type: "boolean" },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "calculate_budget",
    description: "Sum verified entry fees and clearly labelled estimates for a set of places.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        slugs: { type: "array", items: { type: "string" } },
        mode: { type: "string", enum: ["walk", "drive"] },
        group_size: { type: "integer", minimum: 1, maximum: 20 },
      },
      required: ["slugs"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "get_weather",
    description: "Current weather and short forecast for Kandy from Open-Meteo.",
    strict: false,
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    type: "function" as const,
    name: "get_opening_hours",
    description:
      "Look up verified opening hours. If none are recorded, say so — never invent hours.",
    strict: false,
    parameters: {
      type: "object",
      properties: { slug: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "get_nearby_services",
    description: "Find practical services (ATMs, health, transport, toilets) near a place.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        place_slug: { type: "string" },
        types: {
          type: "array",
          items: { type: "string", enum: ["atm", "health", "services", "transport", "toilets"] },
        },
      },
      additionalProperties: false,
    },
  },
];
