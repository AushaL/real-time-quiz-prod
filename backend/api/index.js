const { createLazyServer } = require("../vercel/app.cjs");

// Vercel serves this at /api/index; vercel.json rewrites /api/(.*) here so
// Nest receives the original path (/api/health, /api/quizzes, ...).
module.exports = createLazyServer();
