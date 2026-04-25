/**
 * GET /api/push/devices
 * Lists all registered web push devices for the current user.
 * Does NOT return the raw subscription keys — only metadata.
 *
 * Requires: authentication
 * Returns: { devices: Array<{ id, name, enabled, createdAt, endpoint }> }
 * Note: endpoint is included so the client can identify "this device".
 */

import { resolveApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const devices = await db
      .select({
        id: pushSubscriptions.id,
        name: pushSubscriptions.name,
        enabled: pushSubscriptions.enabled,
        createdAt: pushSubscriptions.createdAt,
        endpoint: pushSubscriptions.endpoint,
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.userId))
      .orderBy(desc(pushSubscriptions.createdAt));

    return NextResponse.json({ devices });
  } catch (err) {
    console.error("[GET /api/push/devices]", err);
    return NextResponse.json({ error: "Failed to load devices" }, { status: 500 });
  }
}
