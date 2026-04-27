/**
 * Tests for lib/client/coin-events.ts
 *
 * The module is normally browser-only (guards on typeof window). Tests that
 * need to cover the dispatch path use vi.stubGlobal("window", ...) to simulate
 * a browser-like environment without requiring jsdom.
 */

import { vi, describe, it, expect, afterEach } from "vitest";
import { COINS_EARNED_EVENT, dispatchCoinsEarned } from "@/lib/client/coin-events";

describe("coin-events", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Constant ─────────────────────────────────────────────────────────────────

  it("COINS_EARNED_EVENT is 'coinsEarned'", () => {
    expect(COINS_EARNED_EVENT).toBe("coinsEarned");
  });

  // ── SSR guard (Node.js: window is undefined) ──────────────────────────────

  it("dispatchCoinsEarned is a no-op in SSR (window is undefined)", () => {
    // Default Node.js environment: typeof window === "undefined"
    expect(() => dispatchCoinsEarned(10)).not.toThrow();
  });

  // ── Validity guards (require window to be defined) ────────────────────────

  it("dispatchCoinsEarned skips NaN deltas", () => {
    const dispatch = vi.fn();
    vi.stubGlobal("window", { dispatchEvent: dispatch });
    dispatchCoinsEarned(NaN);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatchCoinsEarned skips Infinity deltas", () => {
    const dispatch = vi.fn();
    vi.stubGlobal("window", { dispatchEvent: dispatch });
    dispatchCoinsEarned(Infinity);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatchCoinsEarned skips -Infinity deltas", () => {
    const dispatch = vi.fn();
    vi.stubGlobal("window", { dispatchEvent: dispatch });
    dispatchCoinsEarned(-Infinity);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatchCoinsEarned skips delta = 0", () => {
    const dispatch = vi.fn();
    vi.stubGlobal("window", { dispatchEvent: dispatch });
    dispatchCoinsEarned(0);
    expect(dispatch).not.toHaveBeenCalled();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it("dispatches a CustomEvent with the correct type and delta for a positive value", () => {
    const dispatch = vi.fn();
    vi.stubGlobal("window", { dispatchEvent: dispatch });
    dispatchCoinsEarned(25);
    expect(dispatch).toHaveBeenCalledOnce();
    const event = dispatch.mock.calls[0][0] as CustomEvent<{ delta: number }>;
    expect(event.type).toBe(COINS_EARNED_EVENT);
    expect(event.detail.delta).toBe(25);
  });

  it("dispatches a CustomEvent with a negative delta (coin refund)", () => {
    const dispatch = vi.fn();
    vi.stubGlobal("window", { dispatchEvent: dispatch });
    dispatchCoinsEarned(-10);
    expect(dispatch).toHaveBeenCalledOnce();
    const event = dispatch.mock.calls[0][0] as CustomEvent<{ delta: number }>;
    expect(event.detail.delta).toBe(-10);
  });
});
