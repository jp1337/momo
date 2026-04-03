/**
 * GET /api/user/export
 * Exports all personal data for the authenticated user as a JSON file download.
 *
 * Auth:       Required
 * Body:       none
 * Rate limit: 5 per hour
 * Returns:    JSON attachment — momo-export-YYYY-MM-DD.json
 *
 * Implements DSGVO Art. 15 (right of access) and Art. 20 (data portability).
 * The exported bundle includes: profile, topics, tasks, task completions,
 * wishlist items, and earned achievements.
 *
 * Excluded from export: OAuth tokens, session tokens, push subscription
 * objects (internal/sensitive, not portable personal data).
 */

import { resolveApiUser } from "@/lib/api-auth";
import { exportUserData } from "@/lib/export";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { limited, resetAt } = checkRateLimit(
    `export-data:${user.userId}`,
    5,
    60 * 60 * 1_000 // 1 hour
  );
  if (limited) {
    return rateLimitResponse(resetAt);
  }

  try {
    const data = await exportUserData(user.userId);
    const filename = `momo-export-${new Date().toISOString().slice(0, 10)}.json`;

    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/user/export]", error);
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}
