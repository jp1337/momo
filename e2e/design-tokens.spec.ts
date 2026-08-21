import { test, expect, type Page } from "@playwright/test";

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

async function readTokens(page: Page) {
  return page.evaluate((names: string[]) => {
    const s = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const n of names) out[n] = s.getPropertyValue(n).trim();
    return out;
  }, REQUIRED);
}

/**
 * Navigiert deterministisch mit einem festen Theme — ohne mit next-themes'
 * Hydration zu wettlaufen.
 *
 * Ein frueherer Ansatz setzte `data-theme` per `page.evaluate` NACH
 * `page.goto`. Das gewinnt das Rennen gegen next-themes' Hydration nur
 * manchmal: next-themes (defaultTheme="system", enableSystem) synchronisiert
 * das Attribut beim Mount erneut mit dem aufgeloesten System-Theme. Die
 * Playwright-Storage-State hier enthaelt kein `origins`-Array (kein
 * localStorage-Eintrag), also entscheidet allein `prefers-color-scheme` —
 * und Headless-Chromium liefert dafuer standardmaessig "light". Ergebnis:
 * ein ca. 50-prozentiger Flake in Kombi-Laeufen, je nachdem ob next-themes'
 * Effekt vor oder nach dem Token-Read feuert.
 *
 * Fix: das Rennen gar nicht erst stattfinden lassen. `emulateMedia` setzt
 * die System-Praeferenz VOR der Navigation, sodass next-themes beim Mount
 * exakt das Theme aufloest, das wir wollen — jede Resynchronisation ist
 * dann idempotent. `addInitScript` setzt zusaetzlich `data-theme` schon vor
 * dem ersten App-Skript, deckt also auch den Frame vor der Hydration ab.
 * Beide Mechanismen zusammen sind synchron mit next-themes statt gegen es
 * zu laufen — es gibt kein "warte auf das Hydrations-Rennen" mehr, weil es
 * kein Rennen mehr gibt.
 */
async function gotoWithTheme(page: Page, theme: "dark" | "light") {
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript((t: string) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
  await page.goto("/dashboard");
}

test.describe("Design-Tokens", () => {
  test("sind im Dark Mode vollstaendig", async ({ page }) => {
    await gotoWithTheme(page, "dark");
    const t = await readTokens(page);
    for (const name of REQUIRED) expect(t[name], name).not.toBe("");
    expect(t["--ground"]).toBe("#0e100f");
    expect(t["--amber"]).toBe("#f0a500");
    expect(t["--on-amber"]).toBe("#171408");
  });

  test("sind im Light Mode vollstaendig und anders", async ({ page }) => {
    await gotoWithTheme(page, "light");
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
      await gotoWithTheme(page, theme);
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

test.describe("Schriften", () => {
  test("die drei Rollen sind gesetzt und geladen", async ({ page }) => {
    await page.goto("/dashboard");
    const fams = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        display: s.getPropertyValue("--font-display").trim(),
        ui: s.getPropertyValue("--font-ui").trim(),
        mono: s.getPropertyValue("--font-mono").trim(),
        body: s.getPropertyValue("--font-body").trim(),
      };
    });
    expect(fams.display).toContain("Fraunces");
    expect(fams.ui).toContain("Instrument");
    expect(fams.mono).toContain("JetBrains");
    // Alias fuer nicht migrierte Dateien
    expect(fams.body).toContain("JetBrains");
    expect(fams.display).not.toContain("Lora");
    expect(fams.ui).not.toContain("DM Sans");
  });

  test("Fraunces ist wirklich geladen, nicht auf Serif zurueckgefallen", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const loaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('1rem "Fraunces"');
    });
    expect(loaded).toBe(true);
  });
});
