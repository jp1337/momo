/**
 * Auth layout — wraps sign-in and error pages.
 * Centers content vertically and horizontally with the warm Momo background.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
};

/**
 * Layout for unauthenticated pages (login, error).
 *
 * @param children - The auth page content
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {children}
    </div>
  );
}
