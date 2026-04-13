/**
 * Vitest configuration for Momo integration tests.
 *
 * Tests run against a separate `momo_test` PostgreSQL database (not dev/prod).
 * Required setup before running tests:
 *   createdb momo_test
 *   DATABASE_URL=postgresql://localhost/momo_test npx drizzle-kit migrate
 *
 * Override the test DB via the TEST_DATABASE_URL environment variable.
 */

import path from "path";
import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://momo:momo_dev_password@localhost:5432/momo_test";

export default defineConfig({
  test: {
    /** Inject required env vars into every test worker before any imports run */
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      AUTH_SECRET: "vitest-auth-secret-at-least-32-characters-long!!",
      NODE_ENV: "test",
    },

    /** Run migrations once before all tests (main process) */
    globalSetup: ["./__tests__/helpers/global-setup.ts"],

    /** Reset DB user-data and seed achievements before each test file */
    setupFiles: ["./__tests__/helpers/setup.ts"],

    /** 30 s — DB queries can be slow in CI */
    testTimeout: 30_000,
    hookTimeout: 30_000,

    /** Only pick up files inside __tests__/ */
    include: ["__tests__/**/*.test.ts"],
  },

  resolve: {
    /** Mirror the @/* path alias from tsconfig.json */
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
