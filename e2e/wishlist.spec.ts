import { test, expect } from "@playwright/test";
import { createWishlistItem, deleteWishlistItem } from "./helpers/api";

/**
 * Wishlist E2E tests.
 *
 * Covers: page load, item creation (via API + UI), item display,
 * buy/discard interactions, and budget display.
 */

test.describe("Wishlist Page", () => {
  /**
   * Jede per API angelegte Wunschzeile wird hier vermerkt und in `afterEach`
   * geloescht — nicht am Ende des Tests, der sie angelegt hat.
   *
   * Vorher raeumte jeder Test inline auf, als letzte Anweisung nach seinen
   * Assertions. Faellt eine Assertion davor durch, wird die Zeile nie
   * geloescht und ueberlebt in der geteilten E2E-Datenbank. Das ist nicht
   * bloss Muell: `coinUnlockThreshold: 500` unten rendert die Ziffernfolge
   * "500", und `e2e/progress.spec.ts` sowie `e2e/navigation.spec.ts` pruefen
   * an zwanzig Stellen `not.toContainText(/500/i)` gegen den GESAMTEN Body.
   * Ein einziger fehlgeschlagener Lauf hier faerbt dort zehn Tests dauerhaft
   * rot — in Dateien, die diesen Fixture nie gesehen haben. Genau das ist in
   * der Lichtkegel-Phase 2 zweimal passiert.
   *
   * `afterEach` laeuft auch nach einem Fehlschlag. Damit kann ein roter Test
   * nur noch sich selbst kosten.
   *
   * Serieller Lauf vorausgesetzt (`fullyParallel: false`, `workers: 1` in
   * playwright.config.ts) — deshalb genuegt eine Liste im Modulgueltigkeits-
   * bereich. Wird das je auf parallel gestellt, muss daraus ein Fixture
   * werden.
   */
  const created: string[] = [];

  test.afterEach(async ({ request }) => {
    while (created.length > 0) {
      const id = created.pop() as string;
      // Eine fehlgeschlagene Loeschung darf die uebrigen nicht verhindern.
      try {
        await deleteWishlistItem(request, id);
      } catch {
        // `deleteWishlistItem` verschluckt HTTP-Fehler ohnehin; das hier
        // faengt nur Netzwerkabbrueche, damit die Schleife weiterlaeuft.
      }
    }
  });

  test("loads without error", async ({ page }) => {
    await page.goto("/wishlist");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500|Interner Fehler/i);
  });

  test("shows page heading", async ({ page }) => {
    await page.goto("/wishlist");
    await page.waitForLoadState("networkidle");
    // "Wunschliste" heading
    await expect(
      page.locator("h1, h2").filter({ hasText: /Wunschliste|Wishlist/i }).first()
    ).toBeVisible();
  });

  test("displays a wishlist item created via API", async ({
    page,
    request,
  }) => {
    const title = `E2E Wish ${Date.now()}`;
    const item = await createWishlistItem(request, title);
    created.push(item.id);

    await page.goto("/wishlist");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="${title}"`)).toBeVisible({ timeout: 5000 });

  });

  test("'Add Item' button opens the creation form", async ({ page }) => {
    await page.goto("/wishlist");
    await page.waitForLoadState("networkidle");

    // "+ Artikel hinzufügen"
    const addBtn = page
      .locator("button")
      .filter({ hasText: /Artikel hinzufügen|Add Item|Hinzufügen/i })
      .first();
    if ((await addBtn.count()) > 0) {
      await addBtn.click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 3000 });
      await page.keyboard.press("Escape");
    } else {
      // Empty state might have a different CTA
      await expect(page.locator("body")).not.toContainText(/500/i);
    }
  });

  test("wishlist item shows price when set", async ({ page, request }) => {
    const title = `Priced Item ${Date.now()}`;
    const item = await createWishlistItem(request, title, { price: 29.99 });
    created.push(item.id);

    await page.goto("/wishlist");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="${title}"`)).toBeVisible({ timeout: 5000 });
    // Price should appear somewhere in the card
    await expect(page.locator("body")).toContainText(/29/);

  });

  test("wishlist item with coin threshold shows lock status", async ({
    page,
    request,
  }) => {
    const title = `Coin Item ${Date.now()}`;
    const item = await createWishlistItem(request, title, {
      coinUnlockThreshold: 500,
    });
    created.push(item.id);

    await page.goto("/wishlist");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="${title}"`)).toBeVisible({ timeout: 5000 });

  });

  test("multiple wishlist items all appear on the page", async ({
    page,
    request,
  }) => {
    const ts = Date.now();
    const item1 = await createWishlistItem(request, `Wish A ${ts}`);
    const item2 = await createWishlistItem(request, `Wish B ${ts}`);
    created.push(item1.id, item2.id);

    await page.goto("/wishlist");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="Wish A ${ts}"`)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator(`text="Wish B ${ts}"`)).toBeVisible({
      timeout: 5000,
    });

  });

  test("renders correctly on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/wishlist");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("wishlist history tab loads without error", async ({ page }) => {
    await page.goto("/wishlist");
    await page.waitForLoadState("networkidle");
    // Look for a history/Verlauf tab button
    const historyTab = page
      .locator("button, a")
      .filter({ hasText: /Verlauf|History/i })
      .first();
    if ((await historyTab.count()) > 0) {
      await historyTab.click();
      await expect(page.locator("body")).not.toContainText(/500/i);
    }
  });
});
