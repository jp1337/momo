/**
 * GET /api/auth/link-callback?token=<uuid>
 * Handles the OAuth callback for account linking.
 *
 * After the user completes the OAuth flow triggered by /api/auth/link-request,
 * Auth.js redirects here. This route:
 *
 *  1. Reads the linking_request by token → finds the original user
 *  2. Reads the current session → finds the newly created (or existing) user
 *  3. If the new user is freshly created (no tasks/topics/etc.):
 *     - Moves the OAuth account from the new user to the original user
 *     - Deletes the temporary new user (CASCADE handles their sessions)
 *  4. If the new user already has data → returns an error (account in use)
 *  5. Cleans up the linking_request
 *  6. Redirects to /settings?linked=<provider> or /settings?link-error=<reason>
 *
 * Authentication: none required (this is the OAuth callback destination)
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts, linkingRequests, tasks, topics, users } from "@/lib/db/schema";
import { and, eq, gt, count } from "drizzle-orm";
import { redirect } from "next/navigation";

/**
 * GET /api/auth/link-callback
 * Merges the newly linked OAuth account onto the original user.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    redirect("/settings?link-error=missing_token");
  }

  // ── 1. Look up the linking request ────────────────────────────────────────
  const now = new Date();
  const [linkRequest] = await db
    .select({
      id: linkingRequests.id,
      userId: linkingRequests.userId,
      provider: linkingRequests.provider,
      expiresAt: linkingRequests.expiresAt,
    })
    .from(linkingRequests)
    .where(
      and(
        eq(linkingRequests.id, token),
        gt(linkingRequests.expiresAt, now)
      )
    )
    .limit(1);

  if (!linkRequest) {
    redirect("/settings?link-error=expired");
  }

  // ── 2. Get the current session (the user Auth.js just authenticated) ──────
  const session = await auth();
  if (!session?.user?.id) {
    // The OAuth flow didn't result in a session — shouldn't happen, but guard it
    await cleanupLinkRequest(linkRequest.id);
    redirect("/settings?link-error=no_session");
  }

  const currentUserId = session.user.id;
  const originalUserId = linkRequest.userId;

  // ── 3. Check whether this is the same user (nothing to merge) ─────────────
  if (currentUserId === originalUserId) {
    await cleanupLinkRequest(linkRequest.id);
    redirect(`/settings?linked=${linkRequest.provider}`);
  }

  // ── 4. Check that the current user's account isn't already in use ─────────
  // "In use" means: the newly-authed user has existing tasks or topics (real data)
  const [taskCountResult, topicCountResult] = await Promise.all([
    db.select({ c: count() }).from(tasks).where(eq(tasks.userId, currentUserId)),
    db.select({ c: count() }).from(topics).where(eq(topics.userId, currentUserId)),
  ]);

  const hasData =
    (taskCountResult[0]?.c ?? 0) > 0 ||
    (topicCountResult[0]?.c ?? 0) > 0;

  if (hasData) {
    // The OAuth provider account is already actively used by a different user
    await cleanupLinkRequest(linkRequest.id);
    redirect("/settings?link-error=already_used");
  }

  // ── 5. Merge: move OAuth account to originalUser, delete temp user ─────────
  try {
    // Move the OAuth account record to the original user
    await db
      .update(accounts)
      .set({ userId: originalUserId })
      .where(
        and(
          eq(accounts.userId, currentUserId),
          eq(accounts.provider, linkRequest.provider)
        )
      );

    // Delete the temp user — CASCADE will clean up their sessions
    await db.delete(users).where(eq(users.id, currentUserId));
  } catch (err) {
    console.error("[link-callback] merge failed", err);
    await cleanupLinkRequest(linkRequest.id);
    redirect("/settings?link-error=merge_failed");
  }

  // ── 6. Cleanup and redirect ────────────────────────────────────────────────
  await cleanupLinkRequest(linkRequest.id);
  redirect(`/settings?linked=${linkRequest.provider}`);
}

/** Deletes a linking request by ID, ignoring errors. */
async function cleanupLinkRequest(id: string): Promise<void> {
  try {
    await db.delete(linkingRequests).where(eq(linkingRequests.id, id));
  } catch {
    // Best-effort cleanup — don't crash the redirect flow
  }
}
