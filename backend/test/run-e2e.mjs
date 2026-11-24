import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

config({ path: path.join(root, ".env.local"), quiet: true });
config({ path: path.join(root, ".env"), quiet: true });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  console.error("TEST_DATABASE_URL is not set; refusing to run e2e tests.");
  process.exit(1);
}

// The suite wipes tables, so refuse anything that does not look like a
// throwaway database. Mirrors src/config/test-database.ts; this check has to
// run before `prisma migrate deploy` touches the schema.
function databaseName(url) {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

const testDatabaseName = databaseName(testDatabaseUrl);
if (!testDatabaseName) {
  console.error("TEST_DATABASE_URL is not a valid database URL; refusing to run.");
  process.exit(1);
}

const allowNonTestName = process.env.ALLOW_NON_TEST_DB === "1";
if (!allowNonTestName && !testDatabaseName.toLowerCase().endsWith("_test")) {
  console.error(
    `Refusing to wipe database "${testDatabaseName}": the name must end with "_test" ` +
      "(set ALLOW_NON_TEST_DB=1 only if you are certain).",
  );
  process.exit(1);
}

console.log(`E2E database: ${testDatabaseName}`);

const env = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: testDatabaseUrl,
  // prisma.config.ts reads this for migrate/seed.
  PRISMA_DATABASE_URL: testDatabaseUrl,
  // ConfigModule reads .env at import time, so the override has to be in the
  // process environment before Jest starts.
  ADMIN_EMAIL: "admin@test.dev",
  // Keep multiplayer tests fast and deterministic without Vercel Queues.
  QUEUE_DRIVER: "local",
  QUESTION_TIMEOUT_MS: "60000",
  REVEAL_DELAY_MS: "100",
};

const require = createRequire(import.meta.url);

function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run([require.resolve("prisma/build/index.js"), "migrate", "deploy"]);

run([
  "--experimental-vm-modules",
  require.resolve("jest/bin/jest"),
  "--config",
  "test/jest-e2e.json",
  "--runInBand",
  ...process.argv.slice(2),
]);
