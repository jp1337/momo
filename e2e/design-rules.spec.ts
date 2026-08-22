import { test, expect } from "@playwright/test";
import { gotoWithTheme } from "./helpers/theme";
import {
  MIGRATED_PAGES,
  countAmber,
  countBoxes,
  countDisplayFont,
  measureColumns,
} from "./helpers/design-count";

/**
 * Die vier Regeln der Spec (§8), je migrierte Seite, in beiden Themes.
 *
 * Nicht enthalten ist /design-system: die Referenzseite ZEIGT Flächen,
 * Radien und Schriftrollen nebeneinander und kann die Regeln deshalb nicht
 * erfüllen. Sie ist der Katalog, nicht die Anwendung.
 */
for (const path of MIGRATED_PAGES) {
  for (const theme of ["dark", "light"] as const) {
    test.describe(`${path} (${theme})`, () => {
      test("trägt Amber höchstens einmal, dokumentweit", async ({ page }) => {
        await gotoWithTheme(page, theme, path);
        const hits = await countAmber(page);
        const outside = hits.filter((h) => !h.inLight);
        const inside = hits.filter((h) => h.inLight);
        const dump = (hs: typeof hits) =>
          hs.map((h) => `${h.tag}[${h.testid ?? "-"}] ${h.prop} "${h.text}"`).join("\n");
        // Innerhalb der einen Lichtquelle sind Wash und die Textfarbe der
        // einen Handlung erlaubt — das ist ein Licht, nicht zwei Elemente.
        expect(inside.length, `im Licht:\n${dump(inside)}`).toBeLessThanOrEqual(2);
        // Außerhalb: gibt es ein Licht, ist außerhalb kein Amber erlaubt;
        // gibt es keins, darf genau eine Handlung Amber tragen.
        expect(outside.length, `außerhalb:\n${dump(outside)}`).toBeLessThanOrEqual(
          inside.length > 0 ? 0 : 1,
        );
      });

      test("trägt Fraunces genau einmal", async ({ page }) => {
        await gotoWithTheme(page, theme, path);
        const hits = await countDisplayFont(page);
        expect(
          hits.length,
          hits.map((h) => `${h.tag} ${h.prop} "${h.text}"`).join("\n"),
        ).toBe(1);
      });

      test("hat keine umrahmte Inhaltsfläche", async ({ page }) => {
        await gotoWithTheme(page, theme, path);
        const hits = await countBoxes(page);
        expect(
          hits.length,
          hits.map((h) => `${h.tag}[${h.testid ?? "-"}] ${h.prop} "${h.text}"`).join("\n"),
        ).toBe(0);
      });

      test("hält jede Inhaltsspalte auf dem Maß", async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await gotoWithTheme(page, theme, path);
        const { measurePx, widths } = await measureColumns(page);
        expect(widths.length, "keine [data-column] gefunden").toBeGreaterThan(0);
        for (const w of widths) expect(w).toBeLessThanOrEqual(measurePx + 1);
      });
    });
  }
}
