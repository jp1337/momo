"use client";

/**
 * Sidebar component — left navigation for the authenticated app shell.
 *
 * Contains links to all main sections of the app:
 *  - Dashboard (daily quest overview)
 *  - Tasks
 *  - Topics
 *  - Wishlist
 *
 * Highlights the active route using the pathname.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

/** Main navigation items */
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/tasks", label: "Tasks", icon: "✓" },
  { href: "/topics", label: "Topics", icon: "📁" },
  { href: "/wishlist", label: "Wishlist", icon: "⭐" },
];

/**
 * Sidebar navigation for the authenticated app shell.
 * Renders a vertical list of navigation links with active state highlighting.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-56 shrink-0 flex flex-col border-r min-h-0"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border)",
      }}
    >
      <nav className="flex flex-col gap-1 p-3 pt-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 no-underline"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                backgroundColor: isActive
                  ? "var(--bg-elevated)"
                  : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                borderLeft: isActive
                  ? "2px solid var(--accent-amber)"
                  : "2px solid transparent",
              }}
            >
              <span className="text-base w-5 text-center" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
