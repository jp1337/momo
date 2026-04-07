/**
 * POST /api/auth/2fa/verify
 *
 * Login-time second-factor verification. The user has already authenticated
 * via OAuth (so they have a session cookie), but the session row's
 * `totp_verified_at` column is still NULL. This endpoint accepts either a
 * 6-digit TOTP code OR a 10-character backup code, verifies it, and on
 * success marks the session as fully authenticated.
 *
 * Auth: session cookie required (NOT API keys — API keys are exempt from
 *       2FA by design).
 * Body: { code: string } | { backupCode: string }
 * Returns: 200 { success: true, usedBackupCode: boolean }
 *          400 invalid body
 *          401 unauthenticated
 *          409 user has no 2FA configured (nothing to verify)
 *          422 wrong code
 *          429 rate limited
 */

import { auth } from "@/lib/auth";
import {
  verifyUserTotpCode,
  consumeBackupCode,
  markSessionTotpVerified,
  readSessionTokenFromCookieStore,
} from "@/lib/totp";
import { TotpVerifyInputSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const rl = checkRateLimit(`totp:verify:${session.user.id}`, 5, 5 * 60 * 1000);
  if (rl.limited) return rateLimitResponse(rl.resetAt) as unknown as NextResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = TotpVerifyInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Defensive: only run if 2FA is actually configured for this user.
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

  let ok = false;
  let usedBackupCode = false;
  if (parsed.data.code) {
    ok = await verifyUserTotpCode(session.user.id, parsed.data.code);
  } else if (parsed.data.backupCode) {
    ok = await consumeBackupCode(session.user.id, parsed.data.backupCode);
    usedBackupCode = ok;
  }

  if (!ok) {
    return NextResponse.json(
      { error: "Invalid code", code: "INVALID_CODE" },
      { status: 422 }
    );
  }

  const cookieStore = await cookies();
  const sessionToken = readSessionTokenFromCookieStore(cookieStore);
  if (!sessionToken) {
    // Should be unreachable since auth() returned a valid session — but if
    // the cookie name lookup ever drifts, fail loudly rather than silently.
    return NextResponse.json(
      { error: "Session cookie not found", code: "SESSION_NOT_FOUND" },
      { status: 500 }
    );
  }
  await markSessionTotpVerified(sessionToken);

  return NextResponse.json({ success: true, usedBackupCode });
}
