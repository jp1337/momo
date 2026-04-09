/**
 * GET /api/settings/notification-history — List recent notification delivery attempts.
 *
 * Returns the last 50 notification log entries for the authenticated user,
 * sorted by most recent first. Used by Settings → Notification History.
 *
 * Requires: authentication (session or API key)
 */

import { resolveApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { notificationLog } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET — List the last 50 notification log entries for the current user.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const entries = await db
      .select({
        id: notificationLog.id,
        channel: notificationLog.channel,
        title: notificationLog.title,
        body: notificationLog.body,
        status: notificationLog.status,
        error: notificationLog.error,
        sentAt: notificationLog.sentAt,
      })
      .from(notificationLog)
      .where(eq(notificationLog.userId, user.userId))
      .orderBy(desc(notificationLog.sentAt))
      .limit(50);

    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[GET /api/settings/notification-history]", err);
    return NextResponse.json({ error: "Failed to load notification history" }, { status: 500 });
  }
}
