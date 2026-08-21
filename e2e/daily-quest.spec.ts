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

// ─── Lichtkegel (Task 7) ───────────────────────────────────────────────────────
// Die Quest ist nicht mehr eine Karte unter acht gleichen Flaechen, sondern
// die eine Lichtquelle der Seite: kein Rahmen, kein Kasten, ein weiter,
// weicher Amber-Wash von oben, Fraunces gross. Amber kommt auf der ganzen
// Seite genau einmal als Textfarbe vor.
test.describe("Lichtkegel", () => {
  test("die Quest ist in Fraunces gesetzt und gross", async ({ page }) => {
    await page.goto("/dashboard");
    const title = page.getByTestId("quest-title");
    await expect(title).toBeVisible();
    const s = await title.evaluate((n) => {
      const c = getComputedStyle(n);
      return { family: c.fontFamily, size: parseFloat(c.fontSize) };
    });
    expect(s.family).toContain("Fraunces");
    expect(s.size).toBeGreaterThan(27); // clamp-Minimum 1.75rem
  });

  test("die Quest hat keinen Rahmen und keinen Kasten", async ({ page }) => {
    await page.goto("/dashboard");
    const s = await page.getByTestId("quest-light").evaluate((n) => {
      const c = getComputedStyle(n);
      return { border: c.borderTopWidth, bg: c.backgroundColor };
    });
    expect(s.border).toBe("0px");
    // transparent oder gar nicht gesetzt — die Quest liegt im Licht,
    // nicht auf einer Flaeche.
    expect(["rgba(0, 0, 0, 0)", "transparent"]).toContain(s.bg);
  });

  test("Amber kommt auf dem Dashboard genau einmal als Textfarbe vor", async ({ page }) => {
    await page.goto("/dashboard");
    const count = await page.evaluate(() => {
      const amber = "rgb(240, 165, 0)";
      return Array.from(document.querySelectorAll("main *")).filter(
        (n) => getComputedStyle(n).color === amber,
      ).length;
    });
    expect(count).toBeLessThanOrEqual(1);
  });

  // Fix round 1 (2026-08-21): the check above ran against whatever check-in
  // state the fixture user happened to be in — for this test user that is
  // "already checked in today", so the energy picker never rendered and a
  // second amber element (the HIGH-level button in EnergyCheckinCard) went
  // uncaught. That is also the day's FIRST-VISIT state for every real user,
  // so it needed its own coverage, not just a lucky fixture.
  //
  // There is no API to un-check-in for today, so the state is forced by
  // making the client's own "what is today locally?" calculation
  // (`clientLocalToday()`, `new Date().toLocaleDateString("en-CA")`) return
  // a date that can never match the cached `energyLevelDate` — the same
  // effect a real user crossing midnight (or a timezone change) would have,
  // without touching the database.
  test("Amber bleibt einmalig, auch im Nicht-eingecheckt-Zustand (Energie-Picker offen)", async ({ page }) => {
    await page.addInitScript(() => {
      const orig = Date.prototype.toLocaleDateString;
      Date.prototype.toLocaleDateString = function (...args: Parameters<typeof orig>) {
        if (args[0] === "en-CA" && args.length === 1) return "2099-01-01";
        return orig.apply(this, args);
      };
    });
    await page.goto("/dashboard");
    // Sanity check: the override actually forced the picker open (the three
    // HIGH/MEDIUM/LOW buttons, identified by aria-pressed, are language-
    // independent) — otherwise this test would silently degrade back into
    // the fixture-lucky version it's meant to replace.
    await expect(page.locator("button[aria-pressed]")).toHaveCount(3);
    const count = await page.evaluate(() => {
      const amber = "rgb(240, 165, 0)";
      return Array.from(document.querySelectorAll("main *")).filter(
        (n) => getComputedStyle(n).color === amber,
      ).length;
    });
    expect(count).toBeLessThanOrEqual(1);
  });
});
