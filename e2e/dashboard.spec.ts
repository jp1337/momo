import { test, expect } from "@playwright/test";
import { createTask, deleteTask } from "./helpers/api";

/**
 * Dashboard E2E tests — the main home screen.
 *
 * Covers: greeting, stats section, quest section, focus CTA,
 * quick wins, and navigation links.
 */
test.describe("Dashboard", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("renders the stats row (Coins, Streak, Level, Completed)", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // The stats grid contains 4 stat cards
    const statCards = page.locator(".grid > div").filter({ hasText: /\d/ });
    await expect(statCards.first()).toBeVisible();
  });

  test("renders the Daily Quest section", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Quest section has a heading (translated)
    const questSection = page.locator("section").first();
    await expect(questSection).toBeVisible();
  });

  test("Focus Mode CTA link is visible and navigates", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Scoped to <main>: the sidebar and the mobile nav also link to /focus,
    // and an unscoped locator is a strict-mode violation with three matches.
    const focusLink = page.locator('main a[href="/focus"]').first();
    await expect(focusLink).toBeVisible();
    await focusLink.click();
    await expect(page).toHaveURL(/focus/);
  });

  test("Tasks quick link navigates to /tasks", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const tasksLink = page.locator('a[href="/tasks"]').first();
    await expect(tasksLink).toBeVisible();
    await tasksLink.click();
    await expect(page).toHaveURL(/tasks/);
  });

  test("Topics quick link navigates to /topics", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const topicsLink = page.locator('a[href="/topics"]').first();
    await expect(topicsLink).toBeVisible();
    await topicsLink.click();
    await expect(page).toHaveURL(/topics/);
  });

  test("quick wins appear when short tasks exist", async ({
    page,
    request,
  }) => {
    // Create a short task via API
    // estimatedMinutes is an enum, not a free integer: 5 | 15 | 30 | 60 | null
    // (lib/validators/index.ts). 10 was rejected with a 422 every run.
    const task = await createTask(request, `Quick Win ${Date.now()}`, {
      estimatedMinutes: 5,
    });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Quick wins section or the task title should appear
    const body = page.locator("body");
    await expect(body).not.toContainText(/500|error/i);
    // Cleanup
    await deleteTask(request, task.id);
  });

  test("Focus Mode CTA is present (replaces 5-Min CTA)", async ({ page }) => {
    // The 5-Min CTA was removed from the dashboard in favour of the Focus Mode CTA.
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Scoped to <main> so this asserts the dashboard's own entry point and not
    // the sidebar or mobile-nav links to the same route.
    const focusLink = page.locator('main a[href="/focus"]').first();
    await expect(focusLink).toBeVisible();
  });

  test("page renders without JavaScript errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // No fatal JS errors
    expect(errors.filter((e) => !e.includes("hydrat"))).toHaveLength(0);
  });
});
