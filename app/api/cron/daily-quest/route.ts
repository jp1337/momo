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

/**
 * Module-level idempotency guard.
 * Prevents duplicate notifications if the cron fires more than once per minute.
 * Key format: "YYYY-MM-DDTHH:MM" (UTC). Resets on pod restart — acceptable for
 * notifications (at-most-once per instance; for strict cross-replica dedup
 * use a DB lock or Redis).
 */
let lastRunMinute: string | null = null;

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

  // Idempotency guard — skip if already ran this UTC minute
  const now = new Date();
  const currentMinute = now.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
  if (lastRunMinute === currentMinute) {
    return NextResponse.json({ message: "Already ran this minute", skipped: true });
  }
  lastRunMinute = currentMinute;

  try {
    const result = await sendDailyQuestNotifications();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/cron/daily-quest]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
