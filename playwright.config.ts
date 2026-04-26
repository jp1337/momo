import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration for Momo.
 *
 * Tests require a running dev server. Start it with:
 *   PLAYWRIGHT_TEST_PASSWORD=test-secret npm run dev
 *
 * Then run tests with:
 *   PLAYWRIGHT_TEST_PASSWORD=test-secret npx playwright test
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
