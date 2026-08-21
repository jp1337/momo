/**
 * Layout for /api-docs.
 * No authentication required and no app shell (Navbar/Sidebar) is rendered —
 * Swagger UI provides its own full-page chrome.
 *
 * The style reset overrides globals.css rules that cascade from the app theme
 * (background-color, color, link color) so Swagger UI renders with its own
 * default styles unaffected by the app's dark/light mode. Scoped to this one
 * route on purpose — it used to live on the shared `(docs)/layout.tsx` and
 * leaked into `/design-system`, which needs the normal themed background,
 * not Swagger's.
 */

import type { Metadata } from "next";

// Metadata is declared on the layout because the child page is a client
// component (`"use client"`) and Next.js does not allow `metadata` exports
// from client components.
export const metadata: Metadata = {
  title: "API Docs",
  description: "Interactive OpenAPI 3.1 reference for the Momo HTTP API.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#fff",
        color: "#3b4151",
      }}
    >
      {children}
    </div>
  );
}
