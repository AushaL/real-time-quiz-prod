import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load the local overrides first, then the regular .env. dotenv does not
// overwrite variables that are already set, so .env.local wins.
config({ path: ".env.local" });
config();

// PRISMA_DATABASE_URL lets scripts (e.g. the e2e runner) point the CLI at the
// test database without changing the developer's local config.
const databaseUrl =
  process.env.PRISMA_DATABASE_URL ?? process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Set DIRECT_URL (or PRISMA_DATABASE_URL/DATABASE_URL) before running Prisma.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The CLI (migrate/seed) must use a direct connection. The application
    // runtime uses DATABASE_URL (Supabase transaction pooler) instead.
    url: databaseUrl,
  },
});
