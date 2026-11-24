import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_OPTIONS,
  adminConfigured,
  checkAdminCredentials,
  createAdminToken,
} from "@/lib/auth/admin";
import { adminLoginSchema } from "@/lib/validation/schemas";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/utils/rate-limit";
import {
  forbiddenOriginResponse,
  isCrossOriginRequest,
  readJsonBody,
} from "@/lib/security/http";
import { logSecurityEvent, SECURITY_EVENTS } from "@/lib/security/events";

export async function POST(request: NextRequest) {
  if (!adminConfigured()) {
    return NextResponse.json(
      {
        error: "Admin access is not configured.",
        detail:
          "Set ADMIN_EMAIL and ADMIN_PASSWORD (or ADMIN_PASSWORD_SHA256) in .env.local, then restart the server.",
      },
      { status: 503 },
    );
  }

  if (isCrossOriginRequest(request)) {
    logSecurityEvent({
      event: SECURITY_EVENTS.crossOriginMutation,
      request,
      outcome: "blocked",
      reason: "admin-login-origin",
    });
    return forbiddenOriginResponse();
  }

  const limited = rateLimit(clientKey(request, "admin-login"), 6, 60_000);
  if (!limited.allowed) {
    logSecurityEvent({
      event: SECURITY_EVENTS.rateLimited,
      request,
      outcome: "blocked",
      reason: "admin-login",
    });
    return tooManyRequests(limited);
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    if (body.response.status === 413) {
      logSecurityEvent({
        event: SECURITY_EVENTS.bodyTooLarge,
        request,
        outcome: "blocked",
        reason: "admin-login-body",
      });
    }
    return body.response;
  }

  const parsed = adminLoginSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  if (!checkAdminCredentials(parsed.data.email, parsed.data.password)) {
    logSecurityEvent({
      event: SECURITY_EVENTS.loginFailed,
      request,
      outcome: "failure",
      reason: "admin-credentials",
    });
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, email: parsed.data.email });
  response.cookies.set(ADMIN_COOKIE, createAdminToken(parsed.data.email), ADMIN_COOKIE_OPTIONS);
  return response;
}
