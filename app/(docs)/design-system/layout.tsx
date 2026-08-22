/**
 * Layout for /design-system.
 * Metadata is declared here because the page itself is a client component
 * (`"use client"`, for the Checkbox demo's local state) and Next.js does not
 * allow `metadata` exports from client components.
 *
 * `robots: { index: false }` preserves this page's existing (accidental)
 * behavior from when it inherited the shared (docs) layout's api-docs
 * metadata — it's an internal reference page, not a page worth surfacing in
 * search results, and this keeps that unchanged rather than changing SEO
 * behavior as a side effect of the layout split.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design System",
  description: "Live reference for Momo's token system — surfaces, radius, buttons, fonts, and the amber rule.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
