import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { getPlaceById, removePlace, savePlace } from "@/lib/db";
import { placeWriteSchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/utils/slug";

export const dynamic = "force-dynamic";

async function guard() {
  try {
    await requireAdmin();
    return null;
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await context.params;

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

  const existing = await getPlaceById(id);
  if (!existing) return Response.json({ error: "Place not found." }, { status: 404 });

  const saved = await savePlace({
    ...parsed.data,
    id,
    slug: slugify(parsed.data.slug || parsed.data.name),
  });
  return Response.json({ place: saved });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await context.params;
  const removed = await removePlace(id);
  if (!removed) return Response.json({ error: "Place not found." }, { status: 404 });
  return Response.json({ ok: true });
}
