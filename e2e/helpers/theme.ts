import type { Page } from "@playwright/test";

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
 *
 * Extracted from e2e/design-tokens.spec.ts (Task B3 fix, 2026-08-22) so
 * every spec that needs a deterministic theme — not just token reads —
 * shares one implementation instead of re-deriving (and re-breaking) it.
 */
export async function gotoWithTheme(
  page: Page,
  theme: "dark" | "light",
  path = "/dashboard",
) {
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript((t: string) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
  await page.goto(path);
}
