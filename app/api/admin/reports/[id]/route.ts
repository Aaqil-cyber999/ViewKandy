import type { NextRequest } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { databaseConfigured } from "@/lib/db/client";
import { reportModerationSchema } from "@/lib/validation/schemas";
import { moderateReport } from "@/lib/reports/service";
import {
  forbiddenOriginResponse,
  isCrossOriginRequest,
  readJsonBody,
} from "@/lib/security/http";
import { logSecurityEvent, SECURITY_EVENTS } from "@/lib/security/events";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (isCrossOriginRequest(request)) {
    logSecurityEvent({
      event: SECURITY_EVENTS.crossOriginMutation,
      request,
      outcome: "blocked",
      reason: "admin-moderation-origin",
    });
    return forbiddenOriginResponse();
  }

  let session;
  try {
    session = await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError) {
      logSecurityEvent({
        event: SECURITY_EVENTS.adminDenied,
        request,
        outcome: "blocked",
        reason: "admin-moderation-session",
      });
      return Response.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
  if (!databaseConfigured()) {
    return Response.json({ error: "Database not configured." }, { status: 503 });
  }
  const { id } = await params;
  const body = await readJsonBody(request);
  if (!body.ok) {
    if (body.response.status === 413) {
      logSecurityEvent({
        event: SECURITY_EVENTS.bodyTooLarge,
        request,
        outcome: "blocked",
        reason: "admin-moderation-body",
      });
    }
    return body.response;
  }
  const parsed = reportModerationSchema.safeParse(body.value);
  if (!parsed.success) {
    return Response.json({ error: "Invalid moderation payload.", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { action, reason } = parsed.data;
  if ((action === "reject" || action === "flag") && !reason) {
    return Response.json({ error: "A moderation reason is required when rejecting or flagging a report." }, { status: 400 });
  }
  try {
    const report = await moderateReport({
      reportId: id,
      action,
      reason,
      actorUserId: null, // admin auth is cookie/email-based in this app; no auth.users id mapping here
      actorEmail: session.email,
    });
    if (!report) return Response.json({ error: "Report not found." }, { status: 404 });
    return Response.json({ report, moderatedBy: session.email });
  } catch (error) {
    console.error("[admin reports] moderation failed", error);
    return Response.json({ error: "Could not moderate report." }, { status: 500 });
  }
}
