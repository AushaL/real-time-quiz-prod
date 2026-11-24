export interface DatabaseEnvironment {
  NODE_ENV?: string;
  DATABASE_URL?: string;
  DIRECT_URL?: string;
}

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "postgres",
  "host.docker.internal",
]);

const SECURE_SSL_MODES = new Set(["require", "verify-ca", "verify-full"]);

/**
 * Production guard rails for the Supabase connection strings:
 * - DATABASE_URL (used by the app) must be the pooled connection;
 * - DIRECT_URL (used by Prisma migrate/seed) must not use the transaction
 *   pooler, because migrations need a session;
 * - any non-local database must opt into TLS explicitly.
 *
 * Development and test environments are intentionally exempt so local Docker
 * and the e2e database keep working without TLS parameters.
 */
export function validateDatabaseEnvironment(
  env: DatabaseEnvironment = process.env,
): void {
  if (env.NODE_ENV !== "production") return;

  const runtime = parsePostgresUrl("DATABASE_URL", env.DATABASE_URL);
  assertSecureSsl("DATABASE_URL", runtime);

  if (isSupabase(runtime.hostname) && isSupabaseDirectHost(runtime.hostname)) {
    throw new Error(
      "DATABASE_URL must use the Supabase pooler (port 6543 transaction mode or the session pooler), not the direct db.<project>.supabase.co host.",
    );
  }

  if (!env.DIRECT_URL) {
    if (isSupabase(runtime.hostname)) {
      throw new Error(
        "DIRECT_URL is required in production for Supabase migrations. Use the direct connection (db.<project>.supabase.co:5432) or the session pooler with sslmode=require.",
      );
    }
    return;
  }

  const direct = parsePostgresUrl("DIRECT_URL", env.DIRECT_URL);
  assertSecureSsl("DIRECT_URL", direct);

  const usesTransactionPooler =
    direct.port === "6543" ||
    direct.searchParams.get("pgbouncer") === "true";
  if (usesTransactionPooler) {
    throw new Error(
      "DIRECT_URL must not use the transaction pooler (port 6543 / pgbouncer=true); Prisma migrations need a direct or session-mode connection on port 5432.",
    );
  }
}

function parsePostgresUrl(name: string, value: string | undefined): URL {
  if (!value) {
    throw new Error(`${name} is required in production.`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} is not a valid URL.`);
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error(`${name} must use the postgresql:// scheme.`);
  }

  if (!url.hostname) {
    throw new Error(`${name} is not a valid URL.`);
  }

  return url;
}

function assertSecureSsl(name: string, url: URL): void {
  if (LOCAL_HOSTS.has(url.hostname)) return;

  const sslmode = url.searchParams.get("sslmode");
  if (!sslmode || !SECURE_SSL_MODES.has(sslmode)) {
    throw new Error(
      `${name} must include sslmode=require (or verify-ca/verify-full) for a remote database.`,
    );
  }
}

function isSupabase(hostname: string): boolean {
  return /\.supabase\.(co|com)$/i.test(hostname);
}

function isSupabaseDirectHost(hostname: string): boolean {
  return /^db\..+\.supabase\.co$/i.test(hostname);
}
