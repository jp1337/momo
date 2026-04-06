/**
 * DELETE /api/settings/notification-channels/:type — Remove a notification channel.
 *
 * Requires: authentication
 * Params: type — channel type identifier (e.g. "ntfy")
 * Returns: { success: true } | { error: string }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { notificationChannels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * DELETE — Remove a notification channel by type.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse() as NextResponse;

  const { type } = await params;

  try {
    const result = await db
      .delete(notificationChannels)
      .where(
        and(
          eq(notificationChannels.userId, user.userId),
          eq(notificationChannels.type, type)
        )
      )
      .returning({ id: notificationChannels.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[DELETE /api/settings/notification-channels/${type}]`, err);
    return NextResponse.json({ error: "Failed to remove channel" }, { status: 500 });
  }
}
