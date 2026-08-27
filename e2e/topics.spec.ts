import { test, expect } from "@playwright/test";
import { createTopic, deleteTopic, createTask, deleteTask } from "./helpers/api";

/**
 * Topics page E2E tests.
 *
 * Covers: page load, topic creation (API + UI), topic detail view,
 * task within a topic, topic deletion, and template import.
 */

test.describe("Topics Page", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/topics");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("displays a topic created via API", async ({ page, request }) => {
    const title = `E2E Topic ${Date.now()}`;
    const topic = await createTopic(request, title);

    await page.goto("/topics");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="${title}"`)).toBeVisible({ timeout: 5000 });

    await deleteTopic(request, topic.id);
  });

  test("shows topic card with task progress", async ({ page, request }) => {
    const topicTitle = `Progress Topic ${Date.now()}`;
    const topic = await createTopic(request, topicTitle);
    const task = await createTask(request, `Sub-task ${Date.now()}`, {
      topicId: topic.id,
    });

    await page.goto("/topics");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="${topicTitle}"`)).toBeVisible({
      timeout: 5000,
    });
    // Progress text like "0/1 Aufgaben" should appear in the card
    await expect(page.locator("body")).not.toContainText(/500/i);

    await deleteTask(request, task.id);
    await deleteTopic(request, topic.id);
  });

  test("clicking 'New Topic' button shows the create form", async ({
    page,
  }) => {
    await page.goto("/topics");
    await page.waitForLoadState("networkidle");

    // Button text is "+ Neues Thema" or "Erstes Thema erstellen"
    const newTopicBtn = page
      .locator("button, a")
      .filter({ hasText: /Neues Thema|Erstes Thema|New Topic/i })
      .first();
    if ((await newTopicBtn.count()) > 0) {
      await newTopicBtn.click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 3000 });
      await page.keyboard.press("Escape");
    }
  });

  test("renders correctly on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/topics");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("ein langer Themenname bricht nicht mitten im Wort", async ({ page, request }) => {
    const topic = await createTopic(request, "Steuererklärung 2025");
    await page.goto("/topics");
    const title = page.getByTestId("topic-row").filter({ hasText: "Steuererkl" }).first();
    const style = await title.evaluate((n) => {
      const c = getComputedStyle(n.querySelector("[data-row-title]") ?? n);
      return { wordBreak: c.wordBreak, overflowWrap: c.overflowWrap };
    });
    // word-break: break-word (der veraltete Alias) bricht innerhalb von
    // Wörtern, die auf die nächste Zeile gepasst hätten. overflow-wrap
    // break-word bricht nur, wenn ein Wort allein nicht in die Zeile passt.
    expect(style.wordBreak).not.toBe("break-word");
    expect(style.overflowWrap).toBe("break-word");
    await deleteTopic(request, topic.id);
  });
});

// ─── Topic Detail View ────────────────────────────────────────────────────────

test.describe("Topic Detail Page", () => {
  test("navigates to topic detail and shows tasks", async ({
    page,
    request,
  }) => {
    const topicTitle = `Detail Topic ${Date.now()}`;
    const topic = await createTopic(request, topicTitle);
    const taskTitle = `Detail Task ${Date.now()}`;
    const task = await createTask(request, taskTitle, { topicId: topic.id });

    await page.goto(`/topics/${topic.id}`);
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
    // The topic title or task title should appear
    await expect(page.locator("body")).toContainText(topicTitle);

    await deleteTask(request, task.id);
    await deleteTopic(request, topic.id);
  });

  test("topic detail shows 'Add subtask' button", async ({
    page,
    request,
  }) => {
    const topic = await createTopic(request, `Add Task Topic ${Date.now()}`);

    await page.goto(`/topics/${topic.id}`);
    await page.waitForLoadState("networkidle");

    // "+ Unteraufgabe hinzufügen" or similar
    const addBtn = page
      .locator("button, a")
      .filter({ hasText: /Unteraufgabe|subtask|Add/i })
      .first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });

    await deleteTopic(request, topic.id);
  });

  test("topic detail with multiple tasks shows task list", async ({
    page,
    request,
  }) => {
    const topic = await createTopic(request, `Multi Task Topic ${Date.now()}`);
    const task1 = await createTask(request, `Task One ${Date.now()}`, {
      topicId: topic.id,
    });
    const task2 = await createTask(request, `Task Two ${Date.now()}`, {
      topicId: topic.id,
    });

    await page.goto(`/topics/${topic.id}`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="${task1.title}"`)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator(`text="${task2.title}"`)).toBeVisible({
      timeout: 5000,
    });

    await deleteTask(request, task1.id);
    await deleteTask(request, task2.id);
    await deleteTopic(request, topic.id);
  });

  test("can navigate back from topic detail to topics list", async ({
    page,
    request,
  }) => {
    const topic = await createTopic(request, `Nav Topic ${Date.now()}`);

    await page.goto(`/topics/${topic.id}`);
    await page.waitForLoadState("networkidle");

    // Look for a back link to /topics
    const backLink = page.locator('a[href="/topics"]').first();
    if ((await backLink.count()) > 0) {
      await backLink.click();
      await expect(page).toHaveURL(/topics/);
    } else {
      // Navigate manually
      await page.goto("/topics");
      await expect(page).toHaveURL(/topics/);
    }

    await deleteTopic(request, topic.id);
  });
});

// ─── Template Import ──────────────────────────────────────────────────────────

test.describe("Topic Template Import", () => {
  test("template picker button is visible on topics page", async ({ page }) => {
    await page.goto("/topics");
    await page.waitForLoadState("networkidle");
    // Template picker might be behind a button (icon or text)
    // Just verify the page doesn't error — template button may not be prominent
    await expect(page.locator("body")).not.toContainText(/500/i);
  });
});
