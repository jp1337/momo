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
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getUserStats } from "@/lib/gamification";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  isSessionTotpVerified,
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

  // ── 2FA enforcement gate ───────────────────────────────────────────────
  // 1) When REQUIRE_2FA=true and the user has no second factor at all,
  //    hard-lock to /setup/2fa. Existing users without 2FA hit this on
  //    their next request after the env var is enabled.
  // 2) When the user has 2FA configured but the current session row has
  //    not yet been verified, redirect to /login/2fa for the second-factor
  //    challenge. Triggered on every fresh OAuth login.
  // The /setup/2fa and /login/2fa routes mount their own minimal layouts
  // outside this hierarchy to avoid a redirect loop.
  if (serverEnv.REQUIRE_2FA && !(await userHasSecondFactor(user.id!))) {
    redirect("/setup/2fa");
  }
  const [userRow] = await db
    .select({ totpEnabledAt: users.totpEnabledAt })
    .from(users)
    .where(eq(users.id, user.id!))
    .limit(1);
  if (userRow?.totpEnabledAt) {
    const cookieStore = await cookies();
    const sessionToken = readSessionTokenFromCookieStore(cookieStore);
    const verified =
      sessionToken !== undefined &&
      (await isSessionTotpVerified(sessionToken));
    if (!verified) redirect("/login/2fa");
  }

  const { coins } = await getUserStats(user.id!);

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
        isAdmin={isAdmin}
      />

      {/* Body: sidebar + page content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />

        {/* Main content area — pb-16 prevents content hiding behind mobile bottom nav */}
        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ backgroundColor: "var(--bg-primary)" }}
        >
          {children}
        </main>
      </div>

      {/* Bottom tab bar — mobile only (hidden on md+) */}
      <MobileNav />
    </div>
  );
}
