/**
 * Layout for the forced /setup/2fa route. Lives outside the (app) route
 * group on purpose: the (app) layout enforces the REQUIRE_2FA hard-lock,
 * which would redirect users back here in an infinite loop.
 *
 * This layout still requires an authenticated session — there is no point
 * showing the setup wizard to a logged-out visitor — but it deliberately
 * does NOT call userHasSecondFactor() or check totp_verified_at.
 *
 * Renders a centered, distraction-free shell so the user focuses on the
 * one-time setup task.
 */

export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ForcedSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {children}
    </div>
  );
}
