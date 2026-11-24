/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  // nodenext-style TS imports use "./x.js" while the file on disk is x.ts.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        // Full type-check (not isolatedModules) so decorator metadata keeps
        // working for Nest DI; TS151002 is a harmless hybrid-module warning.
        tsconfig: "<rootDir>/../tsconfig.json",
        diagnostics: { ignoreCodes: [151002] },
      },
    ],
  },
  // Unit coverage measures the layer unit tests own. HTTP controllers, the
  // gateway, bootstrap and Prisma lifecycle are exercised by the e2e suite
  // instead (see test/jest-e2e.json), so they are excluded here to keep the
  // unit report and thresholds meaningful.
  collectCoverageFrom: [
    "**/*.ts",
    "!**/*.module.ts",
    "!**/generated/**",
    "!main.ts",
    "!**/*.dto.ts",
    "!**/*.controller.ts",
    "!**/realtime.gateway.ts",
    "!bootstrap.ts",
    "!**/env.validation.ts",
    "!**/http-exception.filter.ts",
    "!**/current-user.decorator.ts",
    "!**/admin.guard.ts",
    "!**/prisma.service.ts",
  ],
  coverageDirectory: "../coverage",
  // Units own the services; HTTP controllers and the socket gateway are
  // covered by the e2e suite (see test/jest-e2e.json).
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
    "**/admin.service.ts": {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95,
    },
    "**/redis.service.ts": {
      statements: 95,
      branches: 85,
      functions: 95,
      lines: 95,
    },
    "**/cloudinary.service.ts": {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95,
    },
    "**/realtime-bus.service.ts": {
      statements: 90,
      branches: 80,
      functions: 65,
      lines: 90,
    },
    "**/redis-io.adapter.ts": {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
  },
  testEnvironment: "node",
  clearMocks: true,
};
