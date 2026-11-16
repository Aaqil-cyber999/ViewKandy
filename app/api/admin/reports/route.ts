import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { databaseConfigured } from "@/lib/db/client";
import { listReportsForModeration } from "@/lib/reports/service";

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
  if (!databaseConfigured()) {
    return Response.json({ reports: [], configured: false, warning: "Database not configured." });
  }
  try {
    const reports = await listReportsForModeration(200);
    return Response.json({ reports, configured: true, count: reports.length });
  } catch (error) {
    console.error("[admin reports] list failed", error);
    return Response.json({ error: "Could not load reports." }, { status: 500 });
  }
}
