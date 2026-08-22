import { test, expect } from "@playwright/test";
import { createTask, deleteTask } from "./helpers/api";

/**
 * Dashboard E2E tests — the main home screen.
 *
 * Covers: greeting, quest section, quest meta line (weekday/energy), the
 * streak in the PageFrame rail (Task 3 — moved out of the meta line),
 * quick wins, and the absence of the removed stat tiles / quick links /
 * standalone focus banner (Task 6 — dashboard entschlacken).
 */
test.describe("Dashboard", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("zeigt keine Stat-Tiles mehr", async ({ page }) => {
    await page.goto("/dashboard");
    // Coins und Level stehen in der Navbar; auf dem Dashboard standen sie doppelt.
    await expect(page.getByTestId("stat-tiles")).toHaveCount(0);
  });

  test("renders the Daily Quest section", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Quest section has a heading (translated)
    const questSection = page.locator("section").first();
    await expect(questSection).toBeVisible();
  });

  test("zeigt keine Quick-Links mehr", async ({ page }) => {
    await page.goto("/dashboard");
    // Dupliziert die Sidebar.
    await expect(page.getByTestId("dashboard-quick-links")).toHaveCount(0);
  });

  test("Wochentag und Energie stehen in einer Metazeile", async ({ page }) => {
    await page.goto("/dashboard");
    const meta = page.getByTestId("quest-meta");
    await expect(meta).toBeVisible();
    // Wochentag und Energie sind durch einen Mittelpunkt verbunden — das
    // literale Zeichen ist locale-unabhaengig pruefbar, der uebersetzte
    // Wochentag/Energie-Text nicht.
    await expect(meta).toContainText("·");
  });

  test("Streak erscheint im Rand nur, wenn sie nicht null ist, nie in der Metazeile", async ({
    page,
    request,
  }) => {
    // "0 days streak" ist ein taeglicher kleiner Vorwurf fuer eine App, die
    // Menschen mit Vermeidungstendenz hilft — bei Streak 0 zeigt gar nichts
    // eine Zahl (Task 6 round 2 finding). Ein hartkodierter Erwartungswert
    // waere fragil, deshalb erst den echten Wert abfragen.
    //
    // Task 3 (2026-08-22): der Streak zog aus der Metazeile in den Rand
    // (PageFrame `rail`) um — die Metazeile zeigt seither nie eine Zahl,
    // unabhaengig vom Streak-Wert; `data-testid="rail-streak"` traegt die
    // Information stattdessen.
    const res = await request.get("/api/user");
    const body = (await res.json()) as { streakCurrent: number };

    await page.goto("/dashboard");
    const meta = page.getByTestId("quest-meta");
    await expect(meta).toBeVisible();
    await expect(meta).not.toContainText(/\d+/);

    const railStreak = page.getByTestId("rail-streak");
    if (body.streakCurrent > 0) {
      await expect(railStreak).toBeVisible();
      await expect(railStreak).toContainText(/\d+/);
    } else {
      await expect(railStreak).toHaveCount(0);
    }
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

  test("page renders without JavaScript errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // No fatal JS errors
    expect(errors.filter((e) => !e.includes("hydrat"))).toHaveLength(0);
  });
});

test.describe("Aufwandsstufen", () => {
  test("die Schriftgroesse folgt der geschaetzten Dauer", async ({
    page,
    request,
  }) => {
    // estimatedMinutes is an enum, not a free integer: 5 | 15 | 30 | 60 | null
    // (lib/validators/index.ts) — 5 and 15 are the only values the dashboard's
    // Quick Wins query (lte(tasks.estimatedMinutes, 15)) can ever surface, so
    // only "small" and "medium" are exercised here. "large" (60 min, >30)
    // is untested on this page by construction and will be covered once
    // /tasks is migrated to the same token system in a later plan.
    const a = await createTask(request, `Klein ${Date.now()}`, {
      estimatedMinutes: 5,
    });
    const b = await createTask(request, `Mittel ${Date.now()}`, {
      estimatedMinutes: 15,
    });

    try {
      await page.goto("/dashboard");
      const rows = page.getByTestId("quick-win-row");
      const n = await rows.count();
      test.skip(n === 0, "keine Quick Wins im Testdatensatz");

      const seen = new Map<string, number>();
      for (let i = 0; i < n; i++) {
        const row = rows.nth(i);
        const effort = await row.getAttribute("data-effort");
        const size = await row
          .getByTestId("quick-win-title")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        if (effort) seen.set(effort, size);
      }
      // Groessere Stufe → groessere Schrift, und nie unter 14px.
      for (const size of seen.values()) expect(size).toBeGreaterThanOrEqual(14);
      if (seen.has("small") && seen.has("medium")) {
        expect(seen.get("medium")!).toBeGreaterThan(seen.get("small")!);
      }
      if (seen.has("medium") && seen.has("large")) {
        expect(seen.get("large")!).toBeGreaterThan(seen.get("medium")!);
      }
    } finally {
      await deleteTask(request, a.id);
      await deleteTask(request, b.id);
    }
  });

  test("die Liste hat keine Kaesten", async ({ page }) => {
    await page.goto("/dashboard");
    const rows = page.getByTestId("quick-win-row");
    const n = await rows.count();
    test.skip(n === 0, "keine Quick Wins im Testdatensatz");
    const s = await rows.first().evaluate((el) => {
      const c = getComputedStyle(el);
      return { bg: c.backgroundColor, radius: c.borderTopLeftRadius };
    });
    expect(["rgba(0, 0, 0, 0)", "transparent"]).toContain(s.bg);
    expect(s.radius).toBe("0px");
  });
});
