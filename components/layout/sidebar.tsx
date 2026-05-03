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
  faBolt,
  faBullseye,
  faListCheck,
  faFolderOpen,
  faStar,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface NavItem {
  href: string;
  label: string;
  icon: IconDefinition;
}

interface NavSection {
  /** Translated section label rendered as an eyebrow above the items */
  label: string;
  items: NavItem[];
}

/**
 * Sidebar navigation for the authenticated app shell.
 * Items are grouped into three semantic sections — TODAY (act now),
 * PLAN (organise), REWARD (track progress). The grouping itself is the
 * UX win: the user sees not just *where* to navigate but *why* — which
 * mental mode each section serves.
 */
export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const SECTIONS: NavSection[] = [
    {
      label: t("section_today"),
      items: [
        { href: "/dashboard", label: t("dashboard"), icon: faHouse },
        { href: "/focus", label: t("focus_mode"), icon: faBullseye },
        { href: "/quick", label: t("quick_mode"), icon: faBolt },
      ],
    },
    {
      label: t("section_plan"),
      items: [
        { href: "/tasks", label: t("tasks"), icon: faListCheck },
        { href: "/topics", label: t("topics"), icon: faFolderOpen },
      ],
    },
    {
      label: t("section_reward"),
      items: [
        { href: "/wishlist", label: t("wishlist"), icon: faStar },
        { href: "/progress", label: t("progress"), icon: faChartLine },
      ],
    },
  ];

  return (
    <aside
      className="w-56 shrink-0 hidden md:flex flex-col border-r min-h-0"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border)",
      }}
    >
      <nav className="flex flex-col gap-1 p-3 pt-4">
        {SECTIONS.map((section, idx) => (
          <div key={section.label} className="flex flex-col gap-1">
            {/* Section eyebrow — small caps, muted, generous tracking.
                First section gets no top margin; subsequent sections get
                spacing to visually separate the groups. */}
            <span
              className={`text-[10px] font-semibold uppercase tracking-[0.18em] px-3 ${idx === 0 ? "pt-1" : "pt-5"} pb-1.5`}
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
                opacity: 0.7,
              }}
            >
              {section.label}
            </span>

            {section.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  // Active nav items use a subtle bg tint only — no amber border.
                  // Per the monochromatic-hierarchy rule, amber is reserved for
                  // the Daily Quest and primary CTAs; navigation is structural
                  // and shouldn't compete for attention.
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 no-underline"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    backgroundColor: isActive
                      ? "var(--bg-elevated)"
                      : "transparent",
                    color: isActive ? "var(--text-primary)" : "var(--text-muted)",
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
          </div>
        ))}
      </nav>
    </aside>
  );
}
