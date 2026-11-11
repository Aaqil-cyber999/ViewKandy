import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  console.warn(
    "[drizzle] DATABASE_URL is not set. `drizzle-kit generate` still works; migrate/push/studio need a connection string.",
  );
}

function withTls(url: string): string {
  const parsed = new URL(url);
  const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (!local && !parsed.searchParams.has("sslmode")) {
    parsed.searchParams.set("sslmode", "require");
  }
  return parsed.toString();
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: rawUrl
      ? withTls(rawUrl)
      : "postgresql://postgres:postgres@localhost:5432/postgres",
  },
  verbose: true,
  strict: true,
});
