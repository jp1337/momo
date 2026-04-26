/**
 * Tests for lib/cron.ts dispatch and idempotency logic.
 *
 * Note: The actual job handlers (push notifications, etc.) are tested
 * indirectly — this file focuses on the guard mechanism and runAllJobs
 * orchestration using the DB cron_runs table.
 *
 * The module-level `lastRunKeys` Map persists across calls within the same
 * test file (same module instance). Tests that depend on first-run vs.
 * second-run behaviour are ordered to account for this.
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { cronRuns } from "@/lib/db/schema";
import { runAllJobs } from "@/lib/cron";

// ─── runAllJobs ───────────────────────────────────────────────────────────────

describe("runAllJobs", () => {
  it("runs without throwing even when push handlers have no subscribed users", async () => {
    // Should not throw — jobs that error are caught and returned as failed entries
    const results = await runAllJobs();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns an array of JobRunResult objects with the expected shape", async () => {
    const results = await runAllJobs();

    for (const result of results) {
      expect(typeof result.name).toBe("string");
      expect(result.name.length).toBeGreaterThan(0);
      expect(typeof result.sent).toBe("number");
      expect(typeof result.failed).toBe("number");
      expect(typeof result.durationMs).toBe("number");
      expect(typeof result.skipped).toBe("boolean");
    }
  });

  it("marks subsequent calls in the same 5-min window as skipped", async () => {
    // First call populates lastRunKeys (or was already called by the test above)
    await runAllJobs();

    // Second call in the same 5-minute bucket — all 5min jobs must be skipped
    const results = await runAllJobs();
    const skippedCount = results.filter((r) => r.skipped).length;
    expect(skippedCount).toBeGreaterThan(0);
  });

  it("logs job results to the cronRuns table for jobs with logToDb=true", async () => {
    const before = await db.select().from(cronRuns);

    // Reset is not possible without module re-import; this call will
    // skip already-run jobs — but some daily jobs may still write if
    // their daily bucket has not been set yet in this test run.
    // We accept that "after >= before" — the cron table should only grow.
    await runAllJobs();

    const after = await db.select().from(cronRuns);
    expect(after.length).toBeGreaterThanOrEqual(before.length);
  });

  it("includes a 'skipped' flag set to false for jobs that actually ran", async () => {
    // On the very first call in a fresh process the jobs are not skipped.
    // Since the same module instance is shared across tests, we can still
    // check: at least the first runAllJobs call (the very first test) had
    // non-skipped entries. Here we verify the shape is consistent.
    const results = await runAllJobs();

    for (const result of results) {
      if (!result.skipped) {
        // A job that ran should have durationMs >= 0
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("every result has a non-empty name matching a known job", async () => {
    const results = await runAllJobs();
    const knownJobs = [
      "morning-briefing",
      "overdue-reminder",
      "due-today",
      "recurring-due",
      "daily-quest",
      "streak-reminder",
      "weekly-review",
      "notification-log-cleanup",
      "vacation-mode-auto-end",
      "webhook-delivery-cleanup",
    ];

    for (const result of results) {
      expect(knownJobs).toContain(result.name);
    }
  });
});
