import type { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/supabase-server";
import { favoriteRequestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

async function context() {
  const { client, user } = await getAuthenticatedUser();
  if (!client) {
    return {
      error: Response.json(
        { error: "Supabase is not configured." },
        { status: 503 },
      ),
    } as const;
  }
  if (!user) {
    return { error: Response.json({ error: "Sign in required." }, { status: 401 }) } as const;
  }
  return { client, user } as const;
}

export async function GET() {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;

  const { data, error } = await ctx.client
    .from("favorites")
    .select("place_slug, created_at")
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json(
    { favorites: (data ?? []).map((row) => row.place_slug as string) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = favoriteRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid place slug." }, { status: 400 });
  }

  const { error } = await ctx.client.from("favorites").upsert(
    {
      user_id: ctx.user.id,
      place_slug: parsed.data.placeSlug,
    },
    { onConflict: "user_id,place_slug" },
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = favoriteRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid place slug." }, { status: 400 });
  }

  const { error } = await ctx.client
    .from("favorites")
    .delete()
    .eq("user_id", ctx.user.id)
    .eq("place_slug", parsed.data.placeSlug);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
