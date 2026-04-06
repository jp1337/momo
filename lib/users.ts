/**
 * User business logic — account management.
 *
 * All foreign keys referencing `users.id` are configured with
 * `onDelete: "cascade"`, so deleting the user row automatically
 * removes all associated tasks, topics, wishlist items, sessions,
 * OAuth accounts, achievements, and task completions.
 */

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import sharp from "sharp";
import type { UpdateProfileInput } from "@/lib/validators";

/**
 * Permanently deletes a user account and all associated data.
 *
 * The cascade is handled entirely by PostgreSQL FK constraints — no
 * manual child-table cleanup is needed. The caller is responsible for
 * signing the user out after this function returns.
 *
 * @param userId - The authenticated user's UUID
 * @throws Error if the user is not found
 */
export async function deleteUser(userId: string): Promise<void> {
  const deleted = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (deleted.length === 0) {
    throw new Error("User not found");
  }
}

/**
 * Processes a base64 data URL image: resizes to max 200×200px and converts to WebP.
 *
 * @param dataUrl - The base64 data URL (e.g. "data:image/png;base64,...")
 * @returns The resized image as a data:image/webp;base64 URL
 * @throws Error if the image format is invalid or processing fails
 */
export async function processProfileImage(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|gif|webp|bmp|svg\+xml);base64,(.+)$/i);
  if (!match) {
    throw new Error("Invalid image format");
  }

  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, "base64");

  const resized = await sharp(buffer)
    .resize(200, 200, { fit: "cover", position: "centre" })
    .webp({ quality: 80 })
    .toBuffer();

  return `data:image/webp;base64,${resized.toString("base64")}`;
}

/**
 * Updates the user's profile (name, email, profile picture).
 *
 * If the email is changed, checks that it's not already taken by another user.
 * If an image data URL is provided, it's processed (resized + converted to WebP).
 *
 * @param userId - The authenticated user's UUID
 * @param data - Partial profile data to update
 * @returns The updated user profile fields
 * @throws Error with descriptive message if email is taken or user not found
 */
export async function updateUserProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<{ name: string | null; email: string | null; image: string | null }> {
  // Check email uniqueness if email is being changed
  if (data.email) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, data.email), ne(users.id, userId)))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("EMAIL_TAKEN");
    }
  }

  // Process image if it's a data URL
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.email !== undefined) updates.email = data.email;

  if (data.image === null) {
    // Explicitly remove profile picture
    updates.image = null;
  } else if (data.image !== undefined && data.image.startsWith("data:")) {
    updates.image = await processProfileImage(data.image);
  }

  if (Object.keys(updates).length === 0) {
    // Nothing to update — return current profile
    const current = await db
      .select({ name: users.name, email: users.email, image: users.image })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (current.length === 0) throw new Error("User not found");
    return current[0];
  }

  const updated = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning({ name: users.name, email: users.email, image: users.image });

  if (updated.length === 0) throw new Error("User not found");
  return updated[0];
}
