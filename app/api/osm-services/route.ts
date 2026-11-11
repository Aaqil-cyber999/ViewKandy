import type { NextRequest } from "next/server";
import { fetchNearbyOsmServices } from "@/lib/maps/overpass";
import { osmServicesQuerySchema } from "@/lib/validation/schemas";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = rateLimit(clientKey(request, "osm-services"), 10, 60_000);
  if (!limited.allowed) return tooManyRequests(limited);

  const parsed = osmServicesQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid OpenStreetMap services query.",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const result = await fetchNearbyOsmServices(
    { lat: parsed.data.lat, lng: parsed.data.lng },
    parsed.data.radius,
  );

  return Response.json(result, {
    status: result.source === "unavailable" ? 503 : 200,
    headers: {
      "Cache-Control":
        result.source === "unavailable"
          ? "no-store"
          : "public, s-maxage=600, stale-while-revalidate=1200",
    },
  });
}
