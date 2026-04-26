import { test, expect } from "@playwright/test";

/**
 * Navigation E2E tests — authenticated user can navigate the app.
 */
test.describe("App Navigation", () => {
  test("dashboard loads after login", async ({ page }) => {
    await page.goto("/dashboard");
    // Should not redirect to login — auth is set via storageState
    await expect(page).not.toHaveURL(/login/);
    await expect(page).toHaveURL(/dashboard/);
  });

  test("can navigate to topics page", async ({ page }) => {
    await page.goto("/topics");
    await expect(page).not.toHaveURL(/login/);
    // Topics page should have some heading
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("can navigate to progress page", async ({ page }) => {
    await page.goto("/progress");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("can navigate to settings page", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).not.toHaveURL(/login/);
  });
});
