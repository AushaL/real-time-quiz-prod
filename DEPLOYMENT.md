# Production deployment (Vercel + Supabase + Redis)

This project deploys as two Vercel projects:

| Project | Root directory | What it serves |
| --- | --- | --- |
| `quiz-api` | `backend` | NestJS HTTP API, the Socket.IO function, and the Vercel Queues consumer |
| `quiz-web` | `frontend` | The Vite/React SPA |

The backend uses Supabase (PostgreSQL), a Redis instance (cache, room state and
the Socket.IO adapter) and Cloudinary (quiz media). Background game timers run
through Vercel Queues in production.

## 1. Before the first deploy

### Supabase

1. Create the project and take both connection strings from **Connect**:
   - **Runtime (`DATABASE_URL`)** — transaction pooler, port `6543`:
     `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require`
   - **Migrations (`DIRECT_URL`)** — direct connection (port `5432`) or the
     session pooler:
     `postgresql://postgres.<ref>:<password>@db.<ref>.supabase.co:5432/postgres?sslmode=require`

   The backend refuses to start in production when `DATABASE_URL` uses the
   direct `db.<project>.supabase.co` host, when a remote URL has no
   `sslmode=require` (or stricter), or when `DIRECT_URL` points at the
   transaction pooler.

2. Apply migrations from your machine or CI **before** deploying the backend.
   Do not run migrations in the Vercel build: builds can overlap and the build
   environment should not own schema changes.

   ```bash
   cd backend
   DIRECT_URL='<direct-url>' npx prisma migrate deploy
   # optional: DIRECT_URL='<direct-url>' npm run seed
   ```

   `prisma.config.ts` prefers `PRISMA_DATABASE_URL`, then `DIRECT_URL`, then
   `DATABASE_URL`, so the CLI always has an explicit target.

### Redis

Provision a Redis database (Vercel Marketplace, Upstash, Redis Cloud, …) in a
region close to the backend functions and Supabase, and copy its TLS URL
(`rediss://...`). Redis is required: it stores cached quiz reads, room/game
state, and fans Socket.IO broadcasts out across function instances.

### Clerk

Use the production Clerk instance and set the backend `CLERK_SECRET_KEY` plus
the frontend `VITE_CLERK_PUBLISHABLE_KEY`. Add the frontend production origin
(for example `https://quiz.example.com`) to the allowed origins and redirect
URLs. The app redirects sign-in/sign-up to `/auth-callback`.

### Cloudinary

Create a Cloudinary account and set `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` on the backend only. Admin
media is uploaded **browser → Cloudinary** using a short-lived signature from
`POST /api/media/signature`; the asset then reaches the API as
`mediaUrl` + `mediaPublicId` in the JSON payload. This keeps uploads below
Vercel's 4.5 MB request-body limit. Only assets in the `quiz-media/` folder of
this Cloudinary account are accepted.

## 2. Backend Vercel project

Create a project from the repository, set **Root Directory** to `backend`, and
keep the framework preset on **Other**. `backend/vercel.json` configures the
build command, Fluid Compute, function durations and the queue trigger.

Recommended Node.js version: **24.x** (Node 20 is deprecated on Vercel on
2026-10-01).

### Environment variables

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase transaction-pooler URL from above |
| `DIRECT_URL` | Supabase direct/session URL (also validated at cold start) |
| `REDIS_URL` | `rediss://...` Redis URL |
| `FRONTEND_URL` | Exact frontend origin, e.g. `https://quiz.example.com` (comma-separated for several) |
| `SOCKET_PATH` | `/socket.io` — keep the default; do **not** set the full Vercel function path |
| `QUESTION_TIMEOUT_MS` | `60000` (or your preferred timer) |
| `REVEAL_DELAY_MS` | `4000` |
| `QUEUE_DRIVER` | `vercel` |
| `QUIZ_CACHE_TTL_SECONDS` | `60` (optional) |
| `CLERK_SECRET_KEY` | Clerk production secret key |
| `ADMIN_EMAIL` | Email of the single quiz administrator |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

Pin the function region to the Supabase/Redis region in the project settings
(for example `iad1` for both services in `us-east-1`). Cross-region database
and Redis calls dominate latency in this app.

### Functions

| Function | Purpose | Configuration |
| --- | --- | --- |
| `api/index.js` | NestJS HTTP API; `vercel.json` rewrites `/api/*` here while preserving the original path | `maxDuration: 300` |
| `api/socket-io.js` | Socket.IO server exported as a Node HTTP server (WebSocket-only) | `maxDuration: 800` (Hobby still caps at 300) |
| `api/queue.js` | Vercel Queues consumer for `quiz-jobs` | `maxDuration: 300`, queue trigger |

The Socket.IO routing has two parts: a dedicated rewrite sends
`/api/socket-io/*` to the socket function, and the catch-all `/api/*` rewrite
explicitly excludes `/api/socket-io` so it cannot swallow the WebSocket
handshake. The function entry point then removes the `/api/socket-io` mount
prefix before handing the request to Socket.IO, which is why the backend keeps
`SOCKET_PATH=/socket.io` while the client uses
`/api/socket-io/socket.io`.

### Vercel Queues

Queues are in public beta. Enable them for the team/project if the dashboard
asks, then deploy the backend. The consumer is registered declaratively in
`backend/vercel.json`:

```json
{
  "functions": {
    "api/queue.js": {
      "experimentalTriggers": [{ "type": "queue/v2beta", "topic": "quiz-jobs" }]
    }
  }
}
```

The topic is created on the first publish. Publishing and consumption both use
`@vercel/queue`; jobs use idempotency keys for question timers, and delivery is
at-least-once, so handlers tolerate duplicates. If publishing fails, the API
logs the error and falls back to an in-process timer so the match can finish.

## 3. Frontend Vercel project

Create a second project with **Root Directory** `frontend` and the **Vite**
framework preset. `frontend/vercel.json` adds the SPA fallback rewrite.

Vite reads these variables at **build time**; changing any of them requires a
redeploy.

| Variable | Value |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk production publishable key |
| `VITE_API_URL` | Backend origin, e.g. `https://quiz-api.vercel.app` (no trailing slash) |
| `VITE_SOCKET_URL` | Backend origin (may be omitted; it falls back to `VITE_API_URL`) |
| `VITE_SOCKET_PATH` | `/api/socket-io/socket.io` |

`VITE_API_URL` is only the Axios base URL; API calls already include the
`/api` prefix.

## 4. Platform limits to keep in mind

- **Request/response body: 4.5 MB.** That is why media goes directly to
  Cloudinary. Other large payloads must be streamed or chunked.
- **Socket.IO connections are pinned to one function instance** and are closed
  when the function reaches `maxDuration`: 300 s on Hobby, 800 s on
  Pro/Enterprise. The client reconnects with backoff and re-sends `room:join`;
  room and game state live in Redis, so the player resumes the same seat.
- **WebSockets require Fluid Compute.** It is enabled in `backend/vercel.json`.
- **Queues delivery is at-least-once.** Jobs are safe to replay.
- **Use WebSocket transport only.** HTTP long-polling is not supported for
  Vercel Functions; the client and server both force `transports: ["websocket"]`.

## 5. Smoke-test checklist

1. `GET https://<backend>/api/health` returns `200` with `database: "up"`.
2. Open the frontend, sign in with Clerk, and confirm no CORS or 401 errors.
3. As the `ADMIN_EMAIL` user, create a quiz with an image and an audio file;
   verify the assets are in Cloudinary under `quiz-media/` and the quiz renders.
4. Edit the quiz, replace one asset, then delete the quiz; check that replaced
   assets are removed by the media-cleanup job.
5. Play a solo quiz to the end and verify scores and explanations.
6. In two browser profiles, create a room, join with the second user, start the
   game, answer, and check reveal, scores and chat on both sides.
7. Close one player's tab and reopen it during a question; the client should
   reconnect to the same room and question.
8. Leave a match idle past the configured question timeout; the queued job
   should advance the game without any browser keeping the function alive.
9. Keep a socket connected past the free-plan 300 s cap; it should reconnect
   and rejoin automatically.
10. Trigger a new deployment during a match; clients should reconnect to the
    new instance without losing room state.
11. Update a quiz and reload the home page immediately; the Redis cache should
    be invalidated and show the new data.

## 6. Deploying and rolling back

```bash
cd backend
DIRECT_URL='<direct-url>' npx prisma migrate deploy
vercel --prod

cd ../frontend
vercel --prod
```

Apply migrations before deploying code that needs them. Vercel rollbacks revert
code, not schema, so keep migrations backward-compatible for at least one
release (add columns/tables first, remove them in a later deploy).
