import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { clientKey, rateLimit } from "@/lib/utils/rate-limit";
import { reportConfirmSchema } from "@/lib/validation/schemas";
import { confirmReport, voterHashFromRequest } from "@/lib/reports/service";
import { databaseConfigured } from "@/lib/db/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rl = rateLimit(clientKey(request, `reports:confirm:${id}`), 12, 10 * 60 * 1000);
  if (!rl.allowed) {
    return Response.json({ error: "Too many confirmation attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))) } });
  }
  if (!databaseConfigured()) {
    return Response.json({ error: "Community reporting is not configured." }, { status: 503 });
  }
  let json: unknown;
  try { json = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = reportConfirmSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload." }, { status: 400 });

  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    const report = await confirmReport({
      reportId: id,
      vote: parsed.data.vote,
      voterHash: voterHashFromRequest(ip, h.get("user-agent"), null),
      voterUserId: null,
    });
    if (!report) return Response.json({ error: "Report not found." }, { status: 404 });
    return Response.json({ report });
  } catch (error: any) {
    const msg = String(error?.message ?? "Could not confirm report.");
    const status = msg.includes("already submitted")
      ? 409
      : msg.includes("no longer open") || msg.includes("not available")
        ? 400
        : 500;
    return Response.json({ error: msg }, { status });
  }
}
