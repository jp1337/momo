/**
 * Authenticated app layout.
 * Wraps all protected pages with the Navbar and Sidebar.
 * Redirects unauthenticated users to the login page.
 */

// Force dynamic rendering so runtime env vars (e.g. ADMIN_USER_IDS) are read
// fresh on every request rather than being evaluated once at build time.
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { QuickAddModal } from "@/components/layout/quick-add-modal";
import { getUserStats, getLevelForCoins } from "@/lib/gamification";
import {
  isSessionSecondFactorVerified,
  readSessionTokenFromCookieStore,
  userHasSecondFactor,
} from "@/lib/totp";
import { serverEnv } from "@/lib/env";

/**
 * App shell layout — requires an authenticated session.
 * Renders Navbar + Sidebar + main content area.
 *
 * @param children - The active page content
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Guard: redirect unauthenticated users to login
  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;

  // ── Second-factor enforcement gate ─────────────────────────────────────
  // 1) When REQUIRE_2FA=true and the user has no second factor at all,
  //    hard-lock to /setup/2fa. Existing users without a second factor hit
  //    this on their next request after the env var is enabled.
  // 2) When the user has any second factor configured (TOTP or Passkey)
  //    but the current session row has not yet been verified, redirect to
  //    /login/2fa for the second-factor challenge. Triggered on every
  //    fresh OAuth login. Passwordless passkey logins skip this because
  //    their sessions are created with `second_factor_verified_at` pre-set.
  // The /setup/2fa and /login/2fa routes mount their own minimal layouts
  // outside this hierarchy to avoid a redirect loop.
  const hasSecondFactor = await userHasSecondFactor(user.id!);
  if (serverEnv.REQUIRE_2FA && !hasSecondFactor) {
    redirect("/setup/2fa");
  }
  if (hasSecondFactor) {
    const cookieStore = await cookies();
    const sessionToken = readSessionTokenFromCookieStore(cookieStore);
    const verified =
      sessionToken !== undefined &&
      (await isSessionSecondFactorVerified(sessionToken));
    if (!verified) redirect("/login/2fa");
  }

  // ── Onboarding gate ─────────────────────────────────────────────────
  // New users who haven't completed onboarding are redirected to the
  // guided setup wizard. The /onboarding route has its own layout
  // outside (app) to avoid an infinite redirect loop.
  const { isOnboardingCompleted } = await import("@/lib/onboarding");
  if (!(await isOnboardingCompleted(user.id!))) {
    redirect("/onboarding");
  }

  const { coins } = await getUserStats(user.id!);
  const currentLevel = getLevelForCoins(coins);
  const tAchievements = await getTranslations("achievements");

  // Admin check: ADMIN_USER_IDS is a comma-separated list of user UUIDs.
  // Optional — if not set, no user is treated as admin.
  const isAdmin = (() => {
    const adminIds = process.env.ADMIN_USER_IDS ?? "";
    if (!adminIds) return false;
    return adminIds
      .split(",")
      .map((id) => id.trim())
      .includes(user.id!);
  })();

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Top navigation */}
      <Navbar
        userName={user.name}
        userImage={user.image}
        userEmail={user.email}
        initialCoins={coins}
        initialLevel={currentLevel.level}
        levelTitle={tAchievements(`levels.${currentLevel.level}`)}
        isAdmin={isAdmin}
      />

      {/* Body: sidebar + page content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />

        {/*
          Main content area
          - px-4 on mobile (16px), px-6 from sm+ (24px) for tighter density on phones
          - pb-24 on mobile so the last item never disappears behind the fixed
            bottom nav (~64px tall + safe-area). Reduced to pb-6 from md+ where
            the bottom nav is hidden.
        */}
        <main
          className="flex-1 overflow-y-auto px-4 pt-6 pb-24 sm:px-6 md:pb-6"
          style={{ backgroundColor: "var(--bg-primary)" }}
        >
          {children}
        </main>
      </div>

      {/* Bottom tab bar — mobile only (hidden on md+) */}
      <MobileNav />

      {/* Global Quick Add modal — triggered by N or / shortcut */}
      <QuickAddModal />
    </div>
  );
}
