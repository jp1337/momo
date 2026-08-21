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

  // Prueft in BEIDEN Themes explizit (nicht nur dem gerade aktiven Default —
  // next-themes kann je nach gespeicherter Praeferenz mit "light" starten),
  // dass --shadow-md als Listenglied in einer mehrteiligen box-shadow
  // ueberlebt. "none" ist nur als Alleinwert von box-shadow gueltig; als
  // Listenglied macht es die GESAMTE Deklaration ungueltig, und der Browser
  // verwirft sie komplett — das war der Bug, der der Daily-Quest-Karte ihren
  // Amber-Glow genommen hat.
  for (const theme of ["dark", "light"] as const) {
    test(`Schatten-Token sind im ${theme} Mode in Listen verwendbar`, async ({
      page,
    }) => {
      await page.goto("/dashboard");
      await page.evaluate(
        (t: string) => document.documentElement.setAttribute("data-theme", t),
        theme,
      );
      const shadow = await page.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.boxShadow =
          "0 0 16px color-mix(in srgb, var(--amber) 12%, transparent), var(--shadow-md)";
        document.body.appendChild(probe);
        const computed = getComputedStyle(probe).boxShadow;
        probe.remove();
        return computed;
      });
      // "none" hier heisst: die gesamte Deklaration wurde als ungueltig
      // verworfen, weil ein Listenglied "none" war. --shadow-md muss ein
      // maler-loses, aber gueltiges Shadow-Value sein (z. B. "0 0 #0000").
      expect(shadow, theme).not.toBe("none");
      expect(shadow, theme).toContain("16px");
    });
  }
});
