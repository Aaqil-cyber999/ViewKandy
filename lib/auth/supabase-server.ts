import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Cookie-bound Supabase client for route handlers / server components.
 * Returns null when Supabase is not configured so callers can degrade
 * gracefully (local-only saves) instead of crashing.
 */
export async function createSupabaseServerClient() {
  if (!supabaseAuthConfigured()) return null;
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render: middleware/route handler
            // will refresh the session instead.
          }
        },
      },
    },
  );
}

export async function getAuthenticatedUser() {
  const client = await createSupabaseServerClient();
  if (!client) return { client: null, user: null };
  const { data, error } = await client.auth.getUser();
  if (error) return { client, user: null };
  return { client, user: data.user };
}
