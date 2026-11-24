import type { NextRequest } from "next/server";

/** Returns the first comma-separated value from a proxy header. */
function firstHeaderValue(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first || null;
}

/**
 * Best-effort reconstruction of the externally visible host. Proxies normally
 * provide x-forwarded-host; direct requests use the host header or Next's URL.
 */
export function requestHost(request: NextRequest): string | null {
  return (
    firstHeaderValue(request.headers.get("x-forwarded-host")) ??
    firstHeaderValue(request.headers.get("host")) ??
    request.nextUrl.host ??
    null
  );
}

/**
 * Browser mutations from another origin are rejected. Requests with no Origin
 * header are legitimate non-browser clients (CLI, health checks, server-side
 * calls) and remain allowed; authorization is still enforced independently.
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  const rawOrigin = request.headers.get("origin");
  if (!rawOrigin) return true;

  let origin: URL;
  try {
    origin = new URL(rawOrigin);
  } catch {
    return false;
  }
  if (origin.protocol !== "http:" && origin.protocol !== "https:") return false;

  const expectedHost = requestHost(request);
  if (!expectedHost) return false;

  return origin.host.toLowerCase() === expectedHost.toLowerCase();
}

export function isCrossOriginRequest(request: NextRequest): boolean {
  return !isSameOriginRequest(request);
}

export function forbiddenOriginResponse(): Response {
  return Response.json(
    { error: "Invalid request origin." },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}
