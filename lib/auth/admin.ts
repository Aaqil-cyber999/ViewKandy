import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "kv_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8;

export interface AdminSession {
  email: string;
  expiresAt: number;
}

function sessionSecret(): string | null {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  if (password) return createHash("sha256").update(`kv:${password}`).digest("hex");
  return null;
}

export function adminConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_EMAIL &&
      (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_SHA256) &&
      sessionSecret(),
  );
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminToken(email: string): string {
  const secret = sessionSecret();
  if (!secret) throw new Error("Admin session secret is not configured.");
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + MAX_AGE_SECONDS * 1000, v: 1 }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyAdminToken(token: string | undefined): AdminSession | null {
  if (!token) return null;
  const secret = sessionSecret();
  if (!secret) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string;
      exp?: number;
    };
    if (!data.email || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return { email: data.email, expiresAt: data.exp };
  } catch {
    return null;
  }
}

export function checkAdminCredentials(email: string, password: string): boolean {
  const expectedEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!expectedEmail) return false;
  if (email.trim().toLowerCase() !== expectedEmail) return false;

  const sha = process.env.ADMIN_PASSWORD_SHA256;
  if (sha) {
    const digest = createHash("sha256").update(password).digest("hex");
    const a = Buffer.from(digest);
    const b = Buffer.from(sha.toLowerCase());
    return a.length === b.length && timingSafeEqual(a, b);
  }

  const plain = process.env.ADMIN_PASSWORD;
  if (!plain) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(plain);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new AdminAuthError();
  return session;
}

export class AdminAuthError extends Error {
  constructor() {
    super("Admin authentication required.");
    this.name = "AdminAuthError";
  }
}

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
