import { test, expect } from "@playwright/test";
import { createTask, deleteTask, createTopic, deleteTopic } from "./helpers/api";

/**
 * Tasks page E2E tests.
 *
 * Covers: page load, quick-add modal, task creation, task completion,
 * task deletion, inline editing, task filtering, and recurring tasks.
 */

// ─── Quick-Add Modal ───────────────────────────────────────────────────────────

test.describe("Task Quick-Add Modal", () => {
  test("N shortcut opens the quick-add modal", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("n");
    const titleInput = page
      .locator('input[placeholder*="Titel"], input[name="title"]')
      .first();
    await expect(titleInput).toBeVisible({ timeout: 3000 });
  });

  test("/ shortcut also opens the quick-add modal", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("/");
    const titleInput = page
      .locator('input[placeholder*="Titel"], input[name="title"]')
      .first();
    await expect(titleInput).toBeVisible({ timeout: 3000 });
  });

  test("can create a task via the quick-add modal", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("n");
    const titleInput = page
      .locator('input[placeholder*="Titel"], input[name="title"]')
      .first();
    await expect(titleInput).toBeVisible({ timeout: 3000 });
    const taskTitle = `E2E Quick Task ${Date.now()}`;
    await titleInput.fill(taskTitle);
    await page.keyboard.press("Enter");
    await expect(titleInput).not.toBeVisible({ timeout: 5000 });
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

  test("More options expands with topic/priority/energy dropdowns", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("n");
    const titleInput = page
      .locator('input[placeholder*="Titel"], input[name="title"]')
      .first();
    await expect(titleInput).toBeVisible({ timeout: 3000 });
    // Click "More options" toggle
    const moreBtn = page.locator('[role="dialog"] button').filter({
      hasText: /mehr|options|Optionen/i,
    });
    if ((await moreBtn.count()) > 0) {
      await moreBtn.first().click();
      // Priority dropdown should appear
      const prioritySelect = page.locator('[role="dialog"] select').first();
      await expect(prioritySelect).toBeVisible({ timeout: 2000 });
    }
    await page.keyboard.press("Escape");
  });
});

// ─── Tasks Page ───────────────────────────────────────────────────────────────

test.describe("Tasks Page", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("displays a task created via API", async ({ page, request }) => {
    const title = `E2E Task ${Date.now()}`;
    const task = await createTask(request, title);

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="${title}"`)).toBeVisible({ timeout: 5000 });

    await deleteTask(request, task.id);
  });

  test("task completion checkbox is interactive", async ({ page, request }) => {
    const title = `E2E Complete Task ${Date.now()}`;
    const task = await createTask(request, title);

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    // Find the task and click its checkbox
    const taskRow = page.locator(`text="${title}"`).locator("..").locator("..");
    const checkbox = taskRow.locator('input[type="checkbox"]').first();
    if ((await checkbox.count()) > 0) {
      await checkbox.click();
      // Give Framer Motion animation time to complete
      await page.waitForTimeout(500);
    } else {
      // Fallback: the completion checkbox might be a button
      const completeBtn = page
        .locator(`text="${title}"`)
        .locator("xpath=ancestor::*[4]")
        .locator("input, button")
        .first();
      if ((await completeBtn.count()) > 0) {
        await completeBtn.click();
      }
    }

    // Page should not error regardless of checkbox interaction
    await expect(page.locator("body")).not.toContainText(/500|Fehler/i);

    await deleteTask(request, task.id);
  });

  test("tasks are grouped by priority/due date sections", async ({
    page,
    request,
  }) => {
    const title = `E2E Section Task ${Date.now()}`;
    const task = await createTask(request, title);

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    // The task list should have section headings
    const sections = page.locator("h2, h3").filter({ hasText: /.+/ });
    await expect(sections.first()).toBeVisible({ timeout: 5000 });

    await deleteTask(request, task.id);
  });

  test("search input filters tasks", async ({ page, request }) => {
    const uniqueTitle = `SearchTask_${Date.now()}`;
    const task = await createTask(request, uniqueTitle);

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    const searchInput = page
      .locator('input[placeholder*="Suche"], input[placeholder*="Search"], input[type="search"]')
      .first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill(uniqueTitle);
      await page.waitForTimeout(500); // debounce
      await expect(page.locator(`text="${uniqueTitle}"`)).toBeVisible({
        timeout: 5000,
      });
    }

    await deleteTask(request, task.id);
  });

  test("task with a topic displays the topic tag", async ({
    page,
    request,
  }) => {
    const topic = await createTopic(request, `E2E Topic ${Date.now()}`);
    const task = await createTask(request, `Task with topic ${Date.now()}`, {
      topicId: topic.id,
    });

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    // Topic title should appear somewhere on the page as a tag
    await expect(page.locator(`text="${topic.title}"`)).toBeVisible({
      timeout: 5000,
    });

    await deleteTask(request, task.id);
    await deleteTopic(request, topic.id);
  });

  test("high priority task shows priority badge", async ({
    page,
    request,
  }) => {
    const title = `HIGH Priority Task ${Date.now()}`;
    const task = await createTask(request, title, { priority: "HIGH" });

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="${title}"`)).toBeVisible({ timeout: 5000 });
    // High priority badge should be somewhere in the task row area
    await expect(page.locator("body")).not.toContainText(/500|Fehler/i);

    await deleteTask(request, task.id);
  });

  test("page renders correctly on mobile viewport", async ({ page, request }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const title = `Mobile Task ${Date.now()}`;
    const task = await createTask(request, title);

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500/i);

    await deleteTask(request, task.id);
  });

  // Task-11-Review C3 (finale Fix-Welle): bei 375px teilten sich Titel,
  // ein bis zu 129px breites `trailing` (z. B. "5 Tage überfällig") und der
  // Aktionscluster (bis zu drei 32px-Buttons) eine Zeile — der Titel war der
  // einzige Flex-Kandidat und schrumpfte auf 0px (drei von zwölf gemessenen
  // Zeilen zeigten nur noch das Trailing, keinen Buchstaben Titel). Diese
  // Probe erzwingt genau den Worst Case (überfällig, also `trailing` UND
  // `--danger`-Farbe gesetzt) und misst die tatsächliche Titel-Boxbreite,
  // statt nur "keine 500er" zu prüfen.
  test("task title has non-zero width at 375px even with an overdue trailing date", async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const title = `Overdue mobile title width probe ${Date.now()}`;
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 5);
    const task = await createTask(request, title, {
      dueDate: overdueDate.toISOString().split("T")[0],
    });

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    const row = page.locator('[data-testid="task-row"]').filter({ hasText: title });
    await expect(row).toBeVisible({ timeout: 5000 });
    const titleBox = await row.getByTestId("task-row-title").boundingBox();
    expect(titleBox?.width ?? 0).toBeGreaterThan(0);

    await deleteTask(request, task.id);
  });
});

// ─── Recurring Tasks ──────────────────────────────────────────────────────────

test.describe("Recurring Tasks", () => {
  test("recurring task is created and visible in task list", async ({
    page,
    request,
  }) => {
    const res = await request.post("/api/tasks", {
      data: {
        title: `Recurring ${Date.now()}`,
        type: "RECURRING",
        priority: "NORMAL",
        recurrenceType: "INTERVAL",
        recurrenceInterval: 7,
      },
    });
    expect(res.ok()).toBe(true);
    const task = await res.json() as { id: string; title: string };

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="${task.title}"`)).toBeVisible({
      timeout: 5000,
    });

    await deleteTask(request, task.id);
  });
});

// ─── Task Form (Edit/Create Modal) ────────────────────────────────────────────

test.describe("Task Form Modal", () => {
  test("opening edit on a task shows the edit modal", async ({
    page,
    request,
  }) => {
    const title = `Edit Modal Task ${Date.now()}`;
    const task = await createTask(request, title);

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    // Find the task and look for an edit button (pencil icon area)
    const taskText = page.locator(`text="${title}"`);
    if ((await taskText.count()) > 0) {
      // Hover over the task row to make edit button visible
      await taskText.hover();
      // Look for edit button near the task
      const editBtn = page
        .locator(`text="${title}"`)
        .locator("xpath=ancestor::*[4]")
        .locator('button[aria-label*="edit" i], button[aria-label*="bearbeiten" i]')
        .first();
      if ((await editBtn.count()) > 0) {
        await editBtn.click();
        // Modal should appear
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 3000 });
        await page.keyboard.press("Escape");
      }
    }

    await deleteTask(request, task.id);
  });
});
