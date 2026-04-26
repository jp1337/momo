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
