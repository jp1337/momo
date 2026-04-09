/**
 * Layout for the /onboarding route. Lives outside the (app) route group
 * on purpose: the (app) layout checks onboarding_completed and would
 * redirect users back here in an infinite loop.
 *
 * Requires an authenticated session but deliberately skips the onboarding
 * check. Renders a centered, distraction-free shell (no Navbar, no Sidebar).
 */

export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({
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
