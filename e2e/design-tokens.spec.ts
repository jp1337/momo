import { test, expect, type Page } from "@playwright/test";
import { gotoWithTheme } from "./helpers/theme";

/**
 * Prueft, dass das Token-Fundament in beiden Themes vollstaendig aufgeloest
 * wird. Ein leerer String heisst: das Token existiert im aktiven Theme nicht.
 */
const REQUIRED = [
  "--ground", "--raised", "--hairline",
  "--ink", "--ink-2", "--ink-3",
  "--amber", "--on-amber", "--done", "--danger",
  "--radius-sm", "--radius-md", "--radius-lg", "--radius-pill",
  "--shadow-overlay",
  "--measure", "--rail", "--gutter",
];

async function readTokens(page: Page) {
  return page.evaluate((names: string[]) => {
    const s = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const n of names) out[n] = s.getPropertyValue(n).trim();
    return out;
  }, REQUIRED);
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
    // #8c5b00, not the original #a86f00 (Task B4, 2026-08-22): the original
    // measured 3.63:1 against --ground, under the 4.5:1 floor this same
    // spec sets for text tokens. Same hue, same saturation, darkened until
    // it clears 4.5:1 — see the comment on --amber in app/globals.css.
    expect(t["--amber"]).toBe("#8c5b00");
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

/**
 * Berechnet CIE L* aus sRGB-Kanaelen (relative Luminanz Y nach der WCAG-
 * Formel, dann Y -> L* nach CIE). Gleiche Formel wie im Report gefordert:
 * L* = Y <= 0.008856 ? 903.3*Y : 116*Y^(1/3) - 16.
 */
function relLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function lStar(rgb: [number, number, number]): number {
  const Y = relLuminance(rgb);
  return Y <= 0.008856 ? 903.3 * Y : 116 * Math.pow(Y, 1 / 3) - 16;
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const La = relLuminance(a);
  const Lb = relLuminance(b);
  const [lighter, darker] = La >= Lb ? [La, Lb] : [Lb, La];
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe("Surface", () => {
  test("raised hat eine Haarlinie und eine vom Grund verschiedene Flaeche", async ({ page }) => {
    await page.goto("/design-system");
    const el = page.getByTestId("surface-raised");
    await expect(el).toBeVisible();
    const s = await el.evaluate((n) => {
      const c = getComputedStyle(n);
      return {
        border: c.borderTopWidth,
        borderColor: c.borderTopColor,
        bg: c.backgroundColor,
        radius: c.borderTopLeftRadius,
      };
    });
    expect(s.border).not.toBe("0px");
    expect(s.bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(s.bg).not.toBe("transparent");
    expect(s.radius).toBe("11px");
  });

  test("overlay hat einen Schatten und keine Haarlinie", async ({ page }) => {
    await page.goto("/design-system");
    const el = page.getByTestId("surface-overlay");
    const s = await el.evaluate((n) => {
      const c = getComputedStyle(n);
      return { shadow: c.boxShadow, border: c.borderTopWidth };
    });
    expect(s.shadow).not.toBe("none");
    expect(s.border).toBe("0px");
  });

  // Die Assertion, die den urspruenglichen Fehler gefangen haette: die
  // vierstufige Leiter mass ΔL* ≈ 3 zwischen Nachbarstufen, weit unter der
  // Wahrnehmungsgrenze fuer grosse Flaechen (ΔL* ≥ 8). Schlaegt fehl, wenn
  // jemand --raised wieder naeher an --ground rueckt.
  for (const theme of ["dark", "light"] as const) {
    test(`ΔL*(--raised, --ground) ist mindestens 8 im ${theme} Mode`, async ({ page }) => {
      await gotoWithTheme(page, theme, "/design-system");
      const [groundCss, raisedCss] = await page.evaluate(() => {
        const s = getComputedStyle(document.documentElement);
        return [s.getPropertyValue("--ground").trim(), s.getPropertyValue("--raised").trim()];
      });
      const hexToRgb = (hex: string): [number, number, number] => {
        const h = hex.replace("#", "");
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      };
      const deltaL = Math.abs(lStar(hexToRgb(raisedCss)) - lStar(hexToRgb(groundCss)));
      expect(deltaL, `${theme}: ground=${groundCss} raised=${raisedCss}`).toBeGreaterThanOrEqual(8);
    });
  }
});

test.describe("Kontrast", () => {
  // Erweitert (Task B4, 2026-08-22): deckte bisher nur --ink-3 gegen
  // --ground ab. Die Spec-Regel selbst ("kein Token unter 4,5:1 gegen
  // seinen Grund, wenn darin Text steht — dekorativ ist keine Ausnahme",
  // docs/superpowers/specs/2026-08-21-lichtkegel-design.md §3) galt aber
  // fuer jeden Text-Token, nicht nur --ink-3 — und genau das liess vier
  // weitere AA-Verstoesse (amber ueberall, Button quiet hover, Badge-
  // Tints) durch, waehrend dieser Test durchgehend gruen war. Deckt jetzt
  // jeden Text-Token gegen jeden Grund ab, auf dem er im Code tatsaechlich
  // Text traegt — inklusive der amber/ink-Paarungen gegen --raised
  // (Button-Flaechen), nicht nur gegen --ground.
  // --amber against --raised is deliberately NOT in this list. It measured
  // 2.83:1 pre-fix, and there is no --amber dark enough to clear 4.5:1
  // against BOTH --ground and --raised without reading as brown instead of
  // amber (light --raised sits closer to --amber's own luminance than
  // --ground does, since --raised is the darker-in-light-mode token) — the
  // nearest value that clears --raised is ~#7d5200, a value with none of
  // amber's character left. The actual fix (Task B4) removes the only
  // place amber text ever sat on --raised — Button primary's hover fill —
  // in favour of `hover:underline` on a transparent background, rather
  // than darkening the token for every other amber-text use on the page to
  // fix an interaction state. Confirmed via grep: no `.tsx` pairs
  // `text-[var(--amber)]` with a `--raised` background.
  const PAIRS: ReadonlyArray<{ text: string; bg: string }> = [
    { text: "--ink", bg: "--ground" },
    { text: "--ink-2", bg: "--ground" },
    { text: "--ink-3", bg: "--ground" },
    { text: "--amber", bg: "--ground" },
    { text: "--done", bg: "--ground" },
    { text: "--danger", bg: "--ground" },
    { text: "--ink", bg: "--raised" },
  ];

  const hexToRgb = (hex: string): [number, number, number] => {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };

  for (const theme of ["dark", "light"] as const) {
    for (const { text, bg } of PAIRS) {
      test(`${text} erreicht 4.5:1 gegen ${bg} im ${theme} Mode`, async ({ page }) => {
        await gotoWithTheme(page, theme, "/design-system");
        const [bgCss, textCss] = await page.evaluate(
          ([bgVar, textVar]) => {
            const s = getComputedStyle(document.documentElement);
            return [s.getPropertyValue(bgVar).trim(), s.getPropertyValue(textVar).trim()];
          },
          [bg, text] as [string, string],
        );
        const ratio = contrastRatio(hexToRgb(textCss), hexToRgb(bgCss));
        expect(ratio, `${theme}: ${bg}=${bgCss} ${text}=${textCss}`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

test.describe("Button", () => {
  test("primary traegt Amber als Text, nicht als Flaeche", async ({ page }) => {
    // Amber selbst ist theme-abhaengig (#f0a500 dark vs. #8c5b00 light) —
    // gotoWithTheme fixiert das Theme vor der Navigation, siehe Kommentar oben.
    await gotoWithTheme(page, "dark", "/design-system");
    const s = await page.getByTestId("btn-primary").evaluate((n) => {
      const c = getComputedStyle(n);
      return { bg: c.backgroundColor, color: c.color, border: c.borderTopWidth };
    });
    // Amber #f0a500 = rgb(240, 165, 0) — als Textfarbe, nicht als Hintergrund
    expect(s.color).toBe("rgb(240, 165, 0)");
    expect(s.bg).not.toBe("rgb(240, 165, 0)");
    expect(s.border).toBe("0px");
  });

  test("es gibt genau drei Varianten", async ({ page }) => {
    await page.goto("/design-system");
    await expect(page.getByTestId("btn-primary")).toBeVisible();
    await expect(page.getByTestId("btn-quiet")).toBeVisible();
    await expect(page.getByTestId("btn-danger")).toBeVisible();
    await expect(page.getByTestId("btn-success")).toHaveCount(0);
    await expect(page.getByTestId("btn-outline")).toHaveCount(0);
  });
});

test.describe("Maß und Rand", () => {
  test("die drei Layout-Token haben die Werte der Spec", async ({ page }) => {
    await page.goto("/design-system");
    const t = await readTokens(page);
    expect(t["--measure"]).toBe("40rem");
    expect(t["--rail"]).toBe("13rem");
    expect(t["--gutter"]).toBe("3rem");
  });

  test("die Lesespalte ist bei 1440 px genau 640 px breit", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design-system");
    const box = await page.getByTestId("frame-with-rail").locator("[data-column]").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(641);
    expect(box!.width).toBeGreaterThanOrEqual(639);
  });

  test("der Rand steht bei 1440 px neben der Spalte, mit 48 px Rinne", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design-system");
    const frame = page.getByTestId("frame-with-rail");
    const col = (await frame.locator("[data-column]").boundingBox())!;
    const rail = (await frame.locator("[data-rail]").boundingBox())!;
    expect(rail.x).toBeGreaterThan(col.x + col.width - 1);
    expect(rail.x - (col.x + col.width)).toBeGreaterThanOrEqual(47);
    expect(rail.x - (col.x + col.width)).toBeLessThanOrEqual(49);
    expect(rail.width).toBeLessThanOrEqual(209);
  });

  // Der Umbruch der Spec: unter 1100 px fällt der Rand UNTER den Inhalt.
  // 1024 px ist bewusst gewählt — es ist Tailwinds `lg`, und genau der
  // Standard-Breakpoint wäre der falsche Umbruchpunkt gewesen.
  test("unter 1100 px fällt der Rand unter den Inhalt", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/design-system");
    const frame = page.getByTestId("frame-with-rail");
    const col = (await frame.locator("[data-column]").boundingBox())!;
    const rail = (await frame.locator("[data-rail]").boundingBox())!;
    expect(rail.y).toBeGreaterThan(col.y + col.height - 1);
  });

  test("ohne Rand ist die Lesespalte eine Spalte breit und im Inhaltsbereich zentriert", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design-system");
    const frame = page.getByTestId("frame-no-rail");
    const wrapper = (await frame.boundingBox())!;
    const col = (await frame.locator("[data-column]").boundingBox())!;
    expect(col.width).toBeLessThanOrEqual(641);
    // Spec §3: der Block wird als GANZES im Inhaltsbereich zentriert — die
    // Lücke links und rechts der Spalte in ihrem Wrapper muss also gleich
    // sein (max. 1px Differenz für Rundung), nicht linksbündig.
    const leftGap = col.x - wrapper.x;
    const rightGap = wrapper.x + wrapper.width - (col.x + col.width);
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(1);
  });

  // Spec: unter 640 px entfaellt der Rand ganz und seine Inhalte wandern an
  // das Seitenende — gleiche Form wie der 1024px-Test oben, nur unterhalb
  // des sm-Breakpoints statt nur unterhalb von `rail:`.
  test("unter 640 px steht der Rand ebenfalls unter dem Inhalt", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto("/design-system");
    const frame = page.getByTestId("frame-with-rail");
    const col = (await frame.locator("[data-column]").boundingBox())!;
    const rail = (await frame.locator("[data-rail]").boundingBox())!;
    expect(rail.y).toBeGreaterThan(col.y + col.height - 1);
  });
});

test.describe("List und Row", () => {
  test("Zeilen sind durch Haarlinien getrennt, nicht durch Kästen", async ({ page }) => {
    await page.goto("/design-system");
    const rows = page.getByTestId("demo-row");
    await expect(rows).toHaveCount(3);
    const first = await rows.nth(0).evaluate((n) => {
      const c = getComputedStyle(n);
      return { top: c.borderTopWidth, bottom: c.borderBottomWidth, bg: c.backgroundColor };
    });
    const second = await rows.nth(1).evaluate((n) => {
      const c = getComputedStyle(n);
      return { top: c.borderTopWidth, bg: c.backgroundColor, color: c.borderTopColor };
    });
    // Erste Zeile ohne Linie oben, jede folgende mit genau einer.
    expect(first.top).toBe("0px");
    expect(first.bottom).toBe("0px");
    expect(second.top).toBe("1px");
    // Kein Kasten: keine Fläche unter der Zeile.
    expect(first.bg).toBe("rgba(0, 0, 0, 0)");
    expect(second.bg).toBe("rgba(0, 0, 0, 0)");
    // Die Linie ist --hairline, nicht irgendeine Randfarbe (Task-4-Review
    // R16): "border-t" allein ohne "border-t-[var(--hairline)]" waere eine
    // sichtbare currentColor-Linie, und die Zeile oben bliebe gruen.
    const hairlineRgb = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.borderTopStyle = "solid";
      probe.style.borderTopWidth = "1px";
      probe.style.borderTopColor = "var(--hairline)";
      document.body.appendChild(probe);
      const rgb = getComputedStyle(probe).borderTopColor;
      probe.remove();
      return rgb;
    });
    expect(second.color).toBe(hairlineRgb);
  });

  test("die Dauer steckt in der Schriftgröße des Titels", async ({ page }) => {
    await page.goto("/design-system");
    const sizes: number[] = [];
    for (const step of ["small", "medium", "large"]) {
      const px = await page
        .locator(`[data-testid="demo-row"][data-effort="${step}"] [data-row-title]`)
        .evaluate((n) => parseFloat(getComputedStyle(n).fontSize));
      sizes.push(px);
    }
    expect(sizes[0]).toBeCloseTo(14, 0);
    expect(sizes[1]).toBeCloseTo(16, 0);
    expect(sizes[2]).toBeCloseTo(20, 0);
  });

  test("die Nutzerfarbe erscheint als 6-px-Punkt, nicht als Fläche", async ({ page }) => {
    await page.goto("/design-system");
    const dot = page.getByTestId("row-dot").first();
    const s = await dot.evaluate((n) => {
      const c = getComputedStyle(n);
      return {
        w: c.width,
        h: c.height,
        radius: c.borderTopLeftRadius,
        border: c.borderTopWidth,
        bg: c.backgroundColor,
      };
    });
    expect(s.w).toBe("6px");
    expect(s.h).toBe("6px");
    expect(s.border).toBe("0px");
    expect(parseFloat(s.radius)).toBeGreaterThanOrEqual(3);
    // Die Punktfläche ist tatsaechlich die uebergebene dotColor (Task-4-
    // Review R16) — ohne diese Zeile bliebe der Test gruen, selbst wenn
    // style={{ backgroundColor: dotColor }} entfernt wuerde.
    const doneRgb = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.backgroundColor = "var(--done)";
      document.body.appendChild(probe);
      const rgb = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return rgb;
    });
    expect(s.bg).toBe(doneRgb);
  });

  test("der leere Zustand ist eine Zeile und eine Handlung, kein Kasten", async ({ page }) => {
    await page.goto("/design-system");
    const empty = page.getByTestId("demo-empty");
    const s = await empty.evaluate((n) => {
      const c = getComputedStyle(n);
      return {
        borderTop: c.borderTopWidth,
        borderRight: c.borderRightWidth,
        borderBottom: c.borderBottomWidth,
        borderLeft: c.borderLeftWidth,
        bg: c.backgroundColor,
      };
    });
    // Alle vier Rahmenbreiten pruefbar; border-style nicht pruefbar, da
    // Tailwind-Preflight border: 0 solid auf alle Elemente setzt, also die
    // berechnete Style ist immer "solid" — ein Test darueber prueft nur
    // Tailwind, nicht unseren Code.
    expect(s.borderTop).toBe("0px");
    expect(s.borderRight).toBe("0px");
    expect(s.borderBottom).toBe("0px");
    expect(s.borderLeft).toBe("0px");
    expect(s.bg).toBe("rgba(0, 0, 0, 0)");
  });
});
