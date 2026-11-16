import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { clientKey, rateLimit } from "@/lib/utils/rate-limit";
import { reportSubmissionSchema } from "@/lib/validation/schemas";
import { createReport, listReportsForPlace, listRecentReports, voterHashFromRequest } from "@/lib/reports/service";
import { getPlaceBySlug } from "@/lib/db";
import { databaseConfigured } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const placeSlug = request.nextUrl.searchParams.get("place");
  const recent = request.nextUrl.searchParams.get("recent") === "1" || request.nextUrl.searchParams.get("recent") === "true";
  try {
    if (!placeSlug) {
      if (!recent) {
        return Response.json({ reports: [], warning: "Missing place query parameter." }, { status: 400 });
      }
      const reports = await listRecentReports(60);
      return Response.json({
        reports,
        configured: databaseConfigured(),
        warning: databaseConfigured() ? undefined : "Community reporting database is not configured. Apply migrations and set DATABASE_URL to enable submissions.",
      });
    }
    const reports = await listReportsForPlace(placeSlug, 40);
    return Response.json({
      reports,
      configured: databaseConfigured(),
      warning: databaseConfigured() ? undefined : "Community reporting database is not configured. Apply migrations and set DATABASE_URL to enable submissions.",
    });
  } catch (error) {
    console.error("[reports] list failed", error);
    return Response.json({ reports: [], error: "Could not load reports." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rl = rateLimit(clientKey(request, "reports:submit"), 8, 10 * 60 * 1000);
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many reports submitted recently. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))) } },
    );
  }
  if (!databaseConfigured()) {
    return Response.json({ error: "Community reporting is not configured because the database is unavailable." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = reportSubmissionSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid report payload.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const place = await getPlaceBySlug(parsed.data.placeSlug);
    if (!place) return Response.json({ error: "Destination not found." }, { status: 404 });

    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    const ua = h.get("user-agent");
    const reporterHash = voterHashFromRequest(ip, ua, null);

    const report = await createReport({
      ...parsed.data,
      imagePath: parsed.data.imagePath ?? null,
      reporterHash,
      reporterUserId: null,
    });
    return Response.json({ report }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("similar report")) {
      return Response.json({ error: message }, { status: 409 });
    }
    console.error("[reports] create failed", error);
    return Response.json({ error: "Could not submit report." }, { status: 500 });
  }
}
