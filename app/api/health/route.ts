/**
 * GET /api/health
 * Health check endpoint used by Docker, Kubernetes liveness/readiness probes,
 * and load balancers to determine if the application is running.
 * Requires: no authentication
 * Returns: { status: "ok", timestamp: string }
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/health
 * Returns 200 if the app and database are healthy.
 * Returns 503 if the database connection fails.
 * This endpoint is intentionally unauthenticated so that infrastructure
 * probes can check app health without credentials.
 */
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    return Response.json(
      { status: "error", message: "Database unavailable" },
      { status: 503 }
    );
  }
}
