import { test, expect, type Page } from "@playwright/test";
import { gotoWithTheme } from "./helpers/theme";
import {
  MIGRATED_PAGES,
  countAmber,
  countBoxes,
  countDisplayFont,
  measureColumns,
} from "./helpers/design-count";

/**
 * Navigiert mit festem Theme und wartet zusätzlich, bis jede bekannte
 * Eintrittsanimation auf der Seite abgeschlossen ist.
 *
 * `design-count.ts`s `countAmber`/`countDisplayFont` überspringen Elemente
 * mit `opacity: 0` (Inhalt, der wirklich nicht sichtbar ist, soll nicht
 * zählen) — das Dashboard animiert seinen `.lichtkegel`-Container aber von
 * `opacity: 0` auf `1` beim Mount (`daily-quest-card.tsx`, `quest-light`).
 * `gotoWithTheme` endet bei `load`, ohne auf diese Animation zu warten, und
 * eine Messung mitten in der Animation liest das eine erlaubte Licht als
 * "nicht da": beide Deckelungs-Regeln unten (`inside ≤ 2`, `outside ≤ …`)
 * werden von `0/0` genauso erfüllt wie von einer echten Messung, ohne dass
 * der Test das je bemerkt — genau der Fund der Task-3-Review.
 *
 * `.lichtkegel` selbst hat seit 2026-08-22 keine Eintrittsanimation mehr
 * (die Atemanimation läuft auf `::before` und erreicht nie 0), aber
 * `quick-wins-section.tsx`s `motion.section` (`data-testid="quick-wins-section"`)
 * animiert seither GENAU denselben Weg (`opacity: 0` → `1`) — eine zweite
 * Eintrittsanimation, die nach dieser Wartefunktion entstand und die sie
 * deshalb ebenfalls abwarten muss, sonst kann Quick Wins als fehlend
 * gemessen werden, während es nur noch nicht eingeblendet ist. Jede
 * Animation bleibt ein eigenständiger, optionaler `expect` — eine Seite
 * ohne das jeweilige Element (z. B. /focus ohne Quick Wins) überspringt
 * die Wartung, statt zu scheitern.
 */
async function gotoSettled(page: Page, theme: "dark" | "light", path: string) {
  await gotoWithTheme(page, theme, path);
  for (const selector of [".lichtkegel", '[data-testid="quick-wins-section"]']) {
    const el = page.locator(selector).first();
    if ((await el.count()) > 0) {
      await expect(el).toHaveCSS("opacity", "1");
    }
  }
}

/**
 * Welche migrierten Seiten einen Lichtkegel bzw. App-Chrome (`<header>`)
 * tragen — als benannte Erwartung, nicht vom DOM abgeleitet (Task-9-Review
 * F1). Eine abgeleitete Prüfung wie `(await page.locator(...).count()) > 0`
 * schreibt keine Erwartung fest, sie liest nur zurück, was gerade da ist:
 * verschwindet der Lichtkegel oder der Header irgendwo unbeabsichtigt (z. B.
 * der Navbar-Header wird zu `<div role="banner">`), geht die Bedingung auf
 * JEDER Seite lautlos auf `false`, und die Positivprobe, die genau diese
 * Regression fangen soll, wird auf jeder Seite übersprungen statt rot zu
 * werden. Mit einer benannten Menge bricht stattdessen ein `expect` auf der
 * betroffenen Seite, weil die tatsächliche Zahl nicht mehr zur erklärten
 * Erwartung passt.
 */
const WITH_LIGHT = new Set(["/dashboard"]);
const CHROMELESS = new Set(["/focus"]);

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
      // `countAmber` liest bis zu acht `getComputedStyle`-Aufrufe pro Element
      // über `document.querySelectorAll("*")` plus zwei Pseudoelement-Reads —
      // unter voller Suite-Last (Full-Run, nicht isoliert) reichte das
      // Standard-Timeout von 30s auf `/focus (dark)` › "trägt Amber höchstens
      // einmal" nicht, weil `/focus`s Auswahlphase die volle Liste rendert.
      // Isoliert lief derselbe Test grün — kein Bug in der Zählung, ein zu
      // knappes Timeout unter Last. Betrifft nur diese fünf Design-Regel-
      // Tests, nicht die Suite insgesamt.
      test.beforeEach(() => {
        test.setTimeout(60_000);
      });
      test("trägt Amber höchstens einmal, dokumentweit", async ({ page }) => {
        await gotoSettled(page, theme, path);
        const hits = await countAmber(page);
        const outside = hits.filter((h) => !h.inLight);
        const inside = hits.filter((h) => h.inLight);
        const dump = (hs: typeof hits) =>
          hs.map((h) => `${h.tag}[${h.testid ?? "-"}] ${h.prop} "${h.text}"`).join("\n");
        // Positivprobe, aber NUR auf Seiten mit einem `.lichtkegel` — die
        // Spec kennt eine amberfarbene HANDLUNG (z. B. reiner Textlink)
        // genauso wie ein Licht (Task-3-Review, Runde 3: `/tasks` & Co.
        // haben keinen Lichtkegel und waeren mit einer unbedingten Probe
        // hier faelschlich rot, obwohl die Zeile direkt darunter genau
        // diesen Fall schon vorsieht — `inside.length > 0 ? 0 : 1`). Ohne
        // die Bedingung wuerde die Probe sich selbst widersprechen: sie
        // verlangt einen Lichtkegel-Treffer auf einer Seite, deren eigene
        // Regel sagt, dass es keinen braucht. `hasLight` ist die benannte
        // Erwartung `WITH_LIGHT` (oben), nicht mehr vom DOM abgelesen
        // (Task-9-Review F1) — das `expect` direkt danach macht beide
        // Richtungen laut: fehlt der Lichtkegel auf einer Seite, die ihn
        // tragen soll, oder trägt eine andere Seite unerwartet einen, wird
        // die Zeile rot statt dass die Positivprobe lautlos übersprungen wird.
        const hasLight = WITH_LIGHT.has(path);
        expect(
          (await page.locator(".lichtkegel").count()) > 0,
          `Lichtkegel-Erwartung für ${path}: ${hasLight ? "erwartet, aber keiner gefunden" : "keiner erwartet, aber einer gefunden"}`,
        ).toBe(hasLight);
        if (hasLight) {
          // Der Lichtkegel-Wash (`.lichtkegel::before`, siehe globals.css)
          // ist auf einer Seite MIT Lichtkegel unbedingt vorhanden — er
          // haengt an keinem Seed-Zustand. Fehlt dieser Treffer, misst der
          // Zaehler nichts statt "kein Amber"; eine reine Obergrenze (unten)
          // kann diesen Unterschied nicht sehen, weil 0/0 sie genauso
          // erfuellt wie eine echte Messung (Task-3-Review, C1).
          expect(
            hits.some((h) => h.prop === "::before"),
            "der Lichtkegel-Wash wird nicht gesehen — der Zähler misst nichts, nicht 'kein Amber'",
          ).toBe(true);
        }
        // C2 (final fix wave review): dieselbe Falle wie beim Wash oben, nur
        // an der Handlung statt am Licht — ein unlayered `a { color: inherit }`
        // schlaegt eine layered `text-[var(--amber)]`-Utility, und die reine
        // Obergrenze unten (`inside.length <= 2`) wird von 0 Treffern genauso
        // erfuellt wie von einer echten Messung. Bedingt auf tatsaechliches
        // Vorhandensein des Action-Links (der Fixture-Quest kann completed
        // sein, dann gibt es keinen), sonst waere die Probe selbst blind fuer
        // genau den Fall, den sie faengt.
        if (path === "/dashboard" && (await page.locator('[data-testid="quest-action"]').count()) > 0) {
          expect(
            hits.some((h) => h.testid === "quest-action" && h.prop === "color"),
            "quest-action ist sichtbar, traegt aber kein --amber als Textfarbe",
          ).toBe(true);
        }
        // Innerhalb der einen Lichtquelle sind Wash und die Textfarbe der
        // einen Handlung erlaubt — das ist ein Licht, nicht zwei Elemente.
        expect(inside.length, `im Licht:\n${dump(inside)}`).toBeLessThanOrEqual(2);
        // Außerhalb: gibt es ein Licht, ist außerhalb kein Amber erlaubt;
        // gibt es keins, darf genau eine Handlung Amber tragen.
        expect(outside.length, `außerhalb:\n${dump(outside)}`).toBeLessThanOrEqual(
          inside.length > 0 ? 0 : 1,
        );
      });

      test("Amber-Zähler ist nicht blind für Bildquellen", async ({ page }) => {
        // countAmber liest Farbe nur aus computed style — Farbe, die in
        // einer Bildressource steckt (<img>, background-image: url(...),
        // <use href>), ist für ihn unsichtbar (siehe JSDoc dort). Diese
        // Probe schließt genau die Lücke, die den Navbar-Fix (Task 3)
        // motiviert hat: kein <img src="*.svg"> mehr im Dokument (das war
        // die alte Feder, /icon.svg, amberfarben und für den Zähler nie
        // sichtbar), und die Feder ist tatsächlich als Inline-SVG da — ein
        // Regressionstest ohne diesen bemerkt eine Rückkehr zum Bild nie,
        // weil alle vier Zähler weiterhin grün blieben.
        await gotoSettled(page, theme, path);
        const svgImages = await page.locator('img[src$=".svg"]').count();
        expect(
          svgImages,
          "ein <img src=*.svg> trägt Farbe, die der Amber-Zähler nicht sehen kann",
        ).toBe(0);
        // Scoped auf den Wortmarken-Link selbst (das <header> enthaelt sonst
        // auch den Muenz-Icon und den Theme-Toggle als <svg> — "header svg"
        // waere schon vom Muenzzaehler erfuellt, egal ob die Feder existiert
        // oder nicht). Sidebar und Mobile-Nav haben ebenfalls einen Link auf
        // /dashboard, liegen aber in <aside>/<nav>, nicht <header> — die
        // Kombination trifft eindeutig nur die Wortmarke.
        //
        // Bedingt auf `CHROMELESS` (Task 9, Review F1): `/focus` liegt
        // bewusst außerhalb der App-Hülle (eigenes `layout.tsx`, kein
        // `(app)`-Route-Group) und hat deshalb GAR KEIN `<header>` — die
        // Bühne hat keinen Rand, auch keinen oberen. Die Wortmarken-Probe
        // behauptet dort nichts über "Bild statt Inline-SVG" (das Bild
        // existiert so wenig wie die Inline-Variante); sie wäre auf einer
        // chromelosen Seite ein Test-Artefakt, kein echter Regressionsfang.
        // Die Erwartung selbst ist jetzt eine benannte Menge statt vom DOM
        // abgelesen — das `expect` macht laut, wenn eine Seite ihren Header
        // verliert (oder unerwartet einen bekommt), statt die Probe für ALLE
        // Seiten lautlos zu überspringen (derselbe Fehler wie bei `hasLight`
        // oben, hier auf den Header übertragen).
        const isChromeless = CHROMELESS.has(path);
        expect(
          (await page.locator("header").count()) > 0,
          `Chrome-Erwartung (Header) für ${path}: ${isChromeless ? "keiner erwartet, aber einer gefunden" : "erwartet, aber keiner gefunden"}`,
        ).toBe(!isChromeless);
        if (!isChromeless) {
          const inlineFeather = await page.locator('header a[href="/dashboard"] svg').count();
          expect(inlineFeather, "die Feder ist kein Inline-SVG mehr").toBeGreaterThan(0);
        }
      });

      test("trägt Fraunces genau einmal", async ({ page }) => {
        await gotoSettled(page, theme, path);
        const hits = await countDisplayFont(page);
        expect(
          hits.length,
          hits.map((h) => `${h.tag} ${h.prop} "${h.text}"`).join("\n"),
        ).toBe(1);
      });

      test("hat keine umrahmte oder gefüllte Inhaltsfläche", async ({ page }) => {
        await gotoSettled(page, theme, path);
        const hits = await countBoxes(page);
        expect(
          hits.length,
          hits.map((h) => `${h.tag}[${h.testid ?? "-"}] ${h.prop} "${h.text}"`).join("\n"),
        ).toBe(0);
      });

      test("hält jede Inhaltsspalte auf dem Maß", async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await gotoSettled(page, theme, path);
        const { measurePx, widths, breakouts } = await measureColumns(page);
        expect(widths.length, "keine [data-column] gefunden").toBeGreaterThan(0);
        for (const w of widths) expect(w).toBeLessThanOrEqual(measurePx + 1);
        // Ein Überlauf über die Spalte hinaus ist erlaubt, aber nur benannt
        // (Task-11-Review I1): ein Diagramm trägt `data-breakout`, alles
        // andere, das die Spalte überschreitet, ist ein unentdeckter Fund,
        // kein Feature — genau die Lücke, die diese Regel vorher hatte.
        const unlabeled = breakouts.filter((b) => b.reason === null);
        expect(
          unlabeled.length,
          unlabeled
            .map((b) => `${b.tag}[${b.testid ?? "-"}] +${Math.round(b.overflowPx)}px, unbenannt`)
            .join("\n"),
        ).toBe(0);
      });
    });
  }
}
