"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faBell,
  faCrosshairs,
  faShield,
  faPlug,
  faDatabase,
} from "@fortawesome/free-solid-svg-icons";

const NAV_ITEMS = [
  { href: "/settings/account", icon: faUser, key: "nav_account" },
  { href: "/settings/notifications", icon: faBell, key: "nav_notifications" },
  { href: "/settings/quest", icon: faCrosshairs, key: "nav_quest" },
  { href: "/settings/security", icon: faShield, key: "nav_security" },
  { href: "/settings/integrations", icon: faPlug, key: "nav_integrations" },
  { href: "/settings/data", icon: faDatabase, key: "nav_data" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();
  const t = useTranslations("settings");

  return (
    <>
      {/* Desktop: vertical sidebar nav */}
      <nav
        className="hidden md:flex flex-col gap-0.5 w-44 shrink-0 pt-1"
        aria-label="Settings navigation"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                fontWeight: isActive ? 600 : 400,
                backgroundColor: isActive ? "var(--bg-elevated)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                borderLeft: isActive
                  ? "2px solid var(--accent-amber)"
                  : "2px solid transparent",
                textDecoration: "none",
              }}
            >
              <FontAwesomeIcon
                icon={item.icon}
                style={{ width: "14px", opacity: isActive ? 1 : 0.7 }}
              />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      {/* Mobile: horizontal scrollable tab strip */}
      <div
        className="md:hidden overflow-x-auto flex gap-1 pb-2 mb-2"
        style={{ borderBottom: "1px solid var(--border)" }}
        aria-label="Settings navigation"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                fontWeight: isActive ? 600 : 400,
                backgroundColor: isActive ? "var(--bg-elevated)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                borderBottom: isActive
                  ? "2px solid var(--accent-amber)"
                  : "2px solid transparent",
                textDecoration: "none",
              }}
            >
              <FontAwesomeIcon
                icon={item.icon}
                style={{ width: "13px", opacity: isActive ? 1 : 0.7 }}
              />
              {t(item.key)}
            </Link>
          );
        })}
      </div>
    </>
  );
}
