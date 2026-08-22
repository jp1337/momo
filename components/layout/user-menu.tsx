"use client";

/**
 * UserMenu — avatar dropdown in the navbar.
 *
 * Built on Radix UI DropdownMenu primitive — arrow-key navigation, type-ahead,
 * focus management, Esc/outside-click, ARIA all handled by the library.
 */

import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faKey,
  faRightFromBracket,
  faChartBar,
  faCalendarWeek,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { CSSProperties, ReactNode } from "react";

interface UserMenuProps {
  userName?: string | null;
  userImage?: string | null;
  userEmail?: string | null;
  /** If true, an Admin link is shown in the menu */
  isAdmin?: boolean;
}

const itemBaseStyle: CSSProperties = {
  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
  color: "var(--text-primary)",
  backgroundColor: "transparent",
  border: "none",
  cursor: "pointer",
};

const itemClass =
  "flex items-center gap-3 px-4 py-2.5 text-sm no-underline outline-none data-[highlighted]:bg-[var(--bg-surface)]";

interface MenuLinkItemProps {
  href: string;
  icon: typeof faChartBar;
  iconColor?: string;
  textColor?: string;
  children: ReactNode;
}

/**
 * MenuLinkItem — internal helper that wraps Next.js Link inside a Radix MenuItem.
 * `asChild` lets Radix forward keyboard handling to the link element.
 */
function MenuLinkItem({ href, icon, iconColor, textColor, children }: MenuLinkItemProps) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className={itemClass}
        style={{ ...itemBaseStyle, color: textColor ?? itemBaseStyle.color }}
      >
        <FontAwesomeIcon
          icon={icon}
          className="w-4 h-4 flex-shrink-0"
          style={{ color: iconColor ?? "var(--text-muted)" }}
          aria-hidden="true"
        />
        {children}
      </Link>
    </DropdownMenu.Item>
  );
}

/**
 * Avatar-triggered dropdown menu for user actions.
 */
export function UserMenu({ userName, userImage, userEmail, isAdmin }: UserMenuProps) {
  const initials = userName
    ? userName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="User menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-pill)] border border-[var(--hairline)] bg-[var(--raised)] text-sm font-medium text-[var(--ink)] transition-opacity hover:opacity-80"
        >
          {userImage ? (
            <Image
              src={userImage}
              alt={userName ?? "User avatar"}
              width={32}
              height={32}
              className="object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="w-56 rounded-xl overflow-hidden z-50"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Identity header — DropdownMenu.Label is non-focusable + non-interactive */}
          <DropdownMenu.Label
            className="px-4 py-3 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <p
              className="text-sm font-medium truncate"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-primary)",
              }}
            >
              {userName ?? "User"}
            </p>
            {userEmail && (
              <p
                className="text-xs truncate mt-0.5"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                {userEmail}
              </p>
            )}
          </DropdownMenu.Label>

          <div className="py-1">
            <MenuLinkItem href="/stats" icon={faChartBar}>
              Statistiken
            </MenuLinkItem>
            <MenuLinkItem href="/review" icon={faCalendarWeek}>
              Wochenrückblick
            </MenuLinkItem>
            <MenuLinkItem href="/settings" icon={faGear}>
              Einstellungen
            </MenuLinkItem>
            <MenuLinkItem href="/api-keys" icon={faKey}>
              API Keys
            </MenuLinkItem>
            {isAdmin && (
              <MenuLinkItem
                href="/admin"
                icon={faShieldHalved}
                iconColor="var(--ink-2)"
                textColor="var(--ink-2)"
              >
                Admin
              </MenuLinkItem>
            )}
          </div>

          <DropdownMenu.Separator
            className="border-t"
            style={{ borderColor: "var(--border)" }}
          />

          <div className="py-1">
            <DropdownMenu.Item
              onSelect={() => signOut({ callbackUrl: "/login" })}
              className={`w-full ${itemClass}`}
              style={itemBaseStyle}
            >
              <FontAwesomeIcon
                icon={faRightFromBracket}
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "var(--text-muted)" }}
                aria-hidden="true"
              />
              Abmelden
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
