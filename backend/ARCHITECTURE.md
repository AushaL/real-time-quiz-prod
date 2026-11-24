# Backend architecture

The backend is a **modular monolith**: one deployable NestJS application, split
into feature modules with explicit ownership, and a thin infrastructure layer.
Inside a module the usual Nest layering applies (controller → service → data),
but there is no separate domain-entity or use-case layer — the Prisma models are
the domain models for this project's scale.

This document is the contract the `lint:boundaries` check enforces.

## Module map

| Module | Owns | May depend on | Public providers (`exports`) |
| --- | --- | --- | --- |
| `quizzes/` | `Quiz`/`Question` tables, quiz reads and writes, quiz cache | redis, prisma, shared | `QuizzesService`, `QuizCacheService` |
| `admin/` | Admin HTTP API, multipart parsing, media orchestration | auth, media, quizzes, queue, shared | — |
| `auth/` | Clerk token verification, player sync (`Player` table) | prisma, shared | `ClerkService`, `ClerkAuthGuard`, `AdminGuard` |
| `media/` | Cloudinary uploads/deletes, direct-upload validation | auth, shared | `CloudinaryService` |
| `realtime/` | Game state machine, Redis room state, Socket.IO gateway | auth, redis, queue, prisma, shared | `GameCoordinatorService` |
| `jobs/` | Job dispatch (question timers, advance, media cleanup) | queue, realtime, media, shared | `JobsService` |
| `queue/` | Scheduling/publishing jobs (Vercel Queues or in-process) | shared | `QueueService` |
| `health/` | Liveness/readiness probe | prisma, shared | — |
| `prisma/`, `redis/` | Database and Redis lifecycle | shared | their services |
| `common/`, `config/` | Exception filter, env validation, shared helpers | — | — |
| `generated/` | Generated Prisma client | — | — |

"Shared" means `common`, `config` and `generated`. Everything is checked by
`.dependency-cruiser.cjs`; run `npm run lint:boundaries` (also part of CI).

## Rules

1. **One owner per table.** Quiz reads *and* writes go through
   `QuizzesService` (`quizzes/`). Admin code must not import `PrismaService` for
   quiz tables; it calls `QuizzesService.create/update/remove` and receives the
   media snapshots it needs for cleanup. Cache invalidation lives with the
   write, not with the caller.
2. **A module's public API is its `exports`.** Cross-module imports of
   providers listed above are fine; importing another module's internal file is
   a boundary violation. Add to `exports` when a dependency is intentional.
3. **Infrastructure is a leaf.** `queue/`, `prisma/`, `redis/` and
   `generated/` must never import a feature module. This is what lets admin and
   realtime share the queue without depending on each other.
4. **Dependencies point one way.** `admin → quizzes` and `jobs → realtime`;
   never the reverse. `realtime/` knows only the queue port, so the game loop
   does not depend on the dispatcher that happens to run it.
5. **Controllers are adapters.** HTTP/socket handlers translate transport into
   service calls; business decisions stay in services. Validation happens at
   the boundary (`ValidationPipe`, parsers such as `admin/quiz-form.ts`).
6. **Functional core, imperative shell.** Pure transforms (`quiz-form.ts`,
   `quiz-query.ts`, `quiz.mapper.ts`, `quiz-write.ts`) stay free of I/O and are
   unit-tested directly.

## Request flow

```text
HTTP    AdminController → AdminService ──→ QuizzesService → Prisma
                             │                    └──→ QuizCacheService → Redis
                             ├──→ CloudinaryService
                             └──→ QueueService

Socket  RealtimeGateway → GameCoordinatorService → RoomService → Redis
                                │                        └──→ Prisma (quiz snapshot)
                                └──→ RealtimeBusService → Redis pub/sub → gateway
                                └──→ QueueService

Queue   api/queue.js → JobsService → GameCoordinatorService | CloudinaryService
```

`JobsModule` is imported by `AppModule` only to instantiate the dispatcher;
producers inject `QueueService`, never `JobsService`.

## When to change the style

This shape is deliberate for a small domain, a small team and a serverless
target. Reconsider only when one of these becomes true:

- more than one team owns the backend — split the modules into packages and
  make the boundary a build-time dependency instead of a lint rule;
- question types become an extension point — introduce a strategy/port around
  question rendering and scoring;
- a second transport (gRPC, workers) needs the game engine — formalise the
  `realtime` ports (`RoomStoreClient` is already one) before adding transports;
- rich invariants appear in quizzes — add domain objects and repositories then,
  not pre-emptively.
