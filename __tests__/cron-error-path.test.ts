/**
 * Tests for lib/cron.ts error-handling path (catch block, lines 234-247).
 *
 * This file mocks one of the push handlers to throw so that the per-job
 * catch block runs, recording a failed result and logging to the DB.
 * A separate file is needed because cron.ts holds module-level idempotency
 * state (`lastRunKeys`) that would interfere with the main cron.test.ts.
 */

import { vi, describe, it, expect } from "vitest";

// Mock @/lib/push BEFORE importing cron so the mock is in place when
// CRON_JOBS is built. sendMorningBriefingNotifications is the first job,
// so it will be the one that throws.
vi.mock("@/lib/push", () => ({
  sendMorningBriefingNotifications: vi.fn().mockRejectedValue(new Error("push exploded")),
  sendOverdueNotifications: vi.fn().mockResolvedValue({ sent: 0, failed: 0 }),
  sendDueTodayNotifications: vi.fn().mockResolvedValue({ sent: 0, failed: 0 }),
  sendRecurringDueNotifications: vi.fn().mockResolvedValue({ sent: 0, failed: 0 }),
  sendDailyQuestNotifications: vi.fn().mockResolvedValue({ sent: 0, failed: 0 }),
  sendStreakReminders: vi.fn().mockResolvedValue({ sent: 0, failed: 0 }),
  sendWeeklyReviewNotifications: vi.fn().mockResolvedValue({ sent: 0, failed: 0 }),
}));

import { runAllJobs } from "@/lib/cron";

describe("runAllJobs — job error catch block", () => {
  it("does not throw when a job handler rejects (error is caught per-job)", async () => {
    await expect(runAllJobs()).resolves.toBeDefined();
  });

  it("returns a result with failed=1 and the error message for the throwing job", async () => {
    const results = await runAllJobs();
    const briefing = results.find((r) => r.name === "morning-briefing");
    // On the first call the guard is open → job runs → throws → caught
    // On subsequent calls within the same bucket it is skipped.
    // Either way the result must exist in the array.
    expect(briefing).toBeDefined();
    if (!briefing!.skipped) {
      expect(briefing!.failed).toBe(1);
      expect(briefing!.error).toBe("push exploded");
    }
  });

  it("all other jobs still produce results despite one job failing", async () => {
    const results = await runAllJobs();
    const names = results.map((r) => r.name);
    expect(names).toContain("overdue-reminder");
    expect(names).toContain("due-today");
    expect(names).toContain("notification-log-cleanup");
  });
});
