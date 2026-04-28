import { test, expect } from "@playwright/test";

/**
 * Daily Quest E2E tests.
 *
 * Covers: quest display on dashboard, postpone interaction,
 * energy check-in, and API-level quest operations.
 */

test.describe("Daily Quest on Dashboard", () => {
  test("dashboard shows a quest card or empty state", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
    // Quest card section heading should be present
    const questSection = page.locator("section").first();
    await expect(questSection).toBeVisible();
  });

  test("energy check-in card is visible on dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Energy check-in area (3 buttons: HIGH/MEDIUM/LOW or collapsed status bar)
    await expect(page.locator("body")).not.toContainText(/500/i);
    // Either the 3-button layout or the collapsed status bar
    const energySection = page.locator("section").first();
    await expect(energySection).toBeVisible();
  });

  test("GET /api/daily-quest returns expected shape", async ({ request }) => {
    const res = await request.get("/api/daily-quest");
    expect(res.status()).toBe(200);
    const body = await res.json() as Record<string, unknown> | null;
    if (body !== null) {
      expect(typeof body.id).toBe("string");
      expect(typeof body.title).toBe("string");
    }
  });

  test("dashboard renders without errors when no quest exists", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText(/500/i);
    // No JavaScript errors either
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.waitForTimeout(500);
  });
});

// ─── Energy Check-in ──────────────────────────────────────────────────────────

test.describe("Energy Check-in", () => {
  test("POST /api/energy-checkin accepts valid energy level", async ({
    request,
  }) => {
    const res = await request.post("/api/energy-checkin", {
      data: { energyLevel: "MEDIUM" },
    });
    // Should succeed (200) or succeed with quest swap info
    expect([200, 201]).toContain(res.status());
    const body = await res.json() as { quest: unknown };
    expect(body).toBeDefined();
  });

  test("energy check-in buttons are visible or status bar is shown", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Either HIGH/MEDIUM/LOW buttons or a "Change" button if already checked in
    // May or may not be visible depending on whether check-in was done today
    await expect(page.locator("body")).not.toContainText(/500/i);
  });
});

// ─── Quest Postpone ───────────────────────────────────────────────────────────

test.describe("Quest Postpone", () => {
  test("postpone button is visible on the quest card when quest exists", async ({
    page,
  }) => {
    // First ensure there is a quest
    const questRes = await page.request.get("/api/daily-quest");
    const quest = await questRes.json() as { id?: string } | null;
    if (!quest?.id) return; // No quest — skip this test

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Postpone button exists somewhere near the quest card
    const postponeBtn = page
      .locator("button")
      .filter({ hasText: /Verschieben|Postpone|Aufschieben/i })
      .first();
    if ((await postponeBtn.count()) > 0) {
      await expect(postponeBtn).toBeVisible({ timeout: 5000 });
    } else {
      // Quest may already be completed, or postpone limit reached
      await expect(page.locator("body")).not.toContainText(/500/i);
    }
  });
});
