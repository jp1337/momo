/**
 * /api/auth/passkey/[id]
 *
 * PATCH  — rename a registered passkey (body: { name }).
 * DELETE — revoke a passkey (credential row is removed from the DB).
 *
 * `[id]` is the base64url credential ID. The route does not leak existence:
 * if the credential is not owned by the session user the query is a silent
 * no-op and we still return 200, which matches how the TOTP surface hides
 * mismatches.
 *
 * Both operations require a session cookie and silently refuse to remove
 * the last remaining second factor when `REQUIRE_2FA=true` and the user
 * has no TOTP configured.
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authenticators, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { deletePasskey, renamePasskey } from "@/lib/webauthn";
import { RenamePasskeyInputSchema } from "@/lib/validators/passkey";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const rl = checkRateLimit(
    `passkey:patch:${session.user.id}`,
    20,
    5 * 60 * 1000
  );
  if (rl.limited) return rateLimitResponse(rl.resetAt) as unknown as NextResponse;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = RenamePasskeyInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await renamePasskey(session.user.id, id, parsed.data.name);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const rl = checkRateLimit(
    `passkey:delete:${session.user.id}`,
    20,
    5 * 60 * 1000
  );
  if (rl.limited) return rateLimitResponse(rl.resetAt) as unknown as NextResponse;

  const { id } = await ctx.params;

  // If REQUIRE_2FA is active, block removal of the last remaining second
  // factor — symmetric with the TOTP disable route's enforcement.
  if (serverEnv.REQUIRE_2FA) {
    const [remainingPasskeys, userRow] = await Promise.all([
      db
        .select({ id: authenticators.credentialID })
        .from(authenticators)
        .where(eq(authenticators.userId, session.user.id)),
      db
        .select({ totpEnabledAt: users.totpEnabledAt })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1),
    ]);
    const wouldRemoveLast =
      remainingPasskeys.filter((p) => p.id === id).length === 1 &&
      remainingPasskeys.length === 1 &&
      !userRow[0]?.totpEnabledAt;
    if (wouldRemoveLast) {
      return NextResponse.json(
        {
          error:
            "Removing this passkey would leave the account without any second factor, which is forbidden while REQUIRE_2FA is active",
          code: "SECOND_FACTOR_REQUIRED_BY_ADMIN",
        },
        { status: 403 }
      );
    }
  }

  await deletePasskey(session.user.id, id);
  return NextResponse.json({ success: true });
}
