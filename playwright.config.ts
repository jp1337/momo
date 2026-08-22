import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration for Momo.
 *
 * Tests require a running dev server. Start it with a plain:
 *   npm run dev
 *
 * Then run tests with (DATABASE_URL must point at the same database the
 * dev server uses — e2e/global.setup.ts seeds a session row directly):
 *   DATABASE_URL=postgresql://... npx playwright test
 *
 * Do NOT set PLAYWRIGHT_TEST_PASSWORD (Task B8, 2026-08-22 — this file
 * used to tell you to). Setting it makes lib/auth.ts register a
 * Credentials provider. Auth.js does not support Credentials together
 * with `session.strategy: "database"` (see lib/auth.ts) and rejects the
 * entire configuration with `UnsupportedStrategy` at request time — every
 * auth call then returns 500 and every protected route redirects to
 * /login, breaking the whole app, not just sign-in. This is also why
 * global.setup.ts does not drive a login form: it seeds a session row
 * directly in the database and saves it as Playwright storage state,
 * which is what an adapter-backed OAuth login would have written anyway,
 * and needs no test-only provider at all.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Global auth setup — must run first
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
    },
    // All E2E tests — reuse auth state from setup
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  // No webServer config — start the dev server manually
});
