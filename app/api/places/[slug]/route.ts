import { getPlaceBySlug, listPlaces } from "@/lib/db";
import { findNearby } from "@/lib/db/search";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const place = await getPlaceBySlug(slug);
  if (!place) {
    return Response.json({ error: "Place not found." }, { status: 404 });
  }
  const nearby = findNearby(await listPlaces(), place, 1500, undefined, 6).filter(
    (p) => p.slug !== place.slug,
  );

  return Response.json({ place, nearby });
}
