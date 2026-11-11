import type { NextRequest } from "next/server";
import { listPlaces } from "@/lib/db";
import { searchPlaces } from "@/lib/db/search";
import type { CategorySlug } from "@/types/place";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q") ?? "";
  const categoryParam = params.get("category");
  const categories = categoryParam
    ? (categoryParam.split(",").filter(Boolean) as CategorySlug[])
    : undefined;
  const nearLat = Number(params.get("lat"));
  const nearLng = Number(params.get("lng"));
  const radius = Number(params.get("radius"));
  const limit = Math.min(200, Math.max(1, Number(params.get("limit")) || 60));

  const places = await listPlaces();
  const results = searchPlaces(places, {
    q,
    categories,
    near:
      Number.isFinite(nearLat) && Number.isFinite(nearLng)
        ? { lat: nearLat, lng: nearLng }
        : undefined,
    maxDistanceMeters: Number.isFinite(radius) && radius > 0 ? radius : undefined,
    limit,
  });

  return Response.json(
    {
      count: results.length,
      total: places.length,
      places: results.map((place) => ({
        ...place,
        distanceMeters: Number.isFinite(place.distanceMeters)
          ? Math.round(place.distanceMeters)
          : null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
