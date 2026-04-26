import { test, expect } from "@playwright/test";

/**
 * Progress page E2E tests — habits, achievements, weekly review.
 */
test.describe("Progress Page", () => {
  test("loads the progress page with tabs", async ({ page }) => {
    await page.goto("/progress");
    await expect(page).not.toHaveURL(/login/);

    // Should have tab navigation
    const tabs = page.locator('[role="tab"], a[href*="tab="]');
    await expect(tabs.first()).toBeVisible();
  });

  test("can switch to achievements tab", async ({ page }) => {
    await page.goto("/progress?tab=achievements");
    await expect(page).not.toHaveURL(/login/);
    // Should not show an error
    await expect(page.locator("body")).not.toContainText(/500|Error|error/);
  });

  test("can switch to habits tab", async ({ page }) => {
    await page.goto("/progress?tab=habits");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Error|error/);
  });
});
