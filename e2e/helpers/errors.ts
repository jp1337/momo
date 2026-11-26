import { expect, type Page } from "@playwright/test";

/**
 * Asserts the page is not a server error.
 *
 * Replaces `expect(body).not.toContainText(/500/i)`, which matched any "500"
 * on the page: the achievement "500 coins", a price, a coin threshold. That
 * made tests red for product data, and a leftover fixture in one spec turned
 * tests in other specs red. This looks only at what an error renders:
 * `app/error.tsx`'s error code, and Next's bare 500 page.
 *
 * @param page - The Playwright page to check
 */
export async function expectNoServerError(page: Page): Promise<void> {
  await expect(page.locator(".error-code", { hasText: /^\s*500\s*$/ })).toHaveCount(0);
  await expect(page.getByText("Internal Server Error", { exact: true })).toHaveCount(0);
}
