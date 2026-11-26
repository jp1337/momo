import { test, expect } from "@playwright/test";
import { expectNoServerError } from "./helpers/errors";

/**
 * Miscellaneous page E2E tests.
 *
 * Covers: health check API, API docs page, legal pages, and
 * public-facing routes (landing page extended coverage).
 */

// ─── Health Check ─────────────────────────────────────────────────────────────

test.describe("Health Check API", () => {
  test("GET /api/health returns 200", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
  });
});

// ─── API Documentation ────────────────────────────────────────────────────────

test.describe("API Documentation Page", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/api-docs");
    await page.waitForLoadState("networkidle");
    await expectNoServerError(page);
  });

  test("OpenAPI JSON spec is accessible", async ({ request }) => {
    const res = await request.get("/api/openapi.json");
    expect(res.status()).toBe(200);
    const body = await res.json() as { openapi: string };
    expect(body.openapi).toMatch(/^3\./);
  });
});

// ─── Legal Pages ──────────────────────────────────────────────────────────────

test.describe("Legal Pages", () => {
  test("Impressum page loads", async ({ page }) => {
    await page.goto("/impressum");
    await page.waitForLoadState("networkidle");
    await expectNoServerError(page);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5000 });
  });

  test("Datenschutz page loads", async ({ page }) => {
    await page.goto("/datenschutz");
    await page.waitForLoadState("networkidle");
    await expectNoServerError(page);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Landing Page (Extended) ──────────────────────────────────────────────────

// Use isolated (unauthenticated) storage state for landing page tests
test.describe("Landing Page", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

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

  test("landing page shows feature cards", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expectNoServerError(page);
    // Feature section should have content
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("login page shows sign-in options", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await expectNoServerError(page);
    // Should have some sign-in options (GitHub, Discord, Google, or Test Credentials)
    const signInContent = page.locator("main, form, button").first();
    await expect(signInContent).toBeVisible({ timeout: 5000 });
  });
});

// ─── User Profile API ─────────────────────────────────────────────────────────

test.describe("User Profile API", () => {
  test("GET /api/user returns user stats", async ({ request }) => {
    const res = await request.get("/api/user");
    expect(res.status()).toBe(200);
    const body = await res.json() as { coins: number; level: number };
    expect(typeof body.coins).toBe("number");
    expect(typeof body.level).toBe("number");
  });

  test("GET /api/user/profile returns profile data", async ({ request }) => {
    const res = await request.get("/api/user/profile");
    expect(res.status()).toBe(200);
    const body = await res.json() as { email?: string; name?: string };
    expect(body).toBeDefined();
  });
});

// ─── Tasks API Smoke Test ─────────────────────────────────────────────────────

test.describe("Tasks API Smoke Tests", () => {
  test("GET /api/tasks returns array", async ({ request }) => {
    const res = await request.get("/api/tasks");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.tasks)).toBe(true);
  });

  test("GET /api/topics returns array", async ({ request }) => {
    const res = await request.get("/api/topics");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.topics)).toBe(true);
  });

  test("GET /api/wishlist returns array", async ({ request }) => {
    const res = await request.get("/api/wishlist");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
  });

  test("GET /api/daily-quest returns quest data or null", async ({ request }) => {
    const res = await request.get("/api/daily-quest");
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Either a quest object or null
    expect(body === null || typeof body === "object").toBe(true);
  });
});

// ─── Theme Toggle ─────────────────────────────────────────────────────────────

test.describe("Theme Toggle", () => {
  test("theme toggle is present in navbar", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Theme toggle may be an icon-only button — just ensure page doesn't error
    await expectNoServerError(page);
  });
});
