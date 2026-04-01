/**
 * POST /api/cron/streak-reminder
 * Triggers streak reminder push notifications for users who have an active streak
 * but haven't completed a task today.
 * Protected by CRON_SECRET — must include `Authorization: Bearer <CRON_SECRET>` header.
 * NOT protected by session auth (called by an external scheduler, not a browser).
 * Returns: { sent: number, failed: number }
 */

import { sendStreakReminders } from "@/lib/push";
import { serverEnv } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "@/lib/utils/crypto";

/**
 * Module-level idempotency guard.
 * Prevents duplicate notifications if the cron fires more than once per day.
 * Resets on pod restart — acceptable for notifications (at-most-once delivery
 * per instance; for strict deduplication across replicas use a DB or Redis lock).
 */
let lastRunDate: string | null = null;

/**
 * POST — Fan out streak reminder notifications to all users at risk of losing their streak.
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

  // Idempotency guard — skip if already ran today
  const today = new Date().toISOString().split("T")[0];
  if (lastRunDate === today) {
    return NextResponse.json({ message: "Already ran today", skipped: true });
  }
  lastRunDate = today;

  try {
    const result = await sendStreakReminders();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/cron/streak-reminder]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
