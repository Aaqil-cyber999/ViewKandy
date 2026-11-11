// @vitest-environment node
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminConfigured,
  checkAdminCredentials,
  createAdminToken,
  verifyAdminToken,
} from "@/lib/auth/admin";

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAIL", "editor@example.com");
  vi.stubEnv("ADMIN_PASSWORD", "s3cret-pass");
  vi.stubEnv("ADMIN_PASSWORD_SHA256", "");
  vi.stubEnv("ADMIN_SESSION_SECRET", "test-session-secret");
});

describe("adminConfigured", () => {
  it("is true when email, password and secret are present", () => {
    expect(adminConfigured()).toBe(true);
  });

  it("is false without an email", () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    expect(adminConfigured()).toBe(false);
  });

  it("is false without any password", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(adminConfigured()).toBe(false);
  });
});

describe("admin tokens", () => {
  it("round-trips a signed session", () => {
    const token = createAdminToken("editor@example.com");
    const session = verifyAdminToken(token);
    expect(session?.email).toBe("editor@example.com");
    expect(session?.expiresAt).toBeGreaterThan(Date.now());
  });

  it("rejects a tampered signature", () => {
    const token = createAdminToken("editor@example.com");
    const [payload, signature] = token.split(".");
    const replacement = signature!.startsWith("a") ? "b" : "a";
    const tampered = `${payload}.${replacement}${signature!.slice(1)}`;
    expect(verifyAdminToken(tampered)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = createAdminToken("editor@example.com");
    const [, signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ email: "attacker@example.com", exp: Date.now() + 1000 }),
      "utf8",
    ).toString("base64url");
    expect(verifyAdminToken(`${forgedPayload}.${signature}`)).toBeNull();
  });

  it("rejects malformed and missing tokens", () => {
    expect(verifyAdminToken(undefined)).toBeNull();
    expect(verifyAdminToken("")).toBeNull();
    expect(verifyAdminToken("not-a-token")).toBeNull();
  });

  it("rejects an expired session", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      const token = createAdminToken("editor@example.com");
      vi.setSystemTime(new Date("2026-01-01T09:00:00.000Z"));
      expect(verifyAdminToken(token)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("checkAdminCredentials", () => {
  it("accepts the configured email and password", () => {
    expect(checkAdminCredentials("editor@example.com", "s3cret-pass")).toBe(true);
    expect(checkAdminCredentials("  EDITOR@example.com  ", "s3cret-pass")).toBe(true);
  });

  it("rejects a wrong password or email", () => {
    expect(checkAdminCredentials("editor@example.com", "wrong")).toBe(false);
    expect(checkAdminCredentials("someone@example.com", "s3cret-pass")).toBe(false);
    expect(checkAdminCredentials("", "s3cret-pass")).toBe(false);
  });

  it("supports a SHA-256 password hash", () => {
    const hash = createHash("sha256").update("hashed-pass").digest("hex");
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("ADMIN_PASSWORD_SHA256", hash.toUpperCase());
    expect(checkAdminCredentials("editor@example.com", "hashed-pass")).toBe(true);
    expect(checkAdminCredentials("editor@example.com", "s3cret-pass")).toBe(false);
  });
});
