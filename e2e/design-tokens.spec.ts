import { test, expect } from "@playwright/test";

/**
 * Prueft, dass das Token-Fundament in beiden Themes vollstaendig aufgeloest
 * wird. Ein leerer String heisst: das Token existiert im aktiven Theme nicht.
 */
const REQUIRED = [
  "--ground", "--s1", "--s2", "--s3", "--hairline",
  "--ink", "--ink-2", "--ink-3",
  "--amber", "--on-amber", "--done", "--danger",
  "--radius-sm", "--radius-md", "--radius-lg", "--radius-pill",
  "--shadow-overlay",
];

async function readTokens(page: import("@playwright/test").Page) {
  return page.evaluate((names: string[]) => {
    const s = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const n of names) out[n] = s.getPropertyValue(n).trim();
    return out;
  }, REQUIRED);
}

test.describe("Design-Tokens", () => {
  test("sind im Dark Mode vollstaendig", async ({ page }) => {
    await page.goto("/dashboard");
    await page.evaluate(() =>
      document.documentElement.setAttribute("data-theme", "dark"),
    );
    const t = await readTokens(page);
    for (const name of REQUIRED) expect(t[name], name).not.toBe("");
    expect(t["--ground"]).toBe("#0e100f");
    expect(t["--amber"]).toBe("#f0a500");
    expect(t["--on-amber"]).toBe("#171408");
  });

  test("sind im Light Mode vollstaendig und anders", async ({ page }) => {
    await page.goto("/dashboard");
    await page.evaluate(() =>
      document.documentElement.setAttribute("data-theme", "light"),
    );
    const t = await readTokens(page);
    for (const name of REQUIRED) expect(t[name], name).not.toBe("");
    expect(t["--ground"]).toBe("#eceee5");
    expect(t["--amber"]).toBe("#a86f00");
    expect(t["--on-amber"]).toBe("#fffaf0");
  });

  test("Radien sind die vier Stufen der Skala", async ({ page }) => {
    await page.goto("/dashboard");
    const t = await readTokens(page);
    expect(t["--radius-sm"]).toBe("7px");
    expect(t["--radius-md"]).toBe("11px");
    expect(t["--radius-lg"]).toBe("14px");
    expect(t["--radius-pill"]).toBe("999px");
  });
});
