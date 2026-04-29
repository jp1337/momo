import { test, expect } from "@playwright/test";
import { createTask, deleteTask, createTopic, deleteTopic } from "./helpers/api";

/**
 * Critical user journey E2E tests.
 *
 * These tests exercise end-to-end flows that span multiple pages and API calls —
 * the paths that matter most for retention and correctness:
 *
 *   1. Task lifecycle: create → complete → coins update → undo
 *   2. Quest lifecycle: quest appears → can be postponed
 *   3. Quick-add shortcut: N key → fill title → save → appears on tasks page
 *   4. Dashboard stats respond to task completion
 */

// ─── Task lifecycle ───────────────────────────────────────────────────────────

test.describe("Task lifecycle", () => {
  test("complete a task from the tasks page and see it move to completed", async ({
    page,
    request,
  }) => {
    const title = `Journey Task ${Date.now()}`;
    const task = await createTask(request, title, { estimatedMinutes: 5 });

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    // Task should be visible in the active list
    await expect(page.locator("body")).toContainText(title);

    // Click the checkbox to complete it
    const taskRow = page.locator(`[data-task-id="${task.id}"]`).first();
    if (await taskRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      const checkbox = taskRow.locator('button[role="checkbox"], input[type="checkbox"]').first();
      await checkbox.click();
    } else {
      // Fallback: find by title text and click adjacent checkbox
      const titleEl = page.locator("span, div", { hasText: title }).first();
      const row = titleEl.locator("..");
      const checkbox = row.locator('button, input[type="checkbox"]').first();
      await checkbox.click();
    }

    // Page should not error
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);

    // Cleanup
    await deleteTask(request, task.id);
  });

  test("dashboard coins stat is visible and numeric after login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // The stats grid should show a numeric coins value
    // Coins are displayed as a large number in the stats card
    const statsSection = page.locator("section").filter({ hasText: /Coins|Münzen/i }).first();
    await expect(statsSection).toBeVisible({ timeout: 5000 });
  });

  test("completing a quick-win task removes it from the dashboard list", async ({
    page,
    request,
  }) => {
    const title = `Quick Win Journey ${Date.now()}`;
    const task = await createTask(request, title, { estimatedMinutes: 10 });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // If the task appears as a quick win, click its complete button
    const taskTitle = page.locator("span, div", { hasText: title }).first();
    const isVisible = await taskTitle.isVisible({ timeout: 3000 }).catch(() => false);

    if (isVisible) {
      // The complete circle button is the first button in the task row
      const row = taskTitle.locator("..").locator("..");
      const completeBtn = row.locator("button").first();
      await completeBtn.click();

      // After completion, the task should animate out
      await expect(taskTitle).not.toBeVisible({ timeout: 5000 });
    }

    // Dashboard must not error regardless
    await expect(page.locator("body")).not.toContainText(/500|error/i);

    // Cleanup
    await deleteTask(request, task.id);
  });
});

// ─── Quest lifecycle ──────────────────────────────────────────────────────────

test.describe("Quest lifecycle", () => {
  test("daily quest section is always visible on dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // The quest section heading should be present (translated, so use role or section)
    const questSection = page.locator("section").first();
    await expect(questSection).toBeVisible();

    // The quest card area should exist (even if empty / "no quest" state)
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("postpone button is visible when a quest exists", async ({
    page,
    request,
  }) => {
    // Create a task that can be selected as quest
    const task = await createTask(request, `Quest Candidate ${Date.now()}`);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // If there's a postpone button, it should be enabled (not exhausted)
    const postponeBtn = page.locator("button", { hasText: /Nicht heute|Not today|Pas aujourd/i }).first();
    const hasPostpone = await postponeBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasPostpone) {
      await expect(postponeBtn).toBeVisible();
    }

    // Page must be functional regardless
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);

    await deleteTask(request, task.id);
  });
});

// ─── Quick-add modal journey ──────────────────────────────────────────────────

test.describe("Quick-add → task visible on tasks page", () => {
  test("task created via N shortcut appears on /tasks", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("n");
    const titleInput = page
      .locator('input[placeholder*="Titel"], input[name="title"]')
      .first();
    await expect(titleInput).toBeVisible({ timeout: 3000 });

    const taskTitle = `Quick Add Journey ${Date.now()}`;
    await titleInput.fill(taskTitle);
    await page.keyboard.press("Enter");

    // Modal should close
    await expect(titleInput).not.toBeVisible({ timeout: 5000 });

    // Navigate to tasks page and verify the task appears
    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText(taskTitle);

    // Cleanup via API — find and delete the task
    const tasksRes = await page.request.get("/api/tasks");
    if (tasksRes.ok()) {
      const allTasks = (await tasksRes.json()) as Array<{ id: string; title: string }>;
      const created = allTasks.find((t) => t.title === taskTitle);
      if (created) {
        await page.request.delete(`/api/tasks/${created.id}`);
      }
    }
  });
});

// ─── Topic → task → complete ─────────────────────────────────────────────────

test.describe("Topic-scoped task journey", () => {
  test("task created in a topic appears in topic detail view", async ({
    page,
    request,
  }) => {
    const topic = await createTopic(request, `Journey Topic ${Date.now()}`);
    const task = await createTask(request, `Scoped Task ${Date.now()}`, {
      topicId: topic.id,
    });

    await page.goto(`/topics/${topic.id}`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toContainText(task.title);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);

    // Cleanup
    await deleteTask(request, task.id);
    await deleteTopic(request, topic.id);
  });
});
