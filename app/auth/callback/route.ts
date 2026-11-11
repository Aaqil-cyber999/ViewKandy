import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/saved";

  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=missing_code", url.origin));
  }

  const client = await createSupabaseServerClient();
  if (!client) {
    return NextResponse.redirect(new URL("/auth?error=not_configured", url.origin));
  }

  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/saved", url.origin));
}
