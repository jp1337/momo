/**
 * Unit tests for lib/update-checker.ts
 *
 * Uses dynamic imports to reset module-level cache between tests.
 * Mocks global.fetch and the DISABLE_UPDATE_CHECK env variable.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock next/headers to prevent import-time side effects
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a fake GitHub releases API response. */
function ghResponse(tagName: string, htmlUrl = "https://github.com/jp1337/momo/releases/latest"): Response {
  return new Response(
    JSON.stringify({ tag_name: tagName, html_url: htmlUrl }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// ─── isUpdateAvailable (pure function — no cache, no network) ─────────────────

describe("isUpdateAvailable", () => {
  it("returns true when latest > current (patch)", async () => {
    const { isUpdateAvailable } = await import("@/lib/update-checker");
    expect(isUpdateAvailable("1.0.0", "1.0.1")).toBe(true);
  });

  it("returns true when latest > current (minor)", async () => {
    const { isUpdateAvailable } = await import("@/lib/update-checker");
    expect(isUpdateAvailable("1.0.0", "1.1.0")).toBe(true);
  });

  it("returns true when latest > current (major)", async () => {
    const { isUpdateAvailable } = await import("@/lib/update-checker");
    expect(isUpdateAvailable("1.0.0", "2.0.0")).toBe(true);
  });

  it("returns false when latest == current", async () => {
    const { isUpdateAvailable } = await import("@/lib/update-checker");
    expect(isUpdateAvailable("1.2.3", "1.2.3")).toBe(false);
  });

  it("returns false when latest < current (downgrade)", async () => {
    const { isUpdateAvailable } = await import("@/lib/update-checker");
    expect(isUpdateAvailable("2.0.0", "1.9.9")).toBe(false);
  });

  it("strips leading v prefix from tag names", async () => {
    const { isUpdateAvailable } = await import("@/lib/update-checker");
    expect(isUpdateAvailable("1.0.0", "v1.0.1")).toBe(true);
    expect(isUpdateAvailable("v1.0.0", "1.0.0")).toBe(false);
  });
});

// ─── CURRENT_VERSION ─────────────────────────────────────────────────────────

describe("CURRENT_VERSION", () => {
  it("is a non-empty string from package.json", async () => {
    const { CURRENT_VERSION } = await import("@/lib/update-checker");
    expect(typeof CURRENT_VERSION).toBe("string");
    expect(CURRENT_VERSION.length).toBeGreaterThan(0);
    // Should look like a semver (x.y.z)
    expect(CURRENT_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});

// ─── checkForUpdates — needs fresh module per test for clean cache ─────────────

describe("checkForUpdates", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch");
    vi.resetModules();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("returns updateAvailable=true when GitHub reports a higher version", async () => {
    fetchSpy.mockResolvedValueOnce(ghResponse("v99.0.0"));
    const { checkForUpdates } = await import("@/lib/update-checker");
    const result = await checkForUpdates();
    expect(result.updateAvailable).toBe(true);
    expect(result.latestVersion).toBe("99.0.0");
    expect(result.disabled).toBe(false);
    expect(result.error).toBeUndefined();
    expect(result.releaseUrl).toContain("github.com");
  });

  it("returns updateAvailable=false when running the latest version", async () => {
    const { CURRENT_VERSION } = await import("@/lib/update-checker");
    fetchSpy.mockResolvedValueOnce(ghResponse(`v${CURRENT_VERSION}`));
    vi.resetModules();
    const { checkForUpdates } = await import("@/lib/update-checker");
    const result = await checkForUpdates();
    expect(result.updateAvailable).toBe(false);
    expect(result.disabled).toBe(false);
  });

  it("returns error and updateAvailable=false when fetch fails", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network timeout"));
    const { checkForUpdates } = await import("@/lib/update-checker");
    const result = await checkForUpdates();
    expect(result.updateAvailable).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("Network timeout");
    expect(result.latestVersion).toBeNull();
    expect(result.disabled).toBe(false);
  });

  it("returns error and updateAvailable=false when GitHub API returns non-200", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );
    const { checkForUpdates } = await import("@/lib/update-checker");
    const result = await checkForUpdates();
    expect(result.updateAvailable).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("404");
  });

  it("caches the result — fetch is only called once for two consecutive calls", async () => {
    fetchSpy.mockResolvedValue(ghResponse("v99.0.0"));
    const { checkForUpdates } = await import("@/lib/update-checker");
    await checkForUpdates();
    await checkForUpdates();
    // fetch must have been called exactly once (second call hits cache)
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("includes currentVersion matching CURRENT_VERSION in the result", async () => {
    fetchSpy.mockResolvedValueOnce(ghResponse("v1.0.0"));
    const { checkForUpdates, CURRENT_VERSION } = await import("@/lib/update-checker");
    const result = await checkForUpdates();
    expect(result.currentVersion).toBe(CURRENT_VERSION);
  });

  it("includes checkedAt as a Date when check succeeds", async () => {
    fetchSpy.mockResolvedValueOnce(ghResponse("v99.0.0"));
    const { checkForUpdates } = await import("@/lib/update-checker");
    const result = await checkForUpdates();
    expect(result.checkedAt).toBeInstanceOf(Date);
  });

  it("returns checkedAt=null when check fails", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Offline"));
    const { checkForUpdates } = await import("@/lib/update-checker");
    const result = await checkForUpdates();
    expect(result.checkedAt).toBeNull();
  });
});

// ─── DISABLE_UPDATE_CHECK ────────────────────────────────────────────────────

describe("checkForUpdates with DISABLE_UPDATE_CHECK", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch");
    vi.resetModules();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.DISABLE_UPDATE_CHECK;
  });

  it("returns disabled=true and never calls fetch when DISABLE_UPDATE_CHECK=true", async () => {
    process.env.DISABLE_UPDATE_CHECK = "true";
    // Re-import so the env schema re-parses the env var
    vi.resetModules();
    const { checkForUpdates } = await import("@/lib/update-checker");
    const result = await checkForUpdates();
    expect(result.disabled).toBe(true);
    expect(result.updateAvailable).toBe(false);
    expect(result.latestVersion).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("checkForUpdates: eine Cache-Schicht, kein zweiter Boden", () => {
  // Module cache from the previous describe block (DISABLE_UPDATE_CHECK) would
  // otherwise leak into these tests via Vitest's dynamic import() cache — the
  // last test there imports the module with DISABLE_UPDATE_CHECK=true baked
  // into its closure, and only resets process.env, not the module registry.
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fragt GitHub ohne Next-Data-Cache — sonst ist die Antwort einen Besuch alt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v9.9.9", html_url: "https://example.test" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { checkForUpdates } = await import("@/lib/update-checker");
    await checkForUpdates();
    const init = fetchMock.mock.calls[0][1] as RequestInit & {
      next?: { revalidate?: number };
    };
    // Der Fehler, den das verhindert: Modul-Cache (24 h) ÜBER
    // Next-Data-Cache (24 h). Läuft der Modul-Cache ab, liefert der
    // Data-Cache nach Stale-while-revalidate den ALTEN Wert, der dann mit
    // frischem checkedAt für weitere 24 h festgehalten wird.
    expect(init.next?.revalidate).toBeUndefined();
    expect(init.cache).toBe("no-store");
  });

  it("checkedAt stammt aus dem erfolgreichen Abruf, nicht aus dem Aufruf", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v9.9.9", html_url: "https://example.test" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { checkForUpdates } = await import("@/lib/update-checker");
    const first = await checkForUpdates();
    const second = await checkForUpdates(); // aus dem Cache
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Der zweite Aufruf zeigt den Zeitpunkt des Abrufs, nicht "jetzt".
    expect(second.checkedAt?.getTime()).toBe(first.checkedAt?.getTime());
  });
});

// ─── Cache-TTL — der Modul-Cache ist jetzt die einzige Schicht, also muss
// seine Frist selbst getestet sein ────────────────────────────────────────

describe("checkForUpdates: Cache-TTL-Grenzen", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    fetchSpy = vi.spyOn(global, "fetch");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    fetchSpy.mockRestore();
  });

  it("fragt nach 24 h erneut ab, statt den Cache weiter zu bedienen", async () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    fetchSpy.mockResolvedValue(ghResponse("v9.9.9"));
    const { checkForUpdates } = await import("@/lib/update-checker");

    await checkForUpdates();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Genau an der 24h-Grenze: cache.cachedAt liegt jetzt exakt CACHE_TTL_MS
    // zurück, `< CACHE_TTL_MS` ist falsch, der Cache gilt als abgelaufen.
    vi.setSystemTime(new Date("2026-01-02T00:00:01.000Z"));
    await checkForUpdates();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("wiederholt nach einem Fehler innerhalb von ~5 Minuten, nicht erst nach 24 h", async () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    fetchSpy.mockRejectedValueOnce(new Error("Network timeout"));
    const { checkForUpdates } = await import("@/lib/update-checker");

    const first = await checkForUpdates();
    expect(first.error).toBeDefined();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // lib/update-checker.ts:177 backdatiert cachedAt beim Fehlerfall um
    // (CACHE_TTL_MS - 5 min), sodass nur noch ~5 Minuten der 24h-Frist
    // übrig bleiben. 6 Minuten später muss der erneute Versuch schon
    // laufen — bei der vollen 24h-Frist würde er das nicht.
    fetchSpy.mockResolvedValueOnce(ghResponse("v9.9.9"));
    vi.setSystemTime(new Date("2026-01-01T00:06:00.000Z"));
    const second = await checkForUpdates();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(second.error).toBeUndefined();
    expect(second.latestVersion).toBe("9.9.9");
  });
});
