import { test, expect } from "@playwright/test";

/**
 * Task creation E2E tests.
 */
test.describe("Task Creation", () => {
  test("N shortcut opens the quick-add modal", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Press N to open Quick Add modal
    await page.keyboard.press("n");

    // Modal should appear with a title input
    const titleInput = page
      .locator('input[placeholder*="Titel"], input[name="title"]')
      .first();
    await expect(titleInput).toBeVisible({ timeout: 3000 });
  });

  test("can create a task via the quick-add modal", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Open quick add
    await page.keyboard.press("n");

    const titleInput = page
      .locator('input[placeholder*="Titel"], input[name="title"]')
      .first();
    await expect(titleInput).toBeVisible({ timeout: 3000 });

    const taskTitle = `E2E Task ${Date.now()}`;
    await titleInput.fill(taskTitle);
    await page.keyboard.press("Enter");

    // Modal should close
    await expect(titleInput).not.toBeVisible({ timeout: 3000 });
  });

  test("Escape closes the quick-add modal without saving", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("n");

    const titleInput = page
      .locator('input[placeholder*="Titel"], input[name="title"]')
      .first();
    await expect(titleInput).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("Escape");
    await expect(titleInput).not.toBeVisible({ timeout: 3000 });
  });
});
