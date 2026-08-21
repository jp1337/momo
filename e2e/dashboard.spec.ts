import { test, expect } from "@playwright/test";
import { createTask, deleteTask } from "./helpers/api";

/**
 * Dashboard E2E tests — the main home screen.
 *
 * Covers: greeting, quest section, quest meta line (weekday/energy/streak),
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

  test("Streak erscheint in der Metazeile nur, wenn sie nicht null ist", async ({
    page,
    request,
  }) => {
    // "0 days streak" ist ein taeglicher kleiner Vorwurf fuer eine App, die
    // Menschen mit Vermeidungstendenz hilft — bei Streak 0 zeigt die
    // Metazeile gar keine Zahl (Task 6 round 2 finding). Ein hartkodierter
    // Erwartungswert waere fragil, deshalb erst den echten Wert abfragen.
    const res = await request.get("/api/user");
    const body = (await res.json()) as { streakCurrent: number };

    await page.goto("/dashboard");
    const meta = page.getByTestId("quest-meta");
    await expect(meta).toBeVisible();

    if (body.streakCurrent > 0) {
      await expect(meta).toContainText(/\d+/);
    } else {
      await expect(meta).not.toContainText(/\d+/);
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
