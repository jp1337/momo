/**
 * Authenticated app layout.
 * Wraps all protected pages with the Navbar and Sidebar.
 * Redirects unauthenticated users to the login page.
 */

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
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

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Top navigation */}
      <Navbar
        userName={user.name}
        userImage={user.image}
        userEmail={user.email}
        initialCoins={coins}
      />

      {/* Body: sidebar + page content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />

        {/* Main content area */}
        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ backgroundColor: "var(--bg-primary)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
