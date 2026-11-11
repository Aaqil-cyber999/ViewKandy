/**
 * Prepares a Supabase/Postgres database for the Drizzle migrations:
 *   - ensures the `extensions` schema exists
 *   - enables PostGIS in that schema (used by the generated `location` column)
 *   - creates the public `place-images` storage bucket when Storage exists
 *
 * Run with: npm run db:bootstrap
 */
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[db:bootstrap] DATABASE_URL is not set. Copy .env.example to .env.local first.");
  process.exit(1);
}

const hostname = new URL(url).hostname;
const local = ["localhost", "127.0.0.1", "::1"].includes(hostname);

const client = new Client({
  connectionString: url,
  ssl: local ? undefined : { rejectUnauthorized: false },
  application_name: "kandyverse-bootstrap",
});

try {
  await client.connect();
  console.log(`[db:bootstrap] connected to ${hostname}`);

  await client.query("create schema if not exists extensions");
  await client.query("create extension if not exists postgis with schema extensions");

  const installed = await client.query(
    `select n.nspname as schema
       from pg_extension e
       join pg_namespace n on n.oid = e.extnamespace
      where e.extname = 'postgis'`,
  );
  const schema = installed.rows[0]?.schema;
  if (schema !== "extensions") {
    throw new Error(
      `PostGIS is installed in "${schema ?? "unknown"}", but the Drizzle schema references extensions.*. ` +
        "Move it with: alter extension postgis set schema extensions;",
    );
  }

  const version = await client.query(
    "select extversion from pg_extension where extname = 'postgis'",
  );
  console.log(`[db:bootstrap] PostGIS ${version.rows[0]?.extversion} ready in extensions`);

  // The generated `location` column declares the unqualified `geography` type,
  // so the extensions schema must be on the role search_path.
  try {
    await client.query(
      `do $$
       begin
         execute format(
           'alter role %I set search_path to "$user", public, extensions',
           current_user
         );
       exception when insufficient_privilege then
         raise notice 'Could not set search_path; ensure extensions is on the search_path';
       end;
       $$;`,
    );
    console.log("[db:bootstrap] role search_path includes extensions");
  } catch (error) {
    console.warn(
      "[db:bootstrap] could not update search_path:",
      error instanceof Error ? error.message : error,
    );
  }

  const hasStorage = await client.query(
    "select 1 from information_schema.schemata where schema_name = 'storage'",
  );

  if (hasStorage.rowCount) {
    await client.query(
      `insert into storage.buckets (id, name, public)
       values ('place-images', 'place-images', true)
       on conflict (id) do nothing`,
    );
    await client.query(`
      do $$
      begin
        if not exists (
          select 1 from pg_policies
          where schemaname = 'storage'
            and tablename = 'objects'
            and policyname = 'public read place images'
        ) then
          create policy "public read place images"
            on storage.objects for select
            using (bucket_id = 'place-images');
        end if;
      end;
      $$;
    `);
    console.log("[db:bootstrap] storage bucket place-images ready");
  } else {
    console.log("[db:bootstrap] no storage schema found — skipping bucket setup");
  }
} catch (error) {
  console.error("[db:bootstrap] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
