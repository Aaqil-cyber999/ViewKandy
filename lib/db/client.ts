import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Server-only Drizzle client backed by node-postgres.
 *
 * DATABASE_URL points at the Supabase Postgres pooler (or any Postgres with
 * PostGIS). The pool is cached on globalThis so Next.js hot reloads do not
 * leak connections in development.
 */

type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __viewkandyPool?: Pool;
  __viewkandyDb?: Database;
};

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function getDb(): Database {
  if (globalForDb.__viewkandyDb) return globalForDb.__viewkandyDb;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured.");
  }

  let hostname = "localhost";
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error("DATABASE_URL is not a valid PostgreSQL connection string.");
  }

  const pool =
    globalForDb.__viewkandyPool ??
    new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      application_name: "viewkandy",
      // Supabase's pooler presents a certificate chain that node-postgres
      // cannot verify without the project CA; TLS is still enforced.
      ssl: isLocalHost(hostname) ? undefined : { rejectUnauthorized: false },
    });

  pool.on("error", (error) => {
    console.error("[db] idle PostgreSQL client error:", error.message);
  });

  const db = drizzle(pool, { schema });
  globalForDb.__viewkandyPool = pool;
  globalForDb.__viewkandyDb = db;
  return db;
}

export async function closeDb(): Promise<void> {
  if (globalForDb.__viewkandyPool) {
    await globalForDb.__viewkandyPool.end();
    globalForDb.__viewkandyPool = undefined;
    globalForDb.__viewkandyDb = undefined;
  }
}
