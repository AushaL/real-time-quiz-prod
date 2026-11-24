# Backend (NestJS + Prisma + PostgreSQL)

The module structure and its dependency rules are described in
[`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Local setup

```bash
cp .env.example .env   # fill in Clerk, Cloudinary and database values
npm ci
npm run db:up          # PostgreSQL 16 + Redis 7 in Docker
npm run prisma:deploy  # apply migrations
npm run seed           # optional: load the seed quizzes
npm run dev
```

`npm run db:*` uses `scripts/docker-compose.mjs` because a global npm package
named `docker` shadows the Docker CLI on some machines.

## Tests

| Command | What it runs |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint:boundaries` | Module boundary rules (dependency-cruiser) |
| `npm test` | Unit tests |
| `npm run test:cov` | Unit tests + coverage thresholds (services, Redis, queues, realtime helpers) |
| `npm run test:e2e` | HTTP + Socket.IO e2e against a real PostgreSQL test database |
| `npm run test:e2e:cov` | E2E + coverage thresholds (controllers, gateway, bootstrap) |

Unit coverage deliberately excludes controllers, the gateway and Prisma
lifecycle code — those are measured by the e2e suite. Both commands fail the
build when coverage drops below the configured thresholds.

### Test database

E2E tests wipe tables, so they only run against `TEST_DATABASE_URL`, and the
database name must end with `_test` (for example `quiz_test`). The runner
checks this before `prisma migrate deploy`; the same guard runs again inside
the specs via `assertTestDatabase`.

```bash
TEST_DATABASE_URL=postgresql://quiz:quiz@localhost:5432/quiz_test \
  npm run test:e2e
```

Set `ALLOW_NON_TEST_DB=1` only for a CI database whose name cannot follow the
convention. `test/run-e2e.mjs` also forces `QUEUE_DRIVER=local` and short
reveal delays, so the suite does not need Vercel Queues.

## CI

`.github/workflows/ci.yml` runs on pushes and pull requests to `main`:

- backend: install → prisma generate → typecheck → module boundaries → unit
  coverage → e2e coverage (with PostgreSQL and Redis service containers) → build;
- frontend: install → build.

## Production

The backend deploys to Vercel as a plain Node.js project (`api/index.js` for
HTTP, `api/socket-io.js` for WebSockets, `api/queue.js` for Vercel Queues).
Supabase provides PostgreSQL; the runtime uses the transaction pooler
(`DATABASE_URL`) while Prisma migrations use the direct connection
(`DIRECT_URL`). Redis backs both the quiz cache and the Socket.IO adapter.

See [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for the full environment-variable
list, queue setup, migration procedure, platform limits and smoke-test
checklist.

On Vercel:

- keep `SOCKET_PATH=/socket.io`; the Vercel function is mounted at
  `/api/socket-io`, so clients use `/api/socket-io/socket.io`;
- set `QUEUE_DRIVER=vercel` so question timers survive a recycled instance;
- do not run `prisma migrate deploy` in the build — run it from CI or locally
  before deploying.
