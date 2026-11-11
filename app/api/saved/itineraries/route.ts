import type { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/supabase-server";
import { savedItinerarySchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

async function context() {
  const { client, user } = await getAuthenticatedUser();
  if (!client) {
    return {
      error: Response.json({ error: "Supabase is not configured." }, { status: 503 }),
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
    .from("itineraries")
    .select("id, title, data, created_at")
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(
    { itineraries: data ?? [] },
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
  const parsed = savedItinerarySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid itinerary payload." }, { status: 400 });
  }

  const { error } = await ctx.client.from("itineraries").upsert(
    {
      id: parsed.data.id,
      user_id: ctx.user.id,
      title: parsed.data.title,
      data: parsed.data.itinerary,
    },
    { onConflict: "id" },
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "Missing itinerary id." }, { status: 400 });

  const { error } = await ctx.client
    .from("itineraries")
    .delete()
    .eq("user_id", ctx.user.id)
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
