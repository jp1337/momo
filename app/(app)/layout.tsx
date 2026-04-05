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
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getUserStats } from "@/lib/gamification";

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
