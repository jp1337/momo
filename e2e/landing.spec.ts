import { test, expect } from "@playwright/test";

/**
 * Landing page E2E tests — unauthenticated user sees the landing page.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Landing Page", () => {
  test("renders the hero section with app name", async ({ page }) => {
    await page.goto("/");
    // The hero headline is a claim, not the app name; the name is the header brand
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(/momo/i).first()).toBeVisible();
  });

  test("has a login/sign-in link", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.locator("a[href*='login']").first();
    await expect(loginLink).toBeVisible();
  });

  test("unauthenticated user is redirected to login from app routes", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });
});
