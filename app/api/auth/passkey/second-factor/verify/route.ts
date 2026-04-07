/**
 * POST /api/auth/passkey/second-factor/verify
 *
 * Completes the second-factor passkey challenge for an already-authenticated
 * session. Verifies the assertion against the user's stored credentials and,
 * on success, marks the current session row's `second_factor_verified_at`
 * so the (app) layout gate lets the user through.
 *
 * Auth: session cookie required
 * Body: { response: AuthenticationResponseJSON }
 * Returns: 200 { success: true }
 *          400 invalid body
 *          401 unauthenticated
 *          410 challenge cookie missing/expired
 *          422 assertion failed or credential belongs to a different user
 *          429 rate limited
 */

import { auth } from "@/lib/auth";
import {
  verifyLogin,
  verifyChallengeToken,
  CHALLENGE_COOKIE_NAME,
} from "@/lib/webauthn";
import {
  markSessionSecondFactorVerified,
  readSessionTokenFromCookieStore,
} from "@/lib/totp";
import { AuthenticationVerifyInputSchema } from "@/lib/validators/passkey";
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
    `passkey:sf-verify:${session.user.id}`,
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
  const parsed = AuthenticationVerifyInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(CHALLENGE_COOKIE_NAME)?.value;
  if (!tokenCookie) {
    return NextResponse.json(
      { error: "Challenge expired", code: "CHALLENGE_EXPIRED" },
      { status: 410 }
    );
  }
  const expectedChallenge = verifyChallengeToken(
    tokenCookie,
    "sf",
    session.user.id
  );
  if (!expectedChallenge) {
    return NextResponse.json(
      { error: "Challenge expired", code: "CHALLENGE_EXPIRED" },
      { status: 410 }
    );
  }

  const verified = await verifyLogin(parsed.data.response, expectedChallenge);
  if (!verified || verified.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Assertion failed", code: "ASSERTION_FAILED" },
      { status: 422 }
    );
  }

  const sessionToken = readSessionTokenFromCookieStore(cookieStore);
  if (!sessionToken) {
    return NextResponse.json(
      { error: "Session cookie not found", code: "SESSION_NOT_FOUND" },
      { status: 500 }
    );
  }
  await markSessionSecondFactorVerified(sessionToken);

  const res = NextResponse.json({ success: true });
  res.cookies.delete(CHALLENGE_COOKIE_NAME);
  return res;
}
