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
    <main className="fixed inset-0 overflow-x-hidden overflow-y-auto bg-[var(--ground)] text-[var(--ink)]">
      {children}
    </main>
  );
}
