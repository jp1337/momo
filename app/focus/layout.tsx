/**
 * Focus Mode layout — lives outside (app) so it renders without Navbar, Sidebar,
 * or MobileNav. Requires authentication only.
 */

export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "var(--bg-primary)",
        overflow: "hidden auto",
      }}
    >
      {children}
    </div>
  );
}
