/**
 * POST /api/auth/passkey/register/verify
 *
 * Completes a Passkey registration. Reads the stashed challenge from the
 * signed cookie, verifies the browser's attestation response, and persists
 * the credential in the `authenticators` table. On success the challenge
 * cookie is cleared.
 *
 * Auth: session cookie required
 * Body: { name?: string | null, response: RegistrationResponseJSON }
 * Returns: 200 { credentialID, name, deviceType, backedUp }
 *          400 invalid body
 *          401 unauthenticated
 *          410 challenge cookie missing/expired — start over
 *          422 attestation failed
 *          429 rate limited
 */

import { auth } from "@/lib/auth";
import {
  verifyRegistration,
  verifyChallengeToken,
  CHALLENGE_COOKIE_NAME,
} from "@/lib/webauthn";
import { RegistrationVerifyInputSchema } from "@/lib/validators/passkey";
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
    `passkey:register-verify:${session.user.id}`,
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
  const parsed = RegistrationVerifyInputSchema.safeParse(body);
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
      { error: "Registration expired — please start over", code: "CHALLENGE_EXPIRED" },
      { status: 410 }
    );
  }
  const expectedChallenge = verifyChallengeToken(
    tokenCookie,
    "reg",
    session.user.id
  );
  if (!expectedChallenge) {
    return NextResponse.json(
      { error: "Registration expired — please start over", code: "CHALLENGE_EXPIRED" },
      { status: 410 }
    );
  }

  try {
    const verification = await verifyRegistration(
      session.user.id,
      parsed.data.name ?? null,
      parsed.data.response,
      expectedChallenge
    );
    const info = verification.registrationInfo!;
    const res = NextResponse.json({
      credentialID: info.credential.id,
      name: parsed.data.name ?? null,
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
    });
    res.cookies.delete(CHALLENGE_COOKIE_NAME);
    return res;
  } catch (err) {
    console.error("[POST /api/auth/passkey/register/verify]", err);
    return NextResponse.json(
      { error: "Registration verification failed", code: "REGISTRATION_FAILED" },
      { status: 422 }
    );
  }
}
