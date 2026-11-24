import {
  assertTestDatabase,
  databaseNameFromUrl,
  TEST_DATABASE_SUFFIX,
} from "./test-database";

const TEST_URL = "postgresql://quiz:quiz@localhost:5432/quiz_test?schema=public";

function env(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    DATABASE_URL: TEST_URL,
    TEST_DATABASE_URL: TEST_URL,
    ...overrides,
  };
}

describe("databaseNameFromUrl", () => {
  it("extracts the database name from a PostgreSQL URL", () => {
    expect(databaseNameFromUrl(TEST_URL)).toBe("quiz_test");
  });

  it("returns null for invalid URLs and missing names", () => {
    expect(databaseNameFromUrl("not a url")).toBeNull();
    expect(databaseNameFromUrl("postgresql://localhost:5432")).toBeNull();
  });
});

describe("assertTestDatabase", () => {
  it("accepts a dedicated test database", () => {
    expect(assertTestDatabase(env())).toBe("quiz_test");
  });

  it("requires the test runner to point DATABASE_URL at TEST_DATABASE_URL", () => {
    expect(() =>
      assertTestDatabase(env({ DATABASE_URL: "postgresql://localhost/quiz" })),
    ).toThrow("E2E tests must run against TEST_DATABASE_URL");

    expect(() => assertTestDatabase(env({ TEST_DATABASE_URL: undefined }))).toThrow(
      "E2E tests must run against TEST_DATABASE_URL",
    );

    expect(() => assertTestDatabase(env({ NODE_ENV: "development" }))).toThrow(
      "E2E tests must run against TEST_DATABASE_URL",
    );
  });

  it("rejects a database without the _test suffix", () => {
    const production = "postgresql://quiz:quiz@db.example.com:5432/quiz";
    expect(() =>
      assertTestDatabase({
        NODE_ENV: "test",
        DATABASE_URL: production,
        TEST_DATABASE_URL: production,
      }),
    ).toThrow(`must end with "${TEST_DATABASE_SUFFIX}"`);
  });

  it("allows an explicit opt-out for unusual CI database names", () => {
    const ci = "postgresql://quiz:quiz@localhost:5432/ci_database";
    const testEnv = {
      NODE_ENV: "test",
      DATABASE_URL: ci,
      TEST_DATABASE_URL: ci,
    };

    expect(() => assertTestDatabase(testEnv)).toThrow("must end with");
    expect(assertTestDatabase(testEnv, { allowNonTestName: true })).toBe(
      "ci_database",
    );
    expect(
      assertTestDatabase({ ...testEnv, ALLOW_NON_TEST_DB: "1" }),
    ).toBe("ci_database");
  });

  it("rejects malformed URLs", () => {
    expect(() =>
      assertTestDatabase({
        NODE_ENV: "test",
        DATABASE_URL: "nonsense",
        TEST_DATABASE_URL: "nonsense",
      }),
    ).toThrow("not a valid database URL");
  });
});
