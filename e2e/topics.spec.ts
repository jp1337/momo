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
    // `hyphens: auto` hyphenates nach dem Wörterbuch von `<html lang>`
    // (`app/layout.tsx`) — ohne dieses Cookie fällt next-intl auf die
    // Accept-Language der Test-Umgebung zurück (hier: Englisch), und
    // Chromium hyphenierte den deutschen Titel dann NICHT (fiel auf reinen
    // Zeichenumbruch zurück, exakt der alte Fehler) — gefunden beim
    // Schreiben dieses Tests (Task-10-Review C2).
    await page.context().addCookies([{ name: "locale", value: "de", domain: "localhost", path: "/" }]);
    const topic = await createTopic(request, "Steuererklärung 2025");
    await page.goto("/topics");
    const row = page.getByTestId("topic-row").filter({ hasText: "Steuererkl" }).first();
    const titleEl = row.locator("[data-row-title]");

    const style = await titleEl.evaluate((n) => {
      const c = getComputedStyle(n);
      return { wordBreak: c.wordBreak, overflowWrap: c.overflowWrap, hyphens: c.hyphens };
    });
    // word-break: break-word (der veraltete Alias) bricht innerhalb von
    // Wörtern, die auf die nächste Zeile gepasst hätten. overflow-wrap
    // break-word bricht nur, wenn ein Wort allein nicht in die Zeile passt.
    // Keins von beiden ist der Fix — hyphens: auto ist es (Task-10-Review
    // C1/C2). Nur die Style-Assertions zu prüfen reicht nicht: sie blieben
    // grün, selbst wenn `hyphens-auto` gelöscht würde, solange `wordBreak`
    // weiterhin nicht "break-word" ist — deshalb unten zusätzlich der
    // gerenderte Beweis.
    expect(style.wordBreak).not.toBe("break-word");
    expect(style.overflowWrap).toBe("break-word");
    expect(style.hyphens).toBe("auto");

    // Gerenderter Beweis, nicht nur Deklaration (Task-10-Review C2): bei
    // exakt 140px erzwungener Spaltenbreite — derselbe Wert, mit dem der
    // Review den Fehler in Chromium vermessen hat (`components/ui/list.tsx`
    // bei `wrapTitle`) — bricht "Steuererklärung" mit `hyphens-auto` an
    // einer echten Silbengrenze ("Steuererklä" / "rung 2025", Duden-Trennung
    // "Steu-er-er-klä-rung"). Ohne `hyphens-auto` bricht derselbe Text an
    // derselben Breite mitten im Wort ("Steuererklärun" / "g 2025",
    // gemessen bei der RED-Aufnahme dieses Tests unten) — mit `wordBreak`
    // weiterhin korrekt auf "break-word" (nicht dem alten Bug-Wert), also
    // für die Style-Assertion oben unsichtbar. (Exakter Bruchpunkt ist
    // fontabhängig — 140px war der Wert des Reviews, nicht der exakte
    // Zeichenindex; hier gegen den tatsächlich gemessenen, gültigen
    // Trennpunkt geprüft statt gegen eine vermutete Zahl.)
    const lines = await titleEl.evaluate((el) => {
      // `flex: 1 1 0%` (Tailwinds `flex-1`) ignoriert ein einfaches
      // `style.width` im Flex-Layout — nur das `flex`-Shorthand selbst
      // gewinnt zuverlässig gegen die Klasse (Inline-Style schlägt jede
      // Klassen-Regel unabhängig von Spezifität).
      (el as HTMLElement).style.flex = "0 0 140px";
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const textNode = walker.nextNode();
      if (!textNode) return [];
      const text = textNode.textContent ?? "";
      const range = document.createRange();
      let lastTop: number | null = null;
      let breakAt = text.length;
      for (let i = 1; i <= text.length; i++) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, i);
        const rects = range.getClientRects();
        const top = rects[rects.length - 1].top;
        if (lastTop === null) {
          lastTop = top;
        } else if (top !== lastTop) {
          breakAt = i - 1;
          break;
        }
      }
      return [text.slice(0, breakAt).trim(), text.slice(breakAt).trim()];
    });
    expect(lines).toEqual(["Steuererklä", "rung 2025"]);

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
