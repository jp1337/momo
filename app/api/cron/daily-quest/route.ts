/**
 * POST /api/cron/daily-quest
 * Triggers daily quest push notifications for all eligible users.
 * Protected by CRON_SECRET — must include `Authorization: Bearer <CRON_SECRET>` header.
 * NOT protected by session auth (called by an external scheduler, not a browser).
 * Returns: { sent: number, failed: number }
 */

import { sendDailyQuestNotifications } from "@/lib/push";
import { serverEnv } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "@/lib/utils/crypto";
import { db } from "@/lib/db";
import { cronRuns } from "@/lib/db/schema";

/**
 * Module-level idempotency guard.
 * Prevents duplicate sends if the cron fires more than once in the same 5-minute bucket.
 * Key format: "YYYY-MM-DDTHH:B" where B is the bucket index (0–11). Resets on restart.
 */
let lastRunBucket: string | null = null;

/**
 * POST — Fan out daily quest notifications to all users with active subscriptions.
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

  // Idempotency guard — skip if already ran in the current 5-minute bucket
  const now = new Date();
  const bucket = Math.floor(now.getUTCMinutes() / 5);
  const bucketKey = `${now.toISOString().slice(0, 14)}${bucket}`; // "YYYY-MM-DDTHH:B"
  if (lastRunBucket === bucketKey) {
    return NextResponse.json({ message: "Already ran this bucket", skipped: true });
  }
  lastRunBucket = bucketKey;

  const startedAt = Date.now();
  try {
    const result = await sendDailyQuestNotifications();
    const durationMs = Date.now() - startedAt;

    // Persist run to DB for admin visibility and health endpoint
    await db.insert(cronRuns).values({
      name: "daily-quest",
      sent: result.sent,
      failed: result.failed,
      durationMs,
    });

    return NextResponse.json({ ...result, durationMs });
  } catch (err) {
    console.error("[POST /api/cron/daily-quest]", err);
    // Still log the failed run to DB so the admin can see something went wrong
    await db.insert(cronRuns).values({
      name: "daily-quest",
      sent: 0,
      failed: 1,
      durationMs: Date.now() - startedAt,
    }).catch(() => { /* ignore secondary failure */ });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
