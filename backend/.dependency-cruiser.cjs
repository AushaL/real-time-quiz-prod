/**
 * Module boundaries for the backend modular monolith.
 *
 * Each feature folder is a module. A module may use shared infrastructure
 * (prisma, redis, common, config, generated) and only the feature modules
 * named in its allow-list; everything else is a violation. See
 * ARCHITECTURE.md for the rationale.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "A cycle means two modules own each other; invert one edge instead.",
      from: {},
      to: { circular: true },
    },
    {
      name: "generated-is-a-leaf",
      severity: "error",
      comment: "The generated Prisma client must never depend on application code.",
      from: { path: "^src/generated/" },
      to: { path: "^src/", pathNot: "^src/generated/" },
    },
    {
      name: "queue-is-a-leaf",
      severity: "error",
      comment: "QueueService schedules jobs; it must not know handlers or features.",
      from: { path: "^src/queue/" },
      to: {
        path: "^src/",
        pathNot: "^src/(queue|common|config)/",
      },
    },
    {
      name: "prisma-is-a-leaf",
      severity: "error",
      comment: "PrismaModule is infrastructure and must not import features.",
      from: { path: "^src/prisma/" },
      to: {
        path: "^src/",
        pathNot: "^src/(prisma|common|config|generated)/",
      },
    },
    {
      name: "redis-is-a-leaf",
      severity: "error",
      comment: "RedisModule is infrastructure and must not import features.",
      from: { path: "^src/redis/" },
      to: {
        path: "^src/",
        pathNot: "^src/(redis|common|config|generated)/",
      },
    },
    {
      name: "auth-boundary",
      severity: "error",
      comment: "auth owns identity only; it must not depend on feature modules.",
      from: { path: "^src/auth/" },
      to: {
        path: "^src/",
        pathNot: "^src/(auth|prisma|common|config|generated)/",
      },
    },
    {
      name: "media-boundary",
      severity: "error",
      comment: "media owns Cloudinary access; it may only reuse auth guards.",
      from: { path: "^src/media/" },
      to: {
        path: "^src/",
        pathNot: "^src/(media|auth|prisma|common|config|generated)/",
      },
    },
    {
      name: "quizzes-boundary",
      severity: "error",
      comment:
        "quizzes owns quiz data and caching; write access belongs here, not in admin.",
      from: { path: "^src/quizzes/" },
      to: {
        path: "^src/",
        pathNot: "^src/(quizzes|redis|prisma|common|config|generated)/",
      },
    },
    {
      name: "admin-boundary",
      severity: "error",
      comment:
        "admin orchestrates quizzes and media; it must not reach into realtime or game state.",
      from: { path: "^src/admin/" },
      to: {
        path: "^src/",
        pathNot:
          "^src/(admin|auth|media|quizzes|queue|prisma|common|config|generated)/",
      },
    },
    {
      name: "realtime-boundary",
      severity: "error",
      comment:
        "realtime owns the game loop; it must not depend on admin, quizzes or the job dispatcher.",
      from: { path: "^src/realtime/" },
      to: {
        path: "^src/",
        pathNot:
          "^src/(realtime|auth|redis|queue|prisma|common|config|generated)/",
      },
    },
    {
      name: "jobs-boundary",
      severity: "error",
      comment:
        "jobs is the application dispatcher: it may call realtime and media handlers, nothing else.",
      from: { path: "^src/jobs/" },
      to: {
        path: "^src/",
        pathNot: "^src/(jobs|queue|media|realtime|prisma|common|config|generated)/",
      },
    },
    {
      name: "health-boundary",
      severity: "error",
      comment: "health only probes infrastructure.",
      from: { path: "^src/health/" },
      to: {
        path: "^src/",
        pathNot: "^src/(health|prisma|redis|common|config|generated)/",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    // The Prisma client is generated code with intentional internal cycles.
    exclude: { path: "^src/generated/" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
