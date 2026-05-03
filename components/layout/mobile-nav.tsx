"use client";

/**
 * MobileNav — bottom tab bar for mobile screens (hidden on md+).
 *
 * Replaces the desktop sidebar on small screens. Renders a fixed bottom bar
 * with icon + label for each main navigation section.
 * Includes safe-area-inset-bottom padding for iOS home indicator.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faBullseye,
  faListCheck,
  faFolderOpen,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface NavItem {
  href: string;
  labelKey: string;
  icon: IconDefinition;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard",  icon: faHouse },
  { href: "/focus",     labelKey: "focus_mode", icon: faBullseye },
  { href: "/tasks",     labelKey: "tasks",      icon: faListCheck },
  { href: "/topics",    labelKey: "topics",     icon: faFolderOpen },
  { href: "/progress",  labelKey: "progress",   icon: faChartLine },
];

/**
 * Fixed bottom navigation bar shown only on mobile (below md breakpoint).
 * Active tab is highlighted in amber. Handles iOS safe-area padding.
 */
export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      className="md:hidden flex-shrink-0 flex border-t"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border)",
        boxShadow: "0 -1px 8px rgba(0,0,0,.12)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            // Active nav items use text-primary + bolder weight only — no amber.
            // Same monochromatic-hierarchy rule as the desktop sidebar.
            className="flex-1 flex flex-col items-center gap-1 py-2.5 px-1 no-underline transition-colors duration-150"
            style={{
              color: isActive ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: isActive ? 600 : 400,
            }}
          >
            <FontAwesomeIcon
              icon={item.icon}
              className="w-5 h-5"
              aria-hidden="true"
            />
            <span
              className="text-xs font-medium"
              style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)" }}
            >
              {t(item.labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
