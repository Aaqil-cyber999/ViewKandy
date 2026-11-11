import { distanceMeters, formatDistance, formatDuration } from "@/lib/geo/distance";
import { TRAVEL_MODEL } from "@/lib/planner/route-optimizer";
import type { TravelMode } from "@/lib/planner/types";

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  durationLabel: string;
  distanceLabel: string;
  polyline: RoutePoint[];
  source: "google_routes" | "estimate";
  mode: TravelMode;
  warning?: string;
  navigationUrl: string;
}

/** Decodes a Google encoded polyline. */
export function decodePolyline(encoded: string): RoutePoint[] {
  const points: RoutePoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

export function googleMapsDirectionsUrl(
  origin: RoutePoint,
  destination: RoutePoint,
  mode: TravelMode,
  waypoints: RoutePoint[] = [],
): string {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destination", `${destination.lat},${destination.lng}`);
  if (waypoints.length > 0) {
    url.searchParams.set("waypoints", waypoints.map((p) => `${p.lat},${p.lng}`).join("|"));
  }
  url.searchParams.set("travelmode", mode === "walk" ? "walking" : "driving");
  return url.toString();
}

export function estimateRoute(
  origin: RoutePoint,
  destination: RoutePoint,
  mode: TravelMode,
  warning = "Estimated from straight-line distance — not a live road route.",
): RouteResult {
  const straight = distanceMeters(origin, destination);
  const model = TRAVEL_MODEL[mode];
  const meters = Math.round(straight * model.detourFactor);
  const minutes = Math.max(1, Math.round((meters / 1000 / model.speedKmh) * 60 + model.overheadMinutes));
  return {
    distanceMeters: meters,
    durationSeconds: minutes * 60,
    durationLabel: formatDuration(minutes),
    distanceLabel: formatDistance(meters),
    polyline: [origin, destination],
    source: "estimate",
    mode,
    warning,
    navigationUrl: googleMapsDirectionsUrl(origin, destination, mode),
  };
}

/**
 * Google Routes API (v2 computeRoutes). Requires a SERVER key with the Routes
 * API enabled. Never call this from the browser with the server key.
 */
export async function fetchGoogleRoute(
  origin: RoutePoint,
  destination: RoutePoint,
  mode: TravelMode,
  waypoints: RoutePoint[] = [],
): Promise<RouteResult> {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) {
    return estimateRoute(
      origin,
      destination,
      mode,
      "Google Routes API is not configured — showing a distance-based estimate. Set GOOGLE_MAPS_SERVER_API_KEY to enable road routing.",
    );
  }

  const body: Record<string, unknown> = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: {
      location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
    },
    travelMode: mode === "walk" ? "WALK" : "DRIVE",
    polylineQuality: "OVERVIEW",
    units: "METRIC",
  };
  if (waypoints.length > 0) {
    body.intermediates = waypoints.map((p) => ({
      location: { latLng: { latitude: p.lat, longitude: p.lng } },
    }));
  }

  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`[routes] Google Routes ${response.status}: ${detail.slice(0, 200)}`);
      return estimateRoute(
        origin,
        destination,
        mode,
        "Google Routes API returned an error — showing an estimate instead.",
      );
    }

    const json = (await response.json()) as {
      routes?: Array<{
        distanceMeters?: number;
        duration?: string;
        polyline?: { encodedPolyline?: string };
      }>;
    };
    const route = json.routes?.[0];
    if (!route?.distanceMeters || !route.duration) {
      return estimateRoute(origin, destination, mode, "No route returned — showing an estimate.");
    }

    const seconds = Number(route.duration.replace("s", ""));
    const encoded = route.polyline?.encodedPolyline ?? "";
    const polyline = encoded ? decodePolyline(encoded) : [origin, destination];

    return {
      distanceMeters: route.distanceMeters,
      durationSeconds: seconds,
      durationLabel: formatDuration(seconds / 60),
      distanceLabel: formatDistance(route.distanceMeters),
      polyline,
      source: "google_routes",
      mode,
      navigationUrl: googleMapsDirectionsUrl(origin, destination, mode, waypoints),
    };
  } catch (error) {
    console.error("[routes] request failed:", error);
    return estimateRoute(
      origin,
      destination,
      mode,
      "Route service unreachable — showing an estimate.",
    );
  }
}
