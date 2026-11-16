import type { NextRequest } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { databaseConfigured } from "@/lib/db/client";
import { listModerationEvents } from "@/lib/reports/service";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
  if (!databaseConfigured()) {
    return Response.json({ error: "Database not configured." }, { status: 503 });
  }
  const { id } = await params;
  try {
    const events = await listModerationEvents(id);
    return Response.json({ events, count: events.length });
  } catch (error) {
    console.error("[admin reports] history failed", error);
    return Response.json({ error: "Could not load moderation history." }, { status: 500 });
  }
}
