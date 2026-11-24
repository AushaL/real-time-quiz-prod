import { validateDatabaseEnvironment } from "./database.config";

const supabaseRuntime =
  "postgresql://postgres.ref:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require";
const supabaseDirect =
  "postgresql://postgres.ref:secret@db.ref.supabase.co:5432/postgres?sslmode=require";

describe("validateDatabaseEnvironment", () => {
  it("ignores non-production environments", () => {
    expect(() =>
      validateDatabaseEnvironment({
        NODE_ENV: "development",
        DATABASE_URL: "not a url",
      }),
    ).not.toThrow();
  });

  it("accepts pooled runtime and direct migration URLs", () => {
    expect(() =>
      validateDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: supabaseRuntime,
        DIRECT_URL: supabaseDirect,
      }),
    ).not.toThrow();
  });

  it("accepts local databases without TLS in production", () => {
    expect(() =>
      validateDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://quiz:quiz@localhost:5432/quiz",
      }),
    ).not.toThrow();
  });

  it("requires DATABASE_URL", () => {
    expect(() =>
      validateDatabaseEnvironment({ NODE_ENV: "production" }),
    ).toThrow("DATABASE_URL is required in production.");
  });

  it("rejects malformed and non-postgres URLs", () => {
    expect(() =>
      validateDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: "https://example.com",
      }),
    ).toThrow("DATABASE_URL must use the postgresql:// scheme.");

    expect(() =>
      validateDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://",
      }),
    ).toThrow("DATABASE_URL is not a valid URL.");
  });

  it("requires TLS for remote databases", () => {
    expect(() =>
      validateDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: supabaseRuntime.replace("&sslmode=require", ""),
      }),
    ).toThrow("DATABASE_URL must include sslmode=require");

    expect(() =>
      validateDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL:
          "postgresql://user:secret@db.example.com:5432/postgres?sslmode=disable",
      }),
    ).toThrow("DATABASE_URL must include sslmode=require");
  });

  it("requires DIRECT_URL for Supabase and validates its TLS", () => {
    expect(() =>
      validateDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: supabaseRuntime,
      }),
    ).toThrow("DIRECT_URL is required in production for Supabase migrations.");

    expect(() =>
      validateDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: supabaseRuntime,
        DIRECT_URL:
          "postgresql://postgres.ref:secret@db.ref.supabase.co:5432/postgres",
      }),
    ).toThrow("DIRECT_URL must include sslmode=require");
  });

  it("rejects the direct host as the runtime connection", () => {
    expect(() =>
      validateDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: supabaseDirect,
        DIRECT_URL: supabaseDirect,
      }),
    ).toThrow("DATABASE_URL must use the Supabase pooler");
  });

  it("rejects the transaction pooler for migrations", () => {
    expect(() =>
      validateDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: supabaseRuntime,
        DIRECT_URL: supabaseRuntime,
      }),
    ).toThrow("DIRECT_URL must not use the transaction pooler");
  });

  it("allows the session pooler for migrations", () => {
    expect(() =>
      validateDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: supabaseRuntime,
        DIRECT_URL:
          "postgresql://postgres.ref:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require",
      }),
    ).not.toThrow();
  });
});
