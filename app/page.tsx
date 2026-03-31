/**
 * Root page — redirects to dashboard if authenticated, otherwise to login.
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Root page redirect.
 * Authenticated users go to /dashboard, others go to /login.
 */
export default async function RootPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
