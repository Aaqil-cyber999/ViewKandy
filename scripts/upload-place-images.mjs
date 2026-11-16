/**
 * Mirrors the project's Kandy photography to Supabase Storage and, when a
 * database connection is available, registers each image in `place_images`.
 *
 * Also uploads homepage hero backgrounds from `public/homepage/` to Storage
 * under the `homepage/` prefix (no database rows).
 *
 * Required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (server-only; never expose to the browser)
 *
 * Optional:
 *   DATABASE_URL                (to insert public place_images rows)
 *   SUPABASE_PLACE_BUCKET       (default: place-images)
 *   SUPABASE_PLACE_PREFIX       (default: places)
 *
 * Run: npm run images:upload
 *      npm run images:upload -- --dry-run
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const BUCKET = process.env.SUPABASE_PLACE_BUCKET || "place-images";
const PREFIX = (process.env.SUPABASE_PLACE_PREFIX || "places").replace(/^\/+|\/+$/g, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const dryRun = process.argv.includes("--dry-run");

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

function fail(message) {
  console.error(`[images:upload] ${message}`);
  process.exit(1);
}

function requireCredentials() {
  if (!SUPABASE_URL) {
    fail(
      "NEXT_PUBLIC_SUPABASE_URL is not set. Add it to .env.local (Supabase → Project Settings → API).",
    );
  }
  if (!SERVICE_KEY) {
    fail(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add the service-role key to .env.local; it is server-only and must never use the NEXT_PUBLIC_ prefix.",
    );
  }
}

const manifestPath = path.join("data", "seed", "place-photos.json");
const photos = JSON.parse(await readFile(manifestPath, "utf8"));

// `--dry-run` only needs the files on disk, so it works before any Supabase
// credentials exist. A real upload requires the project URL and service key.
if (!dryRun) requireCredentials();

const supabase = dryRun
  ? null
  : createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

async function ensureBucket() {
  const { data, error } = await supabase.storage.getBucket(BUCKET);
  if (!error && data) {
    console.log(`[images:upload] bucket "${BUCKET}" is ready`);
    return;
  }

  const created = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "10MB",
  });
  if (created.error) {
    fail(
      `Could not read or create the "${BUCKET}" bucket: ${created.error.message}. ` +
        "Run `npm run db:bootstrap` or create it manually in Supabase → Storage.",
    );
  }
  console.log(`[images:upload] created public bucket "${BUCKET}"`);
}

async function uploadPhoto(photo) {
  const localPath = path.join("public", "places", photo.file);
  const body = await readFile(localPath);
  const objectPath = `${PREFIX}/${photo.file}`;
  const contentType = MIME[path.extname(photo.file).toLowerCase()];

  if (!contentType) {
    throw new Error(`Unsupported image extension for ${photo.file}`);
  }
  if (body.byteLength === 0) {
    throw new Error(`${photo.file} is empty`);
  }

  if (dryRun) {
    const base = SUPABASE_URL || "https://<project-ref>.supabase.co";
    console.log(
      `[dry-run] ${localPath} (${(body.byteLength / 1024).toFixed(0)} KB, ${contentType}) → ${BUCKET}/${objectPath}`,
    );
    return `${base}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, body, { contentType, upsert: true, cacheControl: "31536000" });

  if (error) throw new Error(`${photo.file}: ${error.message}`);

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

async function registerImages(rows) {
  if (!DATABASE_URL) {
    console.log(
      "[images:upload] DATABASE_URL not set — upload complete, but place_images rows were not written.",
    );
    return;
  }

  const local = ["localhost", "127.0.0.1", "::1"].includes(
    new URL(DATABASE_URL).hostname,
  );
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: local ? undefined : { rejectUnauthorized: false },
    application_name: "viewkandy-image-upload",
  });

  await client.connect();
  try {
    let registered = 0;
    for (const row of rows) {
      const place = await client.query("select id from places where slug = $1", [
        row.slug,
      ]);
      if (place.rowCount === 0) {
        console.warn(`[images:upload] no place row for slug "${row.slug}" — skipping metadata`);
        continue;
      }

      await client.query(
        `insert into place_images (id, place_id, url, alt, credit, license, sort_order)
         values ($1, $2, $3, $4, null, null, 0)
         on conflict (id) do update
           set url = excluded.url,
               alt = excluded.alt,
               sort_order = excluded.sort_order`,
        [`img-${row.slug}`, place.rows[0].id, row.url, row.alt],
      );
      registered += 1;
    }
    console.log(`[images:upload] registered ${registered} place_images rows`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function uploadHomepageImages() {
  const dir = path.join("public", "homepage");
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }

  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => MIME[path.extname(name).toLowerCase()])
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (files.length === 0) return 0;

  for (const file of files) {
    const localPath = path.join(dir, file);
    const body = await readFile(localPath);
    const objectPath = `homepage/${file}`;
    const contentType = MIME[path.extname(file).toLowerCase()];
    if (!contentType) continue;
    if (body.byteLength === 0) throw new Error(`${localPath} is empty`);

    if (dryRun) {
      const base = SUPABASE_URL || "https://<project-ref>.supabase.co";
      console.log(
        `[dry-run] ${localPath} (${(body.byteLength / 1024).toFixed(0)} KB, ${contentType}) → ${BUCKET}/${objectPath}`,
      );
      continue;
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, body, { contentType, upsert: true, cacheControl: "31536000" });
    if (error) throw new Error(`${file}: ${error.message}`);
  }

  console.log(
    `[images:upload] ${dryRun ? "validated" : "uploaded"} ${files.length} homepage image(s)` +
      (dryRun ? "" : ` to ${BUCKET}/homepage`),
  );
  return files.length;
}

try {
  if (dryRun) {
    const slugs = new Set();
    for (const photo of photos) {
      if (slugs.has(photo.slug)) throw new Error(`Duplicate slug "${photo.slug}" in the manifest`);
      slugs.add(photo.slug);
    }
    console.log(
      `[images:upload] dry run: validating ${photos.length} photographs (no network calls)`,
    );
  } else {
    await ensureBucket();
  }

  const rows = [];
  for (const photo of photos) {
    const publicUrl = await uploadPhoto(photo);
    rows.push({ slug: photo.slug, alt: photo.alt, url: publicUrl });
  }

  if (!dryRun) await registerImages(rows);
  console.log(
    `[images:upload] ${dryRun ? "validated" : "uploaded"} ${rows.length} photographs` +
      (dryRun ? "" : ` to ${BUCKET}/${PREFIX}`),
  );

  await uploadHomepageImages();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
