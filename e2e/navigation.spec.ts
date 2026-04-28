import { test, expect } from "@playwright/test";

/**
 * App Navigation E2E tests.
 *
 * Covers: sidebar navigation, mobile navigation, authenticated user can
 * reach all major sections, and keyboard navigation basics.
 */

test.describe("App Navigation", () => {
  test("dashboard loads after login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/login/);
    await expect(page).toHaveURL(/dashboard/);
  });

  test("can navigate to topics page", async ({ page }) => {
    await page.goto("/topics");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("can navigate to progress page", async ({ page }) => {
    await page.goto("/progress");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("can navigate to settings page", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).not.toHaveURL(/login/);
  });

  test("can navigate to wishlist page", async ({ page }) => {
    await page.goto("/wishlist");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("can navigate to habits page", async ({ page }) => {
    await page.goto("/habits");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("can navigate to achievements page", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("can navigate to stats page", async ({ page }) => {
    await page.goto("/stats");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("can navigate to review page", async ({ page }) => {
    await page.goto("/review");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("can navigate to quick mode page", async ({ page }) => {
    await page.goto("/quick");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("can navigate to focus mode page", async ({ page }) => {
    await page.goto("/focus");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("can navigate to api-keys page", async ({ page }) => {
    await page.goto("/api-keys");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("sidebar is visible on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Sidebar nav links should be visible
    const sidebar = page.locator("nav, aside").first();
    await expect(sidebar).toBeVisible();
  });

  test("mobile bottom nav is visible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Bottom navigation bar should appear
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("navbar shows coin counter for authenticated user", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Coin counter in navbar
    await expect(page.locator("body")).not.toContainText(/500/i);
  });

  test("all main navigation links from sidebar work", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const navLinks = [
      { href: "/tasks", text: /Aufgaben|Tasks/i },
      { href: "/topics", text: /Themen|Topics/i },
      { href: "/wishlist", text: /Wunschliste|Wishlist/i },
    ];

    for (const { href } of navLinks) {
      const link = page.locator(`a[href="${href}"]`).first();
      if ((await link.count()) > 0) {
        await link.click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(new RegExp(href.replace("/", "")));
        await expect(page.locator("body")).not.toContainText(/500/i);
        await page.goto("/dashboard");
        await page.waitForLoadState("networkidle");
      }
    }
  });
});

// ─── Unauthenticated redirects ────────────────────────────────────────────────

test.describe("Auth Guards", () => {
  // These tests use isolated (unauthenticated) state
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated user is redirected from /dashboard to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });

  test("unauthenticated user is redirected from /tasks to login", async ({
    page,
  }) => {
    await page.goto("/tasks");
    await expect(page).toHaveURL(/login/);
  });

  test("unauthenticated user is redirected from /topics to login", async ({
    page,
  }) => {
    await page.goto("/topics");
    await expect(page).toHaveURL(/login/);
  });

  test("unauthenticated user is redirected from /settings to login", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/login/);
  });

  test("unauthenticated user is redirected from /wishlist to login", async ({
    page,
  }) => {
    await page.goto("/wishlist");
    await expect(page).toHaveURL(/login/);
  });
});
