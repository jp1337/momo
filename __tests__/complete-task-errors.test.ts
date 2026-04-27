/**
 * Error-path tests for lib/tasks.ts → completeTask().
 *
 * Covers fire-and-forget .catch() callbacks that are only reachable when
 * dynamic imports or specific DB operations fail. A separate file is needed
 * because the mocks here (webhooks, push, gamification) would break the
 * golden-path tests in complete-task.test.ts.
 *
 * Lines covered:
 *   572 — updateStreak rejects (catch block)
 *   580 — sendStreakShieldNotification rejects (fire-and-forget)
 *   592 — updateQuestStreak rejects (catch block)
 *   688 — checkAndUnlockAchievements rejects (catch block)
 *   706 — achievement coin booking DB update fails
 *   714 — sendAchievementNotifications rejects
 *   722 — fireWebhookEvent rejects
 */

import { vi, describe, it, expect } from "vitest";

// ── Module mocks ──────────────────────────────────────────────────────────────

// fireWebhookEvent always rejects → covers line 722
vi.mock("@/lib/webhooks", () => ({
  fireWebhookEvent: vi.fn().mockRejectedValue(new Error("webhook fire failed")),
}));

// sendAchievementNotifications always rejects → covers line 714
// sendStreakShieldNotification starts as resolving; individual tests can use
// mockRejectedValueOnce to cover the shield notification catch (line 580).
vi.mock("@/lib/push", () => ({
  sendAchievementNotifications: vi.fn().mockRejectedValue(new Error("push failed")),
  sendStreakShieldNotification: vi.fn().mockResolvedValue(undefined),
}));

// Mock updateStreak so it does NOT call db.update, leaving the first db.update
// call inside completeTask as the achievement coin booking (line 698-704).
// checkAndUnlockAchievements is wrapped with vi.fn(pass-through) so individual
// tests can use mockRejectedValueOnce to trigger the catch block at line 688.
vi.mock("@/lib/gamification", async (orig) => {
  const actual = await orig<typeof import("@/lib/gamification")>();
  return {
    ...actual,
    updateStreak: vi.fn().mockResolvedValue({
      streakCurrent: 0,
      streakMax: 0,
      shieldUsed: false,
    }),
    updateQuestStreak: vi.fn(actual.updateQuestStreak),
    checkAndUnlockAchievements: vi.fn(actual.checkAndUnlockAchievements),
  };
});

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { completeTask } from "@/lib/tasks";
import { db } from "@/lib/db";
import { checkAndUnlockAchievements, updateStreak, updateQuestStreak } from "@/lib/gamification";
import { sendStreakShieldNotification } from "@/lib/push";
import { createTestUser, createTestTask } from "./helpers/fixtures";
import { getLocalDateString } from "@/lib/date-utils";

const TZ = "Europe/Berlin";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("completeTask — fire-and-forget error paths", () => {
  it("swallows webhook fire errors without throwing (covers line 722)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { type: "ONE_TIME" });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await completeTask(task.id, user.id, TZ);
    // Give the dynamic import + fire-and-forget time to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(result.task).toBeDefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[completeTask] webhook failed (non-fatal):",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("swallows achievement notification errors without throwing (covers line 714)", async () => {
    const user = await createTestUser({ timezone: TZ });
    // Completing the first task unlocks "first_task" → unlockedAchievements.length > 0
    const task = await createTestTask(user.id, { type: "ONE_TIME" });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await completeTask(task.id, user.id, TZ);
    await new Promise((r) => setTimeout(r, 50));

    expect(result.task).toBeDefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[completeTask] achievement notification failed (non-fatal):",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("swallows achievement coin booking DB errors (covers line 706)", async () => {
    const user = await createTestUser({ timezone: TZ });
    // Completing first task unlocks first_task (10 coins) → achievementCoinsEarned > 0
    const task = await createTestTask(user.id, { type: "ONE_TIME" });

    // With updateStreak mocked (no db.update call from it), the FIRST db.update
    // call in completeTask is the achievement coin booking at lines 698-704.
    const updateSpy = vi
      .spyOn(db, "update")
      .mockRejectedValueOnce(new Error("DB update for achievement coins failed") as never);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await completeTask(task.id, user.id, TZ);
    await new Promise((r) => setTimeout(r, 50));

    expect(result.task).toBeDefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[completeTask] achievement coin booking failed (non-fatal):",
      expect.any(Error)
    );

    updateSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("swallows checkAndUnlockAchievements errors without throwing (covers line 688)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { type: "ONE_TIME" });

    vi.mocked(checkAndUnlockAchievements).mockRejectedValueOnce(
      new Error("achievement check DB error")
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await completeTask(task.id, user.id, TZ);
    await new Promise((r) => setTimeout(r, 50));

    expect(result.task).toBeDefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[completeTask] achievement check failed (non-fatal):",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("swallows updateStreak errors without throwing (covers line 572)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { type: "ONE_TIME" });

    vi.mocked(updateStreak).mockRejectedValueOnce(new Error("streak DB error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await completeTask(task.id, user.id, TZ);
    await new Promise((r) => setTimeout(r, 50));

    expect(result.task).toBeDefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[completeTask] streak update failed (non-fatal):",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("swallows shield notification errors without throwing (covers line 580)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { type: "ONE_TIME" });

    // Make updateStreak report that a shield was used → triggers the shield notification
    vi.mocked(updateStreak).mockResolvedValueOnce({
      streakCurrent: 3,
      streakMax: 3,
      shieldUsed: true,
    });
    // Make the shield notification reject so the catch block fires
    vi.mocked(sendStreakShieldNotification).mockRejectedValueOnce(
      new Error("push send failed")
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await completeTask(task.id, user.id, TZ);
    await new Promise((r) => setTimeout(r, 50));

    expect(result.task).toBeDefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[completeTask] shield notification failed (non-fatal):",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("swallows updateQuestStreak errors without throwing (covers line 592)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    // isDailyQuest: true + dailyQuestDate: today → triggers the updateQuestStreak call
    const task = await createTestTask(user.id, {
      type: "ONE_TIME",
      isDailyQuest: true,
      dailyQuestDate: today,
    });

    vi.mocked(updateQuestStreak).mockRejectedValueOnce(new Error("quest streak DB error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await completeTask(task.id, user.id, TZ);
    await new Promise((r) => setTimeout(r, 50));

    expect(result.task).toBeDefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[completeTask] quest streak update failed (non-fatal):",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
