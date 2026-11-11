import type { NextRequest } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { listPlaces, savePlace } from "@/lib/db";
import { placeWriteSchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/utils/slug";
import type { Place } from "@/types/place";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
  const places = await listPlaces();
  return Response.json({ places, count: places.length });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = placeWriteSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Place validation failed.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const candidate = parsed.data;
  const existing = await listPlaces();
  const slug = slugify(candidate.slug || candidate.name);
  const duplicate = existing.find((p) => p.slug === slug && p.id !== candidate.id);
  if (duplicate) {
    return Response.json({ error: "Another place already uses this slug." }, { status: 409 });
  }

  const place: Place = {
    ...candidate,
    id: candidate.id || `plc-${slug}`,
    slug,
  };
  const saved = await savePlace(place);
  return Response.json({ place: saved }, { status: 201 });
}
