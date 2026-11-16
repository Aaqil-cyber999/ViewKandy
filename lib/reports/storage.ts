import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Report photos are stored in a private Supabase Storage bucket. The database
 * keeps only the object path; the API issues short-lived signed URLs for
 * display so unapproved/withdrawn media is never permanently public.
 */
export const REPORT_IMAGE_BUCKET = process.env.SUPABASE_REPORT_BUCKET || "report-images";
export const REPORT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const REPORT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

let cached: SupabaseClient | null = null;

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return cached;
}

const signedCache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_TTL_SECONDS = 60 * 60;

/** Returns a short-lived signed URL for a stored report image path. */
export async function signReportImage(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  // Legacy rows may contain a full URL; keep it only if it is https.
  if (/^https:\/\//i.test(value)) return value;
  if (!value.startsWith("reports/")) return null;

  const now = Date.now();
  const hit = signedCache.get(value);
  if (hit && hit.expiresAt > now + 30_000) return hit.url;

  const client = adminClient();
  if (!client) return null;
  try {
    const { data, error } = await client.storage
      .from(REPORT_IMAGE_BUCKET)
      .createSignedUrl(value, SIGNED_TTL_SECONDS);
    if (error || !data?.signedUrl) return null;
    signedCache.set(value, {
      url: data.signedUrl,
      expiresAt: now + SIGNED_TTL_SECONDS * 1000,
    });
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function signReportImages<T extends { imageUrl: string | null }>(reports: T[]): Promise<T[]> {
  return Promise.all(
    reports.map(async (report) => ({
      ...report,
      imageUrl: await signReportImage(report.imageUrl),
    })),
  );
}
