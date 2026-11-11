/**
 * Read-only integration health check.
 *
 * Reports which parts of KandyVerse are connected without printing secrets.
 * Run with: npm run integrations:check
 */
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const results = [];

function record(name, status, detail) {
  results.push({ name, status, detail });
}

function env(name) {
  return (process.env[name] ?? "").trim();
}

async function checkDatabase() {
  const url = env("DATABASE_URL");
  if (!url) {
    record("Postgres / Drizzle", "missing", "DATABASE_URL is not set");
    return;
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    application_name: "kandyverse-integration-check",
  });

  try {
    await client.connect();
    const counts = await client.query(
      `select
         (select count(*)::int from categories) as categories,
         (select count(*)::int from places) as places`,
    );
    const postgis = await client.query(
      "select extversion from pg_extension where extname = 'postgis'",
    );
    const server = await client.query("show server_version");
    const row = counts.rows[0];
    record(
      "Postgres / Drizzle",
      "ok",
      `PostgreSQL ${server.rows[0]?.server_version}; ${row.categories} categories, ${row.places} places; PostGIS ${postgis.rows[0]?.extversion ?? "missing"}`,
    );
  } catch (error) {
    record(
      "Postgres / Drizzle",
      "fail",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function checkSupabaseAuth() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !key) {
    record(
      "Supabase Auth",
      "missing",
      !url
        ? "NEXT_PUBLIC_SUPABASE_URL is not set"
        : "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set; account saves stay local-only",
    );
    return;
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      record("Supabase Auth", "fail", `auth settings returned HTTP ${response.status}`);
      return;
    }
    record("Supabase Auth", "ok", "Auth settings reachable with the configured anon key");
  } catch (error) {
    record(
      "Supabase Auth",
      "fail",
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function checkOpenAI() {
  const key = env("OPENAI_API_KEY");
  if (!key) {
    record(
      "OpenAI",
      "missing",
      "OPENAI_API_KEY is not set; the assistant uses the grounded local engine",
    );
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      record("OpenAI", "fail", `models endpoint returned HTTP ${response.status}`);
      return;
    }
    record(
      "OpenAI",
      "ok",
      `key valid; model ${env("OPENAI_MODEL") || "gpt-4.1-mini"}`,
    );
  } catch (error) {
    record(
      "OpenAI",
      "fail",
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function checkOverpass() {
  const configured = env("OVERPASS_ENDPOINT");
  const endpoints = [
    configured,
    "https://overpass-api.de/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
  ].filter((endpoint, index, all) => Boolean(endpoint) && all.indexOf(endpoint) === index);

  let lastError = "no endpoint available";
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "KandyVerse integration check",
        },
        body: new URLSearchParams({
          data: "[out:json][timeout:10];node(around:50,7.2907,80.6411);out 1;",
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        lastError = `${endpoint} returned HTTP ${response.status}`;
        continue;
      }
      record("OpenStreetMap / Overpass", "ok", `live query succeeded via ${endpoint}`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  record("OpenStreetMap / Overpass", "fail", lastError);
}

function checkGoogleMaps() {
  const browserKey = env("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
  const serverKey = env("GOOGLE_MAPS_SERVER_API_KEY");
  if (!browserKey && !serverKey) {
    record(
      "Google Maps Platform",
      "missing",
      "No keys set; 3D Tiles, live Places and Routes use documented fallbacks",
    );
    return;
  }
  const parts = [];
  if (browserKey) parts.push("browser 3D Tiles key set");
  if (serverKey) parts.push("server Routes/Places key set");
  record(
    "Google Maps Platform",
    "ok",
    `${parts.join("; ")} (live calls skipped to avoid billing)`,
  );
}

function checkCesium() {
  if (env("NEXT_PUBLIC_CESIUM_ION_TOKEN")) {
    record("Cesium ion terrain", "ok", "token set");
  } else {
    record("Cesium ion terrain", "missing", "token not set; ellipsoid terrain is used");
  }
}

function checkAdmin() {
  const email = env("ADMIN_EMAIL");
  const password = env("ADMIN_PASSWORD");
  const sha = env("ADMIN_PASSWORD_SHA256");
  if (!email || (!password && !sha)) {
    record(
      "Editorial admin",
      "missing",
      "Set ADMIN_EMAIL and ADMIN_PASSWORD or ADMIN_PASSWORD_SHA256 to enable /admin",
    );
    return;
  }
  record(
    "Editorial admin",
    "ok",
    `login configured for ${email}${sha ? " (SHA-256 password)" : ""}`,
  );
}

async function main() {
  record("App URL", "ok", env("NEXT_PUBLIC_APP_URL") || "http://localhost:3000");

  await checkDatabase();
  await checkSupabaseAuth();
  await checkOpenAI();
  await checkOverpass();
  checkGoogleMaps();
  checkCesium();
  checkAdmin();

  const icons = { ok: "[ok]  ", missing: "[warn]", fail: "[fail]" };
  console.log("\nKandyVerse integration status\n");
  for (const result of results) {
    console.log(`${icons[result.status] ?? "[?]   "} ${result.name}: ${result.detail}`);
  }

  const failures = results.filter((result) => result.status === "fail");
  if (failures.length > 0) process.exitCode = 1;
}

await main();
