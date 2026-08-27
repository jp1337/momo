/**
 * GET /api/health
 * Health check endpoint used by Docker, Kubernetes liveness/readiness probes,
 * and load balancers to determine if the application is running.
 * Requires: no authentication
 * Returns: { status: "ok", version: string, commit: string|null, timestamp: string, cron: { lastRunAt: string|null, minutesSinceLastRun: number|null } }
 * On DB failure: { status: "error", message: string, version: string, commit: string|null }, HTTP 503
 *
 * The `cron` field is informational only — it never affects the HTTP status code.
 * Infrastructure probes must not rely on it.
 *
 * `version` ist die Version des laufenden Images (aus package.json). Sie
 * steht hier, weil ein stehengebliebener Rollout sonst unsichtbar ist: die
 * einzige Stelle, die eine Version zeigte, lag hinter Admin-Login, und
 * genau dort stand am 2026-08-22 "Momo ist aktuell" über einer Instanz,
 * die drei Monate alt war. Eine Version ist kein Geheimnis — sie steht in
 * jedem veröffentlichten Image-Tag.
 *
 * `commit` ist der Git-Commit-SHA, aus dem das laufende Image gebaut wurde
 * (Build-Arg MOMO_COMMIT, siehe Dockerfile runner-Stufe). Anders als
 * `version` ändert er sich bei JEDEM Commit — deshalb liest die
 * Rollout-Prüfung in `.github/workflows/build-and-publish.yml` diesen
 * Wert und nicht `version`: ein Vergleich gegen `version` wäre bei einem
 * gewöhnlichen Push auf main sofort grün, weil kein Workflow die Version
 * automatisch bumpt. Außerhalb eines gebauten Images (lokale Entwicklung)
 * ist `commit` `null` — das ist ehrlich, kein Fehler.
 *
 * Beide Felder stehen auch in der 503-Antwort: eine kaputte Datenbank
 * braucht keins von beiden, und ohne sie liest die Rollout-Prüfung bei
 * einem DB-Ausfall 30 Versuche lang "?" und meldet danach fälschlich
 * "Watchtower hat den Container nicht getauscht", obwohl der neue
 * Container läuft und nur die Datenbank down ist.
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { cronRuns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { CURRENT_VERSION } from "@/lib/update-checker";

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
      version: CURRENT_VERSION,
      commit: process.env.MOMO_COMMIT ?? null,
      timestamp: new Date().toISOString(),
      cron: cronInfo,
    });
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Database unavailable",
        version: CURRENT_VERSION,
        commit: process.env.MOMO_COMMIT ?? null,
      },
      { status: 503 }
    );
  }
}
