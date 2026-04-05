/**
 * GET /api/health
 * Health check endpoint used by Docker, Kubernetes liveness/readiness probes,
 * and load balancers to determine if the application is running.
 * Requires: no authentication
 * Returns: { status: "ok", timestamp: string, cron: { lastRunAt: string|null, minutesSinceLastRun: number|null } }
 *
 * The `cron` field is informational only — it never affects the HTTP status code.
 * Infrastructure probes must not rely on it.
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { cronRuns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/health
 * Returns 200 if the app and database are healthy.
 * Returns 503 if the database connection fails.
 * Also returns non-blocking cron status (last run time + minutes since last run).
 */
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);

    // Non-blocking cron info — failure here does not affect the 200 response
    let cronInfo: { lastRunAt: string | null; minutesSinceLastRun: number | null } = {
      lastRunAt: null,
      minutesSinceLastRun: null,
    };
    try {
      const [lastRun] = await db
        .select({ ranAt: cronRuns.ranAt })
        .from(cronRuns)
        .where(eq(cronRuns.name, "daily-quest"))
        .orderBy(desc(cronRuns.ranAt))
        .limit(1);
      if (lastRun) {
        const diffMs = Date.now() - new Date(lastRun.ranAt).getTime();
        cronInfo = {
          lastRunAt: new Date(lastRun.ranAt).toISOString(),
          minutesSinceLastRun: Math.floor(diffMs / 60_000),
        };
      }
    } catch {
      // Intentionally ignored — cron status is informational only
    }

    return Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      cron: cronInfo,
    });
  } catch {
    return Response.json(
      { status: "error", message: "Database unavailable" },
      { status: 503 }
    );
  }
}
