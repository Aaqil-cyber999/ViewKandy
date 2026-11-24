import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientKey, rateLimit } from "@/lib/utils/rate-limit";
import {
  bodyTooLargeResponse,
  forbiddenOriginResponse,
  isCrossOriginRequest,
  requestExceedsBodyLimit,
} from "@/lib/security/http";
import { logSecurityEvent, SECURITY_EVENTS } from "@/lib/security/events";
import {
  REPORT_IMAGE_BUCKET,
  REPORT_IMAGE_MAX_BYTES,
  REPORT_IMAGE_TYPES,
} from "@/lib/reports/storage";

export const runtime = "nodejs";

const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  // AVIF/HEIF brands in ISO BMFF
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const b8 = bytes[8] ?? 0, b9 = bytes[9] ?? 0, b10 = bytes[10] ?? 0, b11 = bytes[11] ?? 0;
    const brand = String.fromCharCode(b8, b9, b10, b11);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (isCrossOriginRequest(request)) {
    logSecurityEvent({
      event: SECURITY_EVENTS.crossOriginMutation,
      request,
      outcome: "blocked",
      reason: "report-upload-origin",
    });
    return forbiddenOriginResponse();
  }

  const rl = rateLimit(clientKey(request, "reports:upload"), 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    logSecurityEvent({
      event: SECURITY_EVENTS.rateLimited,
      request,
      outcome: "blocked",
      reason: "report-upload",
    });
    return Response.json({ error: "Too many upload attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))) } });
  }

  // Multipart framing adds a small amount of overhead to the 5 MB image cap.
  if (requestExceedsBodyLimit(request, REPORT_IMAGE_MAX_BYTES + 64 * 1024)) {
    logSecurityEvent({
      event: SECURITY_EVENTS.bodyTooLarge,
      request,
      outcome: "blocked",
      reason: "report-upload-body",
    });
    return bodyTooLargeResponse(REPORT_IMAGE_MAX_BYTES);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return Response.json({ error: "Image upload is not configured (missing Supabase URL or service role key)." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart form data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing image file." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > REPORT_IMAGE_MAX_BYTES) {
    logSecurityEvent({
      event: SECURITY_EVENTS.uploadRejected,
      request,
      outcome: "blocked",
      reason: "report-upload-size",
    });
    return Response.json({ error: `Image must be between 1 byte and ${REPORT_IMAGE_MAX_BYTES / (1024 * 1024)} MB.` }, { status: 400 });
  }
  const declared = (file.type || "").toLowerCase();
  if (!ALLOWED.has(declared)) {
    logSecurityEvent({
      event: SECURITY_EVENTS.uploadRejected,
      request,
      outcome: "blocked",
      reason: "report-upload-type",
    });
    return Response.json({ error: "Unsupported image type. Use JPEG, PNG, WebP, or AVIF." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffMime(bytes);
  if (!sniffed || sniffed !== declared) {
    logSecurityEvent({
      event: SECURITY_EVENTS.uploadRejected,
      request,
      outcome: "blocked",
      reason: "report-upload-mime-mismatch",
    });
    return Response.json({ error: "Image content does not match its declared type." }, { status: 400 });
  }

  const ext = ALLOWED.get(sniffed)!;
  const objectPath = `reports/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // Idempotent bucket ensure. Failures are tolerated because the bucket may
  // already exist with stricter settings managed outside the app.
  await supabase.storage
    .createBucket(REPORT_IMAGE_BUCKET, {
      public: false,
      fileSizeLimit: `${REPORT_IMAGE_MAX_BYTES}`,
      allowedMimeTypes: [...REPORT_IMAGE_TYPES],
    })
    .catch(() => undefined);

  const { error } = await supabase.storage.from(REPORT_IMAGE_BUCKET).upload(objectPath, bytes, {
    contentType: sniffed,
    upsert: false,
    cacheControl: "3600",
  });
  if (error) {
    console.error("[reports upload] failed", error.message);
    return Response.json({ error: "Could not upload image." }, { status: 500 });
  }

  return Response.json({ path: objectPath }, { status: 201 });
}
