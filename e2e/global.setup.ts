import { test as setup } from "@playwright/test";
import path from "path";
import fs from "fs";

const authFile = "e2e/.auth/user.json";

/**
 * Global auth setup — logs in once with the test-only credentials provider
 * and saves the session state for all subsequent tests.
 *
 * Prerequisites:
 *   - Dev server running with PLAYWRIGHT_TEST_PASSWORD set
 *   - Auth.js credentials provider enabled (auto-enabled when env var is set)
 */
setup("authenticate", async ({ page }) => {
  const testPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;
  if (!testPassword) {
    throw new Error(
      "PLAYWRIGHT_TEST_PASSWORD is not set. Set it and restart the dev server."
    );
  }

  // Navigate to the login page
  await page.goto("/login");

  // Auth.js renders provider buttons. The test-credentials provider renders
  // a form with email/password inputs when NODE_ENV !== "production".
  // Click the "Test Credentials" sign-in button to reveal the form.
  const signInBtn = page.locator("button", { hasText: /Test Credentials/i });
  if (await signInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await signInBtn.click();
  }

  await page.fill('input[name="email"]', "e2e@momotest.local");
  await page.fill('input[name="password"]', testPassword);
  await page.click('button[type="submit"]');

  // Wait for redirect after login
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 10_000,
  });

  // Ensure auth directory exists
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
