/**
 * POST /api/auth/2fa/regenerate-backup-codes
 *
 * Replaces all of the user's existing backup codes (used and unused) with a
 * fresh batch of 10. Requires a valid current TOTP code as re-authentication.
 * The plaintext codes are returned exactly once in the response.
 *
 * Auth: session cookie required (NOT API keys).
 * Body: { code: string }   — backup codes are NOT accepted here, since
 *        regenerating from a backup code would consume one of the codes
 *        being replaced and is unnecessarily confusing.
 * Returns: 200 { backupCodes: string[] }
 *          400 invalid body
 *          401 unauthenticated
 *          409 user has no 2FA configured
 *          422 wrong code
 *          429 rate limited
 */

import { auth } from "@/lib/auth";
import { regenerateBackupCodes, verifyUserTotpCode } from "@/lib/totp";
import { TotpCodeSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const rl = checkRateLimit(
    `totp:regen:${session.user.id}`,
    5,
    5 * 60 * 1000
  );
  if (rl.limited) return rateLimitResponse(rl.resetAt) as unknown as NextResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = TotpCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [row] = await db
    .select({ totpEnabledAt: users.totpEnabledAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!row?.totpEnabledAt) {
    return NextResponse.json(
      { error: "2FA is not enabled", code: "TOTP_NOT_ENABLED" },
      { status: 409 }
    );
  }

  const ok = await verifyUserTotpCode(session.user.id, parsed.data.code);
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid code", code: "INVALID_CODE" },
      { status: 422 }
    );
  }

  const result = await regenerateBackupCodes(session.user.id);
  return NextResponse.json({ backupCodes: result.codes });
}
