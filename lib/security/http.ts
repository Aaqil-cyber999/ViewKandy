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

export const DEFAULT_JSON_MAX_BYTES = 64 * 1024;

export type BoundedBodyResult<T> =
  | { ok: true; value: T }
  | { ok: false; response: Response };

function jsonError(message: string, status: number): Response {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function formatByteLimit(maxBytes: number): string {
  return maxBytes >= 1024 * 1024
    ? `${Math.round(maxBytes / (1024 * 1024))} MB`
    : `${Math.round(maxBytes / 1024)} KB`;
}

export function bodyTooLargeResponse(maxBytes: number): Response {
  return jsonError(
    `Request body exceeds the ${formatByteLimit(maxBytes)} limit.`,
    413,
  );
}

/** Fast rejection for streamed formats that expose Content-Length. */
export function requestExceedsBodyLimit(
  request: NextRequest,
  maxBytes: number,
): boolean {
  const raw = request.headers.get("content-length");
  if (!raw) return false;
  const length = Number(raw);
  return Number.isFinite(length) && length > maxBytes;
}

/**
 * Reads a JSON body through a bounded stream. This prevents an attacker from
 * forcing the server to buffer an arbitrarily large payload before validation.
 */
export async function readJsonBody<T = unknown>(
  request: NextRequest,
  maxBytes = DEFAULT_JSON_MAX_BYTES,
): Promise<BoundedBodyResult<T>> {
  if (requestExceedsBodyLimit(request, maxBytes)) {
    return { ok: false, response: bodyTooLargeResponse(maxBytes) };
  }

  const body = request.body;
  if (!body) {
    return { ok: false, response: jsonError("Request body is required.", 400) };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, response: bodyTooLargeResponse(maxBytes) };
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    return { ok: false, response: jsonError("Could not read request body.", 400) };
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(joined);
  } catch {
    return { ok: false, response: jsonError("Request body is not valid UTF-8.", 400) };
  }

  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return { ok: false, response: jsonError("Invalid JSON body.", 400) };
  }
}
