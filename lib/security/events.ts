import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

export type SecurityOutcome = "blocked" | "failure" | "warning";

export interface SecurityEvent {
  event: string;
  request: NextRequest;
  outcome: SecurityOutcome;
  reason: string;
}

export const SECURITY_EVENTS = {
  crossOriginMutation: "security.mutation.cross_origin",
  bodyTooLarge: "security.request.body_too_large",
  rateLimited: "security.request.rate_limited",
  loginFailed: "security.auth.login_failed",
  adminDenied: "security.auth.admin_denied",
  uploadRejected: "security.upload.rejected",
} as const;

/**
 * Hashes the client address with a deployment secret so logs can correlate
 * repeated events without storing a raw IP address.
 */
function clientFingerprint(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  const salt = process.env.ADMIN_SESSION_SECRET || "viewkandy-local-events";
  return createHash("sha256")
    .update(`${salt}:${address}`)
    .digest("hex")
    .slice(0, 12);
}

/**
 * Emits one JSON line per security-relevant denial. Query strings, headers,
 * bodies, credentials and raw IP addresses are intentionally never included.
 */
export function logSecurityEvent({
  event,
  request,
  outcome,
  reason,
}: SecurityEvent): void {
  const entry = {
    timestamp: new Date().toISOString(),
    source: "viewkandy-security",
    event,
    outcome,
    reason,
    method: request.method,
    path: request.nextUrl.pathname,
    client: clientFingerprint(request),
  };
  console.warn(JSON.stringify(entry));
}
