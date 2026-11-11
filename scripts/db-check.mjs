/**
 * Read-only database diagnostics for the Drizzle/Postgres backend.
 * Run with: npm run db:check
 */
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[db:check] DATABASE_URL is not set.");
  process.exit(1);
}

const hostname = new URL(url).hostname;
const local = ["localhost", "127.0.0.1", "::1"].includes(hostname);

const client = new Client({
  connectionString: url,
  ssl: local ? undefined : { rejectUnauthorized: false },
  application_name: "kandyverse-check",
});

try {
  await client.connect();
  const version = await client.query("select version()");
  const searchPath = await client.query("show search_path");
  const extensions = await client.query(
    `select e.extname, n.nspname as schema, e.extversion
       from pg_extension e
       join pg_namespace n on n.oid = e.extnamespace
      order by e.extname`,
  );
  const tables = await client.query(
    `select tablename
       from pg_tables
      where schemaname = 'public'
      order by tablename`,
  );

  console.log("[db:check] connected:", hostname);
  console.log("[db:check] server:", version.rows[0]?.version?.split(" on ")[0]);
  console.log("[db:check] search_path:", searchPath.rows[0]?.search_path);
  console.log(
    "[db:check] extensions:",
    extensions.rows.map((row) => `${row.extname}@${row.schema}`).join(", ") || "none",
  );
  console.log(
    "[db:check] public tables:",
    tables.rows.map((row) => row.tablename).join(", ") || "none",
  );

  if (extensions.rows.some((row) => row.extname === "postgis")) {
    const probe = await client.query(
      "select st_setsrid(st_makepoint(80.6413, 7.2936), 4326)::geography as point",
    );
    console.log("[db:check] PostGIS probe:", probe.rows[0]?.point ? "ok" : "empty");
  } else {
    console.log("[db:check] PostGIS is not installed — run npm run db:bootstrap");
  }
} catch (error) {
  console.error("[db:check] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
