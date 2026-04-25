/**
 * PATCH /api/push/devices/[id]
 * Updates a push device — rename or toggle enabled.
 * User can only modify their own devices.
 *
 * Requires: authentication
 * Body: { name?: string; enabled?: boolean }
 * Returns: { success: true }
 *
 * DELETE /api/push/devices/[id]
 * Removes a push device subscription entirely.
 *
 * Requires: authentication
 * Returns: { success: true }
 */

import { resolveApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { users, pushSubscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const patchSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((v) => v.name !== undefined || v.enabled !== undefined, {
    message: "At least one field must be provided",
  });

/**
 * PATCH — Rename or enable/disable a specific push device.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const updated = await db
      .update(pushSubscriptions)
      .set({
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
      })
      .where(
        and(
          eq(pushSubscriptions.id, id),
          eq(pushSubscriptions.userId, user.userId)
        )
      )
      .returning({ id: pushSubscriptions.id });

    if (updated.length === 0) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/push/devices/:id]", err);
    return NextResponse.json({ error: "Failed to update device" }, { status: 500 });
  }
}

/**
 * DELETE — Remove a push device subscription.
 * If this was the last subscription, sets users.notificationEnabled = false.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const deleted = await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.id, id),
          eq(pushSubscriptions.userId, user.userId)
        )
      )
      .returning({ id: pushSubscriptions.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // If no subscriptions remain, clear the notification enabled flag
    const remaining = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.userId))
      .limit(1);

    if (remaining.length === 0) {
      await db
        .update(users)
        .set({ notificationEnabled: false })
        .where(eq(users.id, user.userId));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/push/devices/:id]", err);
    return NextResponse.json({ error: "Failed to remove device" }, { status: 500 });
  }
}
