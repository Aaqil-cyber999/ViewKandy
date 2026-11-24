// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_JSON_MAX_BYTES,
  isCrossOriginRequest,
  isSameOriginRequest,
  readJsonBody,
  requestExceedsBodyLimit,
} from "@/lib/security/http";
import { logSecurityEvent, SECURITY_EVENTS } from "@/lib/security/events";

function postRequest(
  body: string | null = JSON.stringify({ ok: true }),
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest("https://example.com/api/reports", {
    method: "POST",
    headers,
    body: body ?? undefined,
  });
}

describe("same-origin guard", () => {
  it("allows non-browser requests without an Origin header", () => {
    expect(isSameOriginRequest(postRequest())).toBe(true);
    expect(isCrossOriginRequest(postRequest())).toBe(false);
  });

  it("allows a browser request from the same host", () => {
    const request = postRequest(null, { origin: "https://example.com" });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("blocks a different origin", () => {
    const request = postRequest(null, { origin: "https://attacker.test" });
    expect(isCrossOriginRequest(request)).toBe(true);
  });

  it("blocks the literal null origin", () => {
    const request = postRequest(null, { origin: "null" });
    expect(isCrossOriginRequest(request)).toBe(true);
  });

  it("uses the forwarded host when behind a proxy", () => {
    const request = postRequest(null, {
      origin: "https://travel.example",
      "x-forwarded-host": "travel.example",
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });
});

describe("bounded JSON reader", () => {
  it("parses a valid JSON body", async () => {
    const result = await readJsonBody<{ ok: boolean }>(postRequest());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ ok: true });
  });

  it("rejects an oversized Content-Length before reading the stream", async () => {
    const request = postRequest("", {
      "content-length": String(DEFAULT_JSON_MAX_BYTES + 1),
    });
    expect(requestExceedsBodyLimit(request, DEFAULT_JSON_MAX_BYTES)).toBe(true);
    const result = await readJsonBody(request);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it("rejects a streamed payload that grows past the limit", async () => {
    const request = postRequest(`{"value":"${"x".repeat(70 * 1024)}"}`);
    const result = await readJsonBody(request, 1024);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it("returns a client error for malformed JSON", async () => {
    const result = await readJsonBody(postRequest("{oops"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("requires a body", async () => {
    const result = await readJsonBody(postRequest(null));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});

describe("security event logging", () => {
  it("writes a redacted structured event", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const request = postRequest(null, {
      "x-forwarded-for": "203.0.113.42",
    });

    logSecurityEvent({
      event: SECURITY_EVENTS.loginFailed,
      request,
      outcome: "failure",
      reason: "invalid-credentials",
    });

    expect(warn).toHaveBeenCalledTimes(1);
    const line = String(warn.mock.calls[0]?.[0]);
    const entry = JSON.parse(line) as Record<string, unknown>;

    expect(entry.source).toBe("viewkandy-security");
    expect(entry.event).toBe("security.auth.login_failed");
    expect(entry.outcome).toBe("failure");
    expect(entry.path).toBe("/api/reports");
    expect(entry.client).toHaveLength(12);
    expect(line).not.toContain("203.0.113.42");
    expect(line).not.toContain("password");
  });
});
