/**
 * POST /api/cron
 * Unified cron dispatcher — runs all registered cron jobs in sequence.
 * Protected by CRON_SECRET — must include `Authorization: Bearer <CRON_SECRET>` header.
 * NOT protected by session auth (called by an external scheduler, not a browser).
 *
 * Called every 5 minutes by the Docker cron container. Each job has its own
 * idempotency guard (5-minute bucket or daily) so duplicate calls are harmless.
 *
 * Returns: { jobs: JobRunResult[] }
 */

import { runAllJobs } from "@/lib/cron";
import { serverEnv } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "@/lib/utils/crypto";

/**
 * POST — Dispatch all registered cron jobs.
 * Validates the CRON_SECRET bearer token before processing.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Fail-closed: require CRON_SECRET to be set and match
  const cronSecret = serverEnv.CRON_SECRET;
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!cronSecret || !token || !timingSafeEqual(cronSecret, token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await runAllJobs();
    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("[POST /api/cron]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
