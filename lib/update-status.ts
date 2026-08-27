/**
 * Der Zustand des Versions-Blocks — fünf Fälle, nicht vier.
 *
 * Die Admin-Seite prüfte bis 2026-08-22 `!disabled && !error &&
 * !updateAvailable` und rendere darauf "Momo ist aktuell — du verwendest
 * die neueste Version". Damit fiel jeder Zustand, der nicht eindeutig
 * "veraltet" war, in dieselbe Beruhigung — auch der, in dem die neueste
 * Version schlicht unbekannt ist. Live stand deshalb "Momo ist aktuell"
 * über einer 0.5.0-Instanz, während 0.6.0 seit einem Tag veröffentlicht
 * war.
 */
export type UpdateStatus = "disabled" | "failed" | "unknown" | "current" | "outdated";

/**
 * Bildet ein Prüfergebnis auf genau einen darstellbaren Zustand ab.
 *
 * @param r - Das Ergebnis von checkForUpdates()
 * @returns Der Zustand, den die UI zeigen darf
 */
export function updateStatus(r: {
  disabled: boolean;
  error?: string;
  latestVersion: string | null;
  updateAvailable: boolean;
}): UpdateStatus {
  if (r.disabled) return "disabled";
  if (r.error) return "failed";
  if (r.latestVersion === null) return "unknown";
  return r.updateAvailable ? "outdated" : "current";
}
