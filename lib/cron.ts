/**
 * Unified cron job dispatcher for Momo.
 *
 * Central registry of all periodic jobs. A single endpoint (`POST /api/cron`)
 * calls `runAllJobs()` every 5 minutes. Each job has its own idempotency guard
 * (5-minute bucket or once-per-day) and is executed independently — one failing
 * job does not block others.
 *
 * Adding a new job:
 *  1. Define the handler function in the appropriate lib module
 *  2. Add a `CronJob` entry to the `CRON_JOBS` array below
 *  3. Done — no Docker Compose or endpoint changes needed
 *
 * @module lib/cron
 */

import { db } from "@/lib/db";
import { cronRuns } from "@/lib/db/schema";
import { lt, eq, and } from "drizzle-orm";
import { sendDailyQuestNotifications, sendStreakReminders, sendWeeklyReviewNotifications, sendDueTodayNotifications } from "@/lib/push";

/** Retain cron run history for this many days — older rows are pruned after each run. */
const CRON_RETENTION_DAYS = 30;

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Idempotency guard type:
 *  - "5min-bucket": runs at most once per 5-minute interval (e.g. :00, :05, :10, …)
 *  - "daily": runs at most once per calendar day (UTC)
 */
type GuardType = "5min-bucket" | "daily";

/**
 * Result returned by a cron job handler.
 */
export interface CronJobResult {
  sent: number;
  failed: number;
}

/**
 * A registered cron job.
 */
interface CronJob {
  /** Unique name — stored in the cron_runs DB table */
  name: string;
  /** The async function to execute */
  handler: () => Promise<CronJobResult>;
  /** Idempotency guard type */
  guard: GuardType;
  /** Whether to log results to the cron_runs table */
  logToDb: boolean;
}

/**
 * Result of a single job execution within a dispatch cycle.
 */
export interface JobRunResult {
  name: string;
  sent: number;
  failed: number;
  durationMs: number;
  skipped: boolean;
  error?: string;
}

// ─── Idempotency state ───────────────────────────────────────────────────────

/**
 * Module-level idempotency guards.
 * Map of job name → last run key. Resets on pod restart.
 */
const lastRunKeys = new Map<string, string>();

/**
 * Computes the current idempotency key for a given guard type.
 */
function getGuardKey(guard: GuardType): string {
  const now = new Date();
  if (guard === "daily") {
    return now.toISOString().split("T")[0]; // "YYYY-MM-DD"
  }
  // 5-minute bucket: "YYYY-MM-DDTHH:B" where B is the bucket index (0–11)
  const bucket = Math.floor(now.getUTCMinutes() / 5);
  return `${now.toISOString().slice(0, 14)}${bucket}`;
}

// ─── Job Registry ────────────────────────────────────────────────────────────

/**
 * All registered cron jobs.
 * Add new jobs here — they will be picked up automatically by runAllJobs().
 */
const CRON_JOBS: CronJob[] = [
  {
    // Runs before daily-quest so the "due today" ping arrives first when
    // both match the same 5-minute bucket.
    name: "due-today",
    handler: sendDueTodayNotifications,
    guard: "5min-bucket",
    logToDb: true,
  },
  {
    name: "daily-quest",
    handler: sendDailyQuestNotifications,
    guard: "5min-bucket",
    logToDb: true,
  },
  {
    name: "streak-reminder",
    handler: sendStreakReminders,
    guard: "daily",
    logToDb: false,
  },
  {
    name: "weekly-review",
    handler: sendWeeklyReviewNotifications,
    guard: "5min-bucket",
    logToDb: true,
  },
];

// ─── Dispatcher ──────────────────────────────────────────────────────────────

/**
 * Runs all registered cron jobs.
 *
 * Each job is checked against its idempotency guard before execution.
 * Jobs run sequentially to avoid overwhelming the DB with parallel fan-out queries.
 * Failures are caught per-job — one failing job does not block others.
 *
 * @returns Array of results, one per registered job
 */
export async function runAllJobs(): Promise<JobRunResult[]> {
  const results: JobRunResult[] = [];

  for (const job of CRON_JOBS) {
    const guardKey = getGuardKey(job.guard);
    const lastKey = lastRunKeys.get(job.name);

    // Idempotency check
    if (lastKey === guardKey) {
      results.push({
        name: job.name,
        sent: 0,
        failed: 0,
        durationMs: 0,
        skipped: true,
      });
      continue;
    }

    // Mark as run before execution (fail-fast idempotency)
    lastRunKeys.set(job.name, guardKey);
    const startedAt = Date.now();

    try {
      const result = await job.handler();
      const durationMs = Date.now() - startedAt;

      // Log to DB if configured
      if (job.logToDb) {
        await db.insert(cronRuns).values({
          name: job.name,
          sent: result.sent,
          failed: result.failed,
          durationMs,
        }).catch(() => { /* non-critical */ });

        // Prune old rows
        const cutoff = new Date(Date.now() - CRON_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        await db.delete(cronRuns)
          .where(and(eq(cronRuns.name, job.name), lt(cronRuns.ranAt, cutoff)))
          .catch(() => { /* non-critical */ });
      }

      results.push({
        name: job.name,
        sent: result.sent,
        failed: result.failed,
        durationMs,
        skipped: false,
      });
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      console.error(`[cron] Job "${job.name}" failed:`, err);

      // Log the failure to DB
      if (job.logToDb) {
        await db.insert(cronRuns).values({
          name: job.name,
          sent: 0,
          failed: 1,
          durationMs,
        }).catch(() => { /* ignore secondary failure */ });
      }

      results.push({
        name: job.name,
        sent: 0,
        failed: 1,
        durationMs,
        skipped: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}
