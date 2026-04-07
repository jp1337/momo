/**
 * POST /api/auth/2fa/verify-setup
 *
 * Completes the TOTP setup wizard. Reads the pending plaintext secret from
 * the signed setup cookie, verifies the user-supplied code, and atomically:
 *   1. Encrypts and persists the secret on the users row
 *   2. Marks `users.totp_enabled_at`
 *   3. Generates 10 backup codes
 *   4. Marks the current session as totp-verified (so the user is not
 *      immediately bounced to /login/2fa right after activating)
 *
 * The plaintext backup codes are returned in the response **exactly once**.
 *
 * Auth: session cookie required (NOT API keys).
 * Body: { code: string (6 digits) }
 * Returns: 200 { backupCodes: string[] }
 *          400 invalid body
 *          401 unauthenticated
 *          410 setup cookie missing or expired (start over)
 *          422 wrong code
 *          429 rate limited
 */

import { auth } from "@/lib/auth";
import {
  enableTotpForUser,
  verifyTotpCode,
  verifySetupToken,
  markSessionSecondFactorVerified,
  readSessionTokenFromCookieStore,
  SETUP_COOKIE_NAME,
} from "@/lib/totp";
import { TotpCodeSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
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

  const rl = checkRateLimit(
    `totp:verify-setup:${session.user.id}`,
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

  const cookieStore = await cookies();
  const setupCookie = cookieStore.get(SETUP_COOKIE_NAME)?.value;
  if (!setupCookie) {
    return NextResponse.json(
      {
        error: "Setup token missing or expired — please start over",
        code: "SETUP_EXPIRED",
      },
      { status: 410 }
    );
  }
  const plainSecret = verifySetupToken(setupCookie, session.user.id);
  if (!plainSecret) {
    return NextResponse.json(
      {
        error: "Setup token invalid or expired — please start over",
        code: "SETUP_EXPIRED",
      },
      { status: 410 }
    );
  }

  // Pre-check (gives a 422 instead of throwing inside enableTotpForUser).
  const ok = await verifyTotpCode(plainSecret, parsed.data.code);
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid code", code: "INVALID_CODE" },
      { status: 422 }
    );
  }

  let result: { codes: string[] };
  try {
    result = await enableTotpForUser(
      session.user.id,
      plainSecret,
      parsed.data.code
    );
  } catch (err) {
    console.error("[POST /api/auth/2fa/verify-setup]", err);
    return NextResponse.json(
      { error: "Failed to enable 2FA" },
      { status: 500 }
    );
  }

  // Activate-in-place: mark the current session as already 2FA-verified so
  // the user can keep browsing without an immediate bounce to /login/2fa.
  const sessionToken = readSessionTokenFromCookieStore(cookieStore);
  if (sessionToken) {
    await markSessionSecondFactorVerified(sessionToken);
  }

  const res = NextResponse.json({ backupCodes: result.codes });
  res.cookies.delete(SETUP_COOKIE_NAME);
  return res;
}
