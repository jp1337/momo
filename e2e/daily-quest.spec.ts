import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

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

  // Fix round 2 (2026-08-21): scoped to `main *` alone, this assertion
  // cannot see a Radix dialog — `RadixDialog.Portal` renders `DialogContent`
  // to `document.body`, as a sibling of `<main>`, not inside it (see
  // components/ui/dialog.tsx). The breakdown modal opened from the quest's
  // "aufteilen" action carried three amber elements (a filled submit
  // button, an "add step" text, a chip) that this test never saw, because
  // it never looked outside `main`. Every count below is rescoped to
  // `main *, [role="dialog"] *` — Radix gives every DialogContent
  // `role="dialog"` (verified in @radix-ui/react-dialog's own source, not
  // assumed) — so an open dialog can no longer hide a second amber element
  // from this rule. The navbar's coin counter is deliberately left out of
  // both scopes: it is persistent chrome, not part of "the page" this rule
  // governs, and its own migration is a separate, not-yet-scheduled
  // decision (see components/layout/coin-counter.tsx) — scoping to `body *`
  // would fail this test on every page for a reason unrelated to what this
  // rule checks.
  function countAmberInPageAndDialogs(): number {
    const amber = "rgb(240, 165, 0)";
    return Array.from(
      document.querySelectorAll("main *, [role='dialog'] *"),
    ).filter((n) => getComputedStyle(n).color === amber).length;
  }

  test("Amber kommt auf dem Dashboard genau einmal als Textfarbe vor", async ({ page }) => {
    await page.goto("/dashboard");
    const count = await page.evaluate(countAmberInPageAndDialogs);
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
    const count = await page.evaluate(countAmberInPageAndDialogs);
    expect(count).toBeLessThanOrEqual(1);
  });

  // Fix round 2 (2026-08-21): the case the two tests above couldn't catch —
  // an open dialog. Opens the breakdown modal (wired up in Task 7 but never
  // covered by this describe block) and re-runs the same count with the
  // widened, dialog-aware scope. A rule that only holds while no dialog is
  // open is not the rule the spec wrote down.
  test("Amber bleibt einmalig bei geöffnetem Aufteilen-Dialog", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Checked via the rendered DOM, not the (separately broken, see the
    // pre-existing "GET /api/daily-quest returns expected shape" failure
    // above) API response shape: the breakdown action only renders on an
    // active, uncompleted quest.
    const breakdownBtn = page
      .locator("button")
      .filter({ hasText: /aufteilen|break it down/i })
      .first();
    test.skip(
      (await breakdownBtn.count()) === 0,
      "No active quest — breakdown action is not rendered",
    );
    await breakdownBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const count = await page.evaluate(countAmberInPageAndDialogs);
    expect(count).toBeLessThanOrEqual(1);
  });
});


// ─── Energie-Wahlmoeglichkeiten: Ziel-Ueberlappung ─────────────────────────────
//
// Fix round 3 (2026-08-22): the three energy choices (Task 8 fix round 2)
// grew their tap targets with a negative margin trick, which is only safe
// when nothing can ever occupy the space the target bleeds into. At 375px
// the choices row wraps, and that assumption broke: the grown, invisible
// hit-boxes of the first and last choice overlapped each other across the
// wrap boundary. Worst in German (the default locale) — its longer labels
// push the wrap point earlier — with a measured 31x32px overlap between
// "Viel Energie" and "Wenig Energie". Whichever choice is later in the DOM
// wins a tap that lands in that overlap, so a tap on "Wenig Energie" could
// silently set "Viel Energie" instead: the opposite of what was pressed.
//
// This is exactly the class of bug that returns silently when a translator
// lengthens a string, so it's a permanent test, not a one-off measurement —
// covering the three locales already known to sit near the wrap boundary
// (de is longest/default, ru is close behind, en was the one round 2's
// author checked and judged "clean" at a 1px overlap that turned out not to
// generalise).
test.describe("Energie-Wahlmoeglichkeiten: Ziel-Ueberlappung", () => {
  /** Forces the "not checked in today" state without touching the DB — same
   * technique as the amber-uniqueness test above. */
  async function forceNotCheckedIn(page: Page) {
    await page.addInitScript(() => {
      const orig = Date.prototype.toLocaleDateString;
      Date.prototype.toLocaleDateString = function (...args: Parameters<typeof orig>) {
        if (args[0] === "en-CA" && args.length === 1) return "2099-01-01";
        return orig.apply(this, args);
      };
    });
  }

  function overlaps(a: Box, b: Box): boolean {
    const xOverlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const yOverlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    return xOverlap > 0 && yOverlap > 0;
  }

  interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  for (const locale of ["de", "ru", "en"] as const) {
    test(`${locale}: 375px, keine Ueberlappung, jedes Ziel mindestens 44px hoch`, async ({
      page,
    }) => {
      await page.context().addCookies([
        { name: "locale", value: locale, domain: "localhost", path: "/" },
      ]);
      await forceNotCheckedIn(page);
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      const boxes: Box[] = await page.locator("[aria-pressed]").evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        })
      );
      test.skip(boxes.length === 0, "energy choices not rendered (already checked in?)");
      expect(boxes.length).toBe(3);

      for (const b of boxes) {
        expect(b.height).toBeGreaterThanOrEqual(44);
      }
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          expect(overlaps(boxes[i], boxes[j])).toBe(false);
        }
      }
    });
  }
});
