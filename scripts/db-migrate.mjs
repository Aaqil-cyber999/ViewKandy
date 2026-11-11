/**
 * Applies the generated Drizzle SQL migrations with the official migrator.
 *
 * We use the programmatic migrator instead of `drizzle-kit migrate` because the
 * CLI can exit without a diagnostic on some pooled Supabase connections. The
 * programmatic path uses the same `drizzle/` folder and migration journal.
 *
 * Run with: npm run db:migrate
 */
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[db:migrate] DATABASE_URL is not set. Copy .env.example to .env.local first.");
  process.exit(1);
}

const hostname = new URL(url).hostname;
const local = ["localhost", "127.0.0.1", "::1"].includes(hostname);
const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "../drizzle");

const pool = new Pool({
  connectionString: url,
  ssl: local ? undefined : { rejectUnauthorized: false },
  max: 1,
  application_name: "kandyverse-migrate",
});

try {
  await migrate(drizzle(pool), { migrationsFolder });
  console.log(`[db:migrate] migrations applied on ${hostname}`);
} catch (error) {
  console.error(
    "[db:migrate] failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => undefined);
}
