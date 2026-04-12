/**
 * GET /api/user/profile
 * Returns the authenticated user's public profile fields.
 * Requires: authentication
 * Returns: { name: string | null, email: string | null, image: string | null }
 *
 * PATCH /api/user/profile
 * Updates the authenticated user's profile (name, email, profile picture).
 * Requires: authentication
 * Body: { name?: string, email?: string, image?: string | null }
 *   - name: display name (1–100 chars)
 *   - email: valid email address (max 255 chars)
 *   - image: base64 data URL (resized server-side) or null to remove
 * Returns: { user: { name, email, image } } | { error: string }
 */

import { resolveApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateUserProfile } from "@/lib/users";
import { UpdateProfileInputSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET — Fetch the authenticated user's profile.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const apiUser = await resolveApiUser(req);
  if (!apiUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await db
      .select({ name: users.name, email: users.email, image: users.image })
      .from(users)
      .where(eq(users.id, apiUser.userId))
      .limit(1);

    if (!rows[0]) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("[GET /api/user/profile]", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

/**
 * PATCH — Update the authenticated user's profile.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse | Response> {
  const apiUser = await resolveApiUser(req);
  if (!apiUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (apiUser.readonly) return NextResponse.json(
    { error: "Forbidden", message: "This API key is read-only." },
    { status: 403 }
  );

  // Rate limit: 10 requests per minute
  const rl = checkRateLimit(`profile:${apiUser.userId}`, 10, 60_000);
  if (rl.limited) return rateLimitResponse(rl.resetAt);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateProfileInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Ensure at least one field is provided
  if (
    parsed.data.name === undefined &&
    parsed.data.email === undefined &&
    parsed.data.image === undefined
  ) {
    return NextResponse.json(
      { error: "At least one field (name, email, image) must be provided" },
      { status: 422 }
    );
  }

  try {
    const user = await updateUserProfile(apiUser.userId, parsed.data);
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "EMAIL_TAKEN") {
        return NextResponse.json(
          { error: "Email is already in use", code: "EMAIL_TAKEN" },
          { status: 409 }
        );
      }
      if (err.message === "Invalid image format") {
        return NextResponse.json(
          { error: "Invalid image format. Supported: PNG, JPEG, GIF, WebP, BMP", code: "INVALID_IMAGE" },
          { status: 422 }
        );
      }
    }
    console.error("[PATCH /api/user/profile]", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
