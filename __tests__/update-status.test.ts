import { describe, it, expect } from "vitest";
import { updateStatus } from "@/lib/update-status";

/**
 * Der Versions-Block hat fünf Zustände, und vier davon sahen in der UI
 * gleich aus: sie prüfte `!disabled && !error && !updateAvailable` und
 * zeigte darauf "Momo ist aktuell". Damit las sich "wir wissen es nicht"
 * (latestVersion === null) als Beruhigung.
 */
describe("updateStatus", () => {
  it("deaktiviert schlägt alles andere", () => {
    expect(
      updateStatus({ disabled: true, latestVersion: null, updateAvailable: false }),
    ).toBe("disabled");
  });

  it("ein Fehler ist ein Fehler, keine Beruhigung", () => {
    expect(
      updateStatus({
        disabled: false,
        error: "GitHub API returned 503",
        latestVersion: null,
        updateAvailable: false,
      }),
    ).toBe("failed");
  });

  it("ohne bekannte neueste Version ist der Zustand unbekannt, nicht aktuell", () => {
    expect(
      updateStatus({ disabled: false, latestVersion: null, updateAvailable: false }),
    ).toBe("unknown");
  });

  it("aktuell heißt: die neueste Version ist bekannt und gleich", () => {
    expect(
      updateStatus({ disabled: false, latestVersion: "0.6.0", updateAvailable: false }),
    ).toBe("current");
  });

  it("veraltet, wenn eine höhere Version bekannt ist", () => {
    expect(
      updateStatus({ disabled: false, latestVersion: "0.6.0", updateAvailable: true }),
    ).toBe("outdated");
  });
});
