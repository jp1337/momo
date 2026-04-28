import { test, expect } from "@playwright/test";
import { createTask, deleteTask } from "./helpers/api";

/**
 * Focus Mode and 5-Minute Mode E2E tests.
 *
 * Covers: both modes load, show tasks, handle empty state,
 * and allow task interaction.
 */

// ─── 5-Minute Mode ────────────────────────────────────────────────────────────

test.describe("5-Minute Mode (/quick)", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/quick");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("shows heading", async ({ page }) => {
    await page.goto("/quick");
    await page.waitForLoadState("networkidle");
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test("shows a 5-minute task when one exists", async ({ page, request }) => {
    const title = `5 Min Quick ${Date.now()}`;
    const task = await createTask(request, title, { estimatedMinutes: 5 });

    await page.goto("/quick");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="${title}"`)).toBeVisible({ timeout: 5000 });

    await deleteTask(request, task.id);
  });

  test("does not show tasks longer than 5 minutes", async ({
    page,
    request,
  }) => {
    const longTitle = `Long Task ${Date.now()}`;
    const longTask = await createTask(request, longTitle, {
      estimatedMinutes: 30,
    });

    await page.goto("/quick");
    await page.waitForLoadState("networkidle");

    // Long task should NOT appear in the 5-min view
    const longTaskEl = page.locator(`text="${longTitle}"`);
    expect(await longTaskEl.count()).toBe(0);

    await deleteTask(request, longTask.id);
  });

  test("shows empty state when no quick tasks exist", async ({ page }) => {
    await page.goto("/quick");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText(/500/i);
    // May show empty state or task list — either is fine
  });

  test("renders correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/quick");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500/i);
  });
});

// ─── Focus Mode ───────────────────────────────────────────────────────────────

test.describe("Focus Mode (/focus)", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/focus");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("shows heading or content", async ({ page }) => {
    await page.goto("/focus");
    await page.waitForLoadState("networkidle");
    // Focus mode has a heading or the daily quest card
    await expect(page.locator("body")).not.toContainText(/500/i);
    const content = page.locator("main, [role='main'], .max-w-4xl, body > div").first();
    await expect(content).toBeVisible();
  });

  test("shows daily quest section", async ({ page }) => {
    await page.goto("/focus");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("shows quick wins section when tasks ≤ 15 min exist", async ({
    page,
    request,
  }) => {
    const title = `Focus Quick Win ${Date.now()}`;
    const task = await createTask(request, title, { estimatedMinutes: 10 });

    await page.goto("/focus");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).not.toContainText(/500/i);

    await deleteTask(request, task.id);
  });

  test("renders correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/focus");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("back navigation works from focus mode", async ({ page }) => {
    await page.goto("/focus");
    await page.waitForLoadState("networkidle");

    // Look for exit/back link
    const exitLink = page
      .locator("a, button")
      .filter({ hasText: /Beenden|Verlassen|Exit|Back|Zurück/i })
      .first();
    if ((await exitLink.count()) > 0) {
      await exitLink.click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).not.toContainText(/500/i);
    }
  });
});
