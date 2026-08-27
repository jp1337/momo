import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { randomUUID } from "crypto";

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

// Task 11 (I2): §6 nennt den gestrichelten Kasten mit grün gefülltem Knopf
// als den Fall, den die Spec ausdrücklich verbietet — genau der alte leere
// Zustand von /progress?tab=habits (progress-tabs.tsx, vor Task 11:
// `border: "1px dashed var(--border)"` plus ein amberfreier, aber grün
// GEFÜLLTER Link als CTA).
//
// Läuft mit der `empty-habits`-Sitzung (`e2e/global.setup.ts`), nicht mit
// der geteilten Standard-Sitzung: die Standard-Sitzung hat inzwischen 11
// wiederkehrende Aufgaben angesammelt, der leere Zweig rendert gegen sie
// nie, und ein Test, der ihn nie erreicht, ist von jedem Code erfüllt —
// auch vom alten gestrichelten Kasten (Review-Fund I2: genau das war der
// Zustand dieses Tests vorher). Scope ist `main`, nicht `document`, damit
// ein zufälliger gestrichelter Rahmen anderswo (Navbar, Dialog) diesen Test
// nicht fälschlich rot macht — er prüft den Seiteninhalt, nicht die Hülle.
test.describe("Progress Page — leere Habits-Sitzung", () => {
  test.use({ storageState: "e2e/.auth/empty-habits.json" });

  test("der leere Zustand ist kein gestrichelter Kasten mit grünem Knopf", async ({
    page,
  }) => {
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

  // Task 11 (I3): der Rand (vier Summen + Streak) und die pro-Habit-
  // Streakzeile liefen bislang in KEINEM Test — an der geteilten Sitzung hat
  // jedes der 11 Habits 0 Abschlüsse, `hasRailContent` ist also immer
  // `false`, `[data-rail]` fehlt, und die vier Summenzeilen, der
  // fünf-Fall-`periodDays`-Switch und seine fünf i18n-Keys wurden nie
  // gerendert. Dieser Test sät zwei Habits mit echten Abschlüssen für die
  // `empty-habits`-Sitzung — daher der Name der Sitzung ist ab hier nicht
  // mehr wörtlich zutreffend, nur für die Dauer dieses einen Tests, siehe
  // `finally` unten, das die gesäten Zeilen wieder entfernt, damit der
  // Test oben (RED/GREEN gegen eine echte leere Sitzung) bei jedem
  // erneuten Lauf weiter zutrifft.
  test("der Rand zeigt Summen und Streak, die Zeile den eigenen Streak", async ({
    page,
  }) => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    const client = new Client({ connectionString });
    await client.connect();

    let dailyTaskId: string | undefined;
    let weeklyTaskId: string | undefined;
    try {
      const userRow = await client.query<{ id: string }>(
        "SELECT id FROM users WHERE email = $1",
        ["e2e-empty-habits@momotest.local"],
      );
      const userId = userRow.rows[0].id;

      // Habit A: daily (INTERVAL, periodDays=1) — completed today and
      // yesterday, a 2-day streak that is also its all-time best (exercises
      // `streak_unit_days` + the "Neuer Rekord" branch).
      dailyTaskId = randomUUID();
      await client.query(
        `INSERT INTO tasks (id, user_id, title, type, recurrence_type, recurrence_interval)
         VALUES ($1, $2, 'E2E Daily Habit', 'RECURRING', 'INTERVAL', 1)`,
        [dailyTaskId, userId],
      );
      await client.query(
        `INSERT INTO task_completions (task_id, user_id, completed_at) VALUES
           ($1, $2, now()),
           ($1, $2, now() - interval '1 day')`,
        [dailyTaskId, userId],
      );

      // Habit B: weekly (WEEKDAY, periodDays=7) — one completion this week,
      // exercises `streak_unit_weeks`, a second unit branch, and gives the
      // rail's totalYear/totalLast30/totalLast7 sums more than one habit's
      // worth of data.
      weeklyTaskId = randomUUID();
      await client.query(
        `INSERT INTO tasks (id, user_id, title, type, recurrence_type, recurrence_weekdays)
         VALUES ($1, $2, 'E2E Weekly Habit', 'RECURRING', 'WEEKDAY', '[0,1,2,3,4,5,6]')`,
        [weeklyTaskId, userId],
      );
      await client.query(
        `INSERT INTO task_completions (task_id, user_id, completed_at) VALUES ($1, $2, now())`,
        [weeklyTaskId, userId],
      );

      // Feste Locale statt der Standard-Erkennung (next-intl fällt ohne
      // `locale`-Cookie auf das `Accept-Language` des Browsers zurück, und
      // Chromiums Playwright-Profil sendet "en-US" — die Assertions unten
      // zitieren deutschen Text und müssen deterministisch dieselbe Locale
      // sehen, unabhängig davon, wie der Testrunner konfiguriert ist).
      await page.context().addCookies([
        { name: "locale", value: "de", url: "http://localhost:3000" },
      ]);
      await page.goto("/progress?tab=habits");
      await page.waitForLoadState("networkidle");

      const rail = page.locator("[data-rail]");
      await expect(rail).toHaveCount(1);
      const railText = (await rail.textContent()) ?? "";
      // Vier Zeilen: Jahr, 30 Tage, 7 Tage sind additiv über beide Habits
      // (3 Abschlüsse insgesamt: "3 dieses Jahr" etc., Default-Locale "de").
      expect(railText).toContain("3 dieses Jahr");
      expect(railText).toContain("3 letzte 30 Tage");
      expect(railText).toContain("3 letzte 7 Tage");
      // Streak ist die längste laufende Serie in current*periodDays — die
      // tägliche (current=2, periodDays=1 → 2) schlägt die wöchentliche
      // (current=1, periodDays=7 → 7) nur, wenn man NICHT mit periodDays
      // gewichtet; 7 > 2, die Woche gewinnt. Das ist genau der
      // Komparator-Fix, den diese Runde vornimmt (I3) — dieser Test prüft
      // also auch, dass der Komparator tatsächlich periodDays einbezieht,
      // nicht nur, dass irgendeine Streak-Zeile erscheint.
      expect(railText).toContain("1 Woche in Folge");

      // Pro-Habit-Zeile: jede Serie zeigt ihre eigene Streak im
      // `trailing`-Slot der Row — nicht mehr nur im Rand, sondern an der
      // Zeile selbst (I3: "die Fakten dürfen nicht weg, nur das
      // Abzeichen"). Beide sind zugleich ihr eigener Rekord → "Neuer
      // Rekord" statt einer zweiten Zahl.
      const dailyRow = page.locator('[data-testid="row"]', { hasText: "E2E Daily Habit" });
      await expect(dailyRow).toBeVisible();
      await expect(dailyRow).toContainText("2 Tage in Folge");
      await expect(dailyRow).toContainText("Neuer Rekord");

      const weeklyRow = page.locator('[data-testid="row"]', { hasText: "E2E Weekly Habit" });
      await expect(weeklyRow).toBeVisible();
      await expect(weeklyRow).toContainText("1 Woche in Folge");
      await expect(weeklyRow).toContainText("Neuer Rekord");
    } finally {
      // Die Sitzung muss nach diesem Test wieder leer sein — sonst wird
      // der Test oben ("kein gestrichelter Kasten") beim nächsten Lauf
      // wieder gegen einen Zustand geprüft, der seinen eigenen Zweig nie
      // erreicht (derselbe Fehler, den I2 an der geteilten Sitzung
      // gefunden hat). `ON DELETE CASCADE` auf `task_completions.task_id`
      // räumt die Abschlüsse mit auf.
      if (dailyTaskId) await client.query("DELETE FROM tasks WHERE id = $1", [dailyTaskId]);
      if (weeklyTaskId) await client.query("DELETE FROM tasks WHERE id = $1", [weeklyTaskId]);
      await client.end();
    }
  });
});
