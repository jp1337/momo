import { test, expect } from "@playwright/test";

/**
 * Progress, Habits, and Achievements E2E tests.
 *
 * Covers: progress page tabs, achievements page, habits page,
 * stats page, and weekly review page.
 */

// ─── Progress Page ─────────────────────────────────────────────────────────────

test.describe("Progress Page", () => {
  test("loads the progress page with tabs", async ({ page }) => {
    await page.goto("/progress");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
    const tabs = page.locator('[role="tab"], a[href*="tab="]');
    await expect(tabs.first()).toBeVisible();
  });

  test("can switch to achievements tab", async ({ page }) => {
    await page.goto("/progress?tab=achievements");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("can switch to habits tab", async ({ page }) => {
    await page.goto("/progress?tab=habits");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("achievements tab shows achievement cards or empty state", async ({
    page,
  }) => {
    await page.goto("/progress?tab=achievements");
    await page.waitForLoadState("networkidle");
    // Either achievement cards or an empty state message
    await expect(page.locator("body")).not.toContainText(/500/i);
    // Should have some content
    const main = page.locator("main, [role='main'], .max-w-4xl").first();
    await expect(main).toBeVisible({ timeout: 5000 });
  });

  test("habits tab shows contribution grid or empty state", async ({
    page,
  }) => {
    await page.goto("/progress?tab=habits");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("clicking between tabs does not show errors", async ({ page }) => {
    await page.goto("/progress");
    await page.waitForLoadState("networkidle");

    const tabs = page.locator('[role="tab"], a[href*="tab="]');
    const tabCount = await tabs.count();
    if (tabCount > 1) {
      await tabs.nth(1).click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).not.toContainText(/500/i);
    }
  });
});

// ─── Habits Page ──────────────────────────────────────────────────────────────

test.describe("Habits Page", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/habits");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("shows page heading", async ({ page }) => {
    await page.goto("/habits");
    await page.waitForLoadState("networkidle");
    // "Gewohnheiten" / "Habits" heading
    const heading = page
      .locator("h1, h2")
      .filter({ hasText: /Gewohnheiten|Habits/i })
      .first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test("shows contribution grid or empty state", async ({ page }) => {
    await page.goto("/habits");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText(/500/i);
    // Either a habit grid (svg cells) or empty state message
    const content = page.locator("main, [role='main'], .max-w-4xl").first();
    await expect(content).toBeVisible();
  });

  test("renders correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/habits");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500/i);
  });
});

// ─── Achievements Page ────────────────────────────────────────────────────────

test.describe("Achievements Page", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/achievements");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("shows achievement cards", async ({ page }) => {
    await page.goto("/achievements");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText(/500/i);
    // Achievement page has content
    const content = page.locator("main, [role='main'], .max-w-4xl").first();
    await expect(content).toBeVisible();
  });
});

// ─── Stats Page ───────────────────────────────────────────────────────────────

test.describe("Stats Page", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("shows stats content", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForLoadState("networkidle");
    // Stats section heading
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows level and coin information", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText(/500/i);
    // Level or coin data should appear
    const statsEl = page
      .locator("body")
      .filter({ hasText: /Level|Münzen|Coins|Streak/i });
    await expect(statsEl.first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Weekly Review Page ───────────────────────────────────────────────────────

test.describe("Weekly Review Page", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/review");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("shows weekly review content", async ({ page }) => {
    await page.goto("/review");
    await page.waitForLoadState("networkidle");
    // Review has some kind of heading or summary section
    await expect(page.locator("body")).not.toContainText(/500/i);
    const content = page.locator("main, [role='main'], .max-w-4xl").first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });
});

test("die Habits-Ansicht rendert ohne Formatierungsfehler", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/progress?tab=habits");
  await page.waitForLoadState("networkidle");
  expect(errors.filter((e) => e.includes("FORMATTING_ERROR")).join("\n")).toBe("");
});

// Task 11: §6 nennt den gestrichelten Kasten mit grün gefülltem Knopf als
// den Fall, den die Spec ausdrücklich verbietet — genau der alte leere
// Zustand von /progress?tab=habits (progress-tabs.tsx, vor Task 11:
// `border: "1px dashed var(--border)"` plus ein amberfreier, aber grün
// GEFÜLLTER Link als CTA). Scope ist `main`, nicht `document`, damit ein
// zufälliger gestrichelter Rahmen anderswo (Navbar, Dialog) diesen Test
// nicht fälschlich rot macht — er prüft den Seiteninhalt, nicht die Hülle.
test("der leere Zustand ist kein gestrichelter Kasten mit grünem Knopf", async ({ page }) => {
  await page.goto("/progress");
  const dashed = await page.evaluate(() => {
    const root = document.querySelector("main") ?? document.body;
    return Array.from(root.querySelectorAll("*")).filter((el) => {
      const c = getComputedStyle(el);
      return ["top", "right", "bottom", "left"].some(
        (s) => c.getPropertyValue(`border-${s}-style`) === "dashed",
      );
    }).length;
  });
  expect(dashed).toBe(0);
});
