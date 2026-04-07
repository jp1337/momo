/**
 * POST /api/auth/2fa/disable
 *
 * Deactivates 2FA for the current user. Requires a valid current TOTP code
 * (or backup code) as a re-authentication step — knowing the OAuth session
 * cookie alone is NOT sufficient. Blocked entirely when REQUIRE_2FA=true,
 * to prevent users from bypassing an admin enforcement policy.
 *
 * Auth: session cookie required (NOT API keys).
 * Body: { code: string } | { backupCode: string }
 * Returns: 200 { success: true }
 *          400 invalid body
 *          401 unauthenticated
 *          403 admin enforcement active (REQUIRE_2FA=true)
 *          409 user has no 2FA configured
 *          422 wrong code
 *          429 rate limited
 */

import { auth } from "@/lib/auth";
import {
  disableTotpForUser,
  verifyUserTotpCode,
  consumeBackupCode,
} from "@/lib/totp";
import { TotpVerifyInputSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { serverEnv } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  if (serverEnv.REQUIRE_2FA) {
    return NextResponse.json(
      {
        error: "2FA is required by the administrator and cannot be disabled",
        code: "TOTP_REQUIRED_BY_ADMIN",
      },
      { status: 403 }
    );
  }

  const rl = checkRateLimit(
    `totp:disable:${session.user.id}`,
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
  const parsed = TotpVerifyInputSchema.safeParse(body);
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

  const ok = parsed.data.code
    ? await verifyUserTotpCode(session.user.id, parsed.data.code)
    : await consumeBackupCode(session.user.id, parsed.data.backupCode!);

  if (!ok) {
    return NextResponse.json(
      { error: "Invalid code", code: "INVALID_CODE" },
      { status: 422 }
    );
  }

  await disableTotpForUser(session.user.id);
  return NextResponse.json({ success: true });
}
