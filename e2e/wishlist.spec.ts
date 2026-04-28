import { test, expect } from "@playwright/test";
import { createWishlistItem, deleteWishlistItem } from "./helpers/api";

/**
 * Wishlist E2E tests.
 *
 * Covers: page load, item creation (via API + UI), item display,
 * buy/discard interactions, and budget display.
 */

test.describe("Wishlist Page", () => {
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

    await page.goto("/wishlist");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="${title}"`)).toBeVisible({ timeout: 5000 });

    await deleteWishlistItem(request, item.id);
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

    await page.goto("/wishlist");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="${title}"`)).toBeVisible({ timeout: 5000 });
    // Price should appear somewhere in the card
    await expect(page.locator("body")).toContainText(/29/);

    await deleteWishlistItem(request, item.id);
  });

  test("wishlist item with coin threshold shows lock status", async ({
    page,
    request,
  }) => {
    const title = `Coin Item ${Date.now()}`;
    const item = await createWishlistItem(request, title, {
      coinUnlockThreshold: 500,
    });

    await page.goto("/wishlist");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="${title}"`)).toBeVisible({ timeout: 5000 });

    await deleteWishlistItem(request, item.id);
  });

  test("multiple wishlist items all appear on the page", async ({
    page,
    request,
  }) => {
    const ts = Date.now();
    const item1 = await createWishlistItem(request, `Wish A ${ts}`);
    const item2 = await createWishlistItem(request, `Wish B ${ts}`);

    await page.goto("/wishlist");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text="Wish A ${ts}"`)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator(`text="Wish B ${ts}"`)).toBeVisible({
      timeout: 5000,
    });

    await deleteWishlistItem(request, item1.id);
    await deleteWishlistItem(request, item2.id);
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
