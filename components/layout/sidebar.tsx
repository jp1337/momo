"use client";

/**
 * Sidebar component — left navigation for the authenticated app shell.
 *
 * Contains links to all main sections of the app:
 *  - Dashboard (daily quest overview)
 *  - Tasks
 *  - Topics
 *  - Wishlist
 *  - Settings
 *
 * Highlights the active route using the pathname.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faListCheck,
  faFolderOpen,
  faStar,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface NavItem {
  href: string;
  label: string;
  icon: IconDefinition;
}

/**
 * Sidebar navigation for the authenticated app shell.
 * Renders a vertical list of navigation links with active state highlighting.
 */
export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  /** Main navigation items — built inside the component so labels are translated */
  const NAV_ITEMS: NavItem[] = [
    { href: "/dashboard", label: t("dashboard"), icon: faHouse },
    { href: "/tasks", label: t("tasks"), icon: faListCheck },
    { href: "/topics", label: t("topics"), icon: faFolderOpen },
    { href: "/wishlist", label: t("wishlist"), icon: faStar },
    { href: "/settings", label: t("settings"), icon: faGear },
  ];

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
              <FontAwesomeIcon
                icon={item.icon}
                className="w-4 h-4 flex-shrink-0"
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
