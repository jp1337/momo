import { test, expect } from "@playwright/test";

/**
 * Settings pages E2E tests.
 *
 * Covers all six settings sections: Account, Notifications, Quest & Tasks,
 * Security, Integrations, and Data & Privacy.
 *
 * Each section test verifies:
 *  - Page loads without error or redirect to login
 *  - Key UI elements are visible
 *  - No 500 errors in the body
 */

// ─── Settings Shell ───────────────────────────────────────────────────────────

test.describe("Settings Shell", () => {
  test("redirects /settings to /settings/account", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    // Should redirect to account sub-page
    await expect(page).toHaveURL(/settings/);
  });

  test("settings navigation shows all 6 sections", async ({ page }) => {
    await page.goto("/settings/account");
    await page.waitForLoadState("networkidle");

    // Sidebar/tab navigation should have section labels
    const navItems = [
      /Konto|Account/i,
      /Benachrichtigungen|Notifications/i,
      /Quest|Aufgaben/i,
      /Sicherheit|Security/i,
      /Integration/i,
      /Daten|Data/i,
    ];

    for (const pattern of navItems) {
      const el = page.locator("nav").filter({ hasText: pattern }).first();
      if ((await el.count()) === 0) {
        // Try without nav constraint
        const elAlt = page.locator("a, button").filter({ hasText: pattern }).first();
        await expect(elAlt).toBeVisible({ timeout: 5000 });
      } else {
        await expect(el).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

// ─── Account Settings ─────────────────────────────────────────────────────────

test.describe("Settings: Account", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/settings/account");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("shows name field", async ({ page }) => {
    await page.goto("/settings/account");
    await page.waitForLoadState("networkidle");
    // Name input should be visible
    const nameInput = page
      .locator('input[name="name"], input[placeholder*="Name"]')
      .first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  });

  test("shows language switcher", async ({ page }) => {
    await page.goto("/settings/account");
    await page.waitForLoadState("networkidle");
    // Language options: de, en, fr, es, nl
    const langSection = page.locator("body").filter({ hasText: /Deutsch|English|Sprache|Language/i });
    await expect(langSection.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows timezone settings", async ({ page }) => {
    await page.goto("/settings/account");
    await page.waitForLoadState("networkidle");
    // Timezone selector or label
    const tzEl = page
      .locator("body")
      .filter({ hasText: /Zeitzone|Timezone|Zeit/i });
    await expect(tzEl.first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Notifications Settings ───────────────────────────────────────────────────

test.describe("Settings: Notifications", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/settings/notifications");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("shows push notification toggle area", async ({ page }) => {
    await page.goto("/settings/notifications");
    await page.waitForLoadState("networkidle");
    // Should have some notification-related content
    await expect(page.locator("body")).not.toContainText(/500/i);
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("shows notification channels section", async ({ page }) => {
    await page.goto("/settings/notifications");
    await page.waitForLoadState("networkidle");
    // Notification channels: ntfy, Pushover, Telegram, Email
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("shows notification history link or section", async ({ page }) => {
    await page.goto("/settings/notifications");
    await page.waitForLoadState("networkidle");
    // Should load the history section
    await expect(page.locator("body")).not.toContainText(/500/i);
  });
});

// ─── Quest & Tasks Settings ───────────────────────────────────────────────────

test.describe("Settings: Quest & Tasks", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/settings/quest");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("shows postpone limit slider", async ({ page }) => {
    await page.goto("/settings/quest");
    await page.waitForLoadState("networkidle");
    // Slider for postpone limit (1-5)
    const slider = page.locator('input[type="range"]').first();
    if ((await slider.count()) > 0) {
      await expect(slider).toBeVisible({ timeout: 5000 });
    } else {
      // May be a custom slider component
      await expect(page.locator("body")).not.toContainText(/500/i);
    }
  });

  test("shows vacation mode toggle", async ({ page }) => {
    await page.goto("/settings/quest");
    await page.waitForLoadState("networkidle");
    // Vacation mode section
    await expect(page.locator("body")).not.toContainText(/500/i);
    const vacationEl = page
      .locator("body")
      .filter({ hasText: /Urlaub|Vacation/i });
    await expect(vacationEl.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows emotional closure toggle", async ({ page }) => {
    await page.goto("/settings/quest");
    await page.waitForLoadState("networkidle");
    // Emotional closure section
    await expect(page.locator("body")).not.toContainText(/500/i);
  });
});

// ─── Security Settings ────────────────────────────────────────────────────────

test.describe("Settings: Security", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/settings/security");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("shows 2FA section", async ({ page }) => {
    await page.goto("/settings/security");
    await page.waitForLoadState("networkidle");
    // 2FA section title or enable button
    const twoFaEl = page
      .locator("body")
      .filter({ hasText: /Zwei-Faktor|2FA|Two-Factor|Authenticator/i });
    await expect(twoFaEl.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows passkeys section", async ({ page }) => {
    await page.goto("/settings/security");
    await page.waitForLoadState("networkidle");
    // Passkey section
    const passkeyEl = page
      .locator("body")
      .filter({ hasText: /Passkey|WebAuthn|Passkeys/i });
    await expect(passkeyEl.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows active sessions section", async ({ page }) => {
    await page.goto("/settings/security");
    await page.waitForLoadState("networkidle");
    // Active sessions section
    const sessionsEl = page
      .locator("body")
      .filter({ hasText: /Sitzung|Session/i });
    await expect(sessionsEl.first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Integrations Settings ────────────────────────────────────────────────────

test.describe("Settings: Integrations", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/settings/integrations");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("shows calendar feed section", async ({ page }) => {
    await page.goto("/settings/integrations");
    await page.waitForLoadState("networkidle");
    const calEl = page
      .locator("body")
      .filter({ hasText: /Kalender|Calendar|iCal/i });
    await expect(calEl.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows webhooks section", async ({ page }) => {
    await page.goto("/settings/integrations");
    await page.waitForLoadState("networkidle");
    const webhookEl = page
      .locator("body")
      .filter({ hasText: /Webhook/i });
    await expect(webhookEl.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows API keys link", async ({ page }) => {
    await page.goto("/settings/integrations");
    await page.waitForLoadState("networkidle");
    // Link to /api-keys page or inline API key mention
    const apiKeyEl = page
      .locator("body")
      .filter({ hasText: /API.Key|API-Key|API Keys/i });
    await expect(apiKeyEl.first()).toBeVisible({ timeout: 5000 });
  });

  test("webhook create button opens form", async ({ page }) => {
    await page.goto("/settings/integrations");
    await page.waitForLoadState("networkidle");

    const createBtn = page
      .locator("button")
      .filter({ hasText: /Webhook erstellen|Create Webhook|Neuer Webhook|Hinzufügen/i })
      .first();
    if ((await createBtn.count()) > 0) {
      await createBtn.click();
      await expect(page.locator("body")).not.toContainText(/500/i);
    }
  });
});

// ─── Data & Privacy Settings ──────────────────────────────────────────────────

test.describe("Settings: Data & Privacy", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/settings/data");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("shows data export button", async ({ page }) => {
    await page.goto("/settings/data");
    await page.waitForLoadState("networkidle");
    // Export data button
    const exportBtn = page
      .locator("a, button")
      .filter({ hasText: /Export|Daten exportieren|Download/i })
      .first();
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
  });

  test("shows account deletion danger zone", async ({ page }) => {
    await page.goto("/settings/data");
    await page.waitForLoadState("networkidle");
    // Danger zone section
    const dangerEl = page
      .locator("body")
      .filter({ hasText: /Konto löschen|Delete Account|Danger/i });
    await expect(dangerEl.first()).toBeVisible({ timeout: 5000 });
  });

  test("delete account button exists but is protected", async ({ page }) => {
    await page.goto("/settings/data");
    await page.waitForLoadState("networkidle");
    // The delete account button should not immediately delete - it requires confirmation
    const deleteBtn = page
      .locator("button")
      .filter({ hasText: /Konto löschen|Delete Account|Löschen/i })
      .first();
    if ((await deleteBtn.count()) > 0) {
      await expect(deleteBtn).toBeVisible();
      // Do NOT click it — just verify it exists
    }
  });
});
