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

  const limited = rateLimit(clientKey(request, "admin-login"), 6, 60_000);
  if (!limited.allowed) return tooManyRequests(limited);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  if (!checkAdminCredentials(parsed.data.email, parsed.data.password)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, email: parsed.data.email });
  response.cookies.set(ADMIN_COOKIE, createAdminToken(parsed.data.email), ADMIN_COOKIE_OPTIONS);
  return response;
}
