/**
 * Safety checks shared by the e2e runner and e2e specs. The test suite wipes
 * tables, so it must never be possible to point it at the development or
 * production database by accident.
 */

export const TEST_DATABASE_SUFFIX = "_test";

export function databaseNameFromUrl(value: string): string | null {
  try {
    const name = new URL(value).pathname.replace(/^\//, "");
    return name || null;
  } catch {
    return null;
  }
}

export interface TestDatabaseGuardOptions {
  /** Opt out of the `_test` suffix rule for CI databases with other names. */
  allowNonTestName?: boolean;
}

export function assertTestDatabase(
  env: NodeJS.ProcessEnv = process.env,
  options: TestDatabaseGuardOptions = {},
): string {
  const testUrl = env.TEST_DATABASE_URL;
  const databaseUrl = env.DATABASE_URL;

  if (env.NODE_ENV !== "test" || !testUrl || !databaseUrl || databaseUrl !== testUrl) {
    throw new Error(
      "E2E tests must run against TEST_DATABASE_URL; use `npm run test:e2e`.",
    );
  }

  const name = databaseNameFromUrl(testUrl);
  if (!name) {
    throw new Error(`TEST_DATABASE_URL is not a valid database URL: ${testUrl}`);
  }

  const allowNonTestName =
    options.allowNonTestName ?? env.ALLOW_NON_TEST_DB === "1";
  if (!allowNonTestName && !name.toLowerCase().endsWith(TEST_DATABASE_SUFFIX)) {
    throw new Error(
      `Refusing to wipe database "${name}": the name must end with "${TEST_DATABASE_SUFFIX}" ` +
        "(set ALLOW_NON_TEST_DB=1 only if you are certain).",
    );
  }

  return name;
}
