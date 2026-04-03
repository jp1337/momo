"use client";

/**
 * UserMenu — avatar dropdown in the navbar.
 *
 * Clicking the user avatar opens a dropdown with:
 *  - User name + email
 *  - Settings link
 *  - API Keys link
 *  - Sign out button
 *
 * Closes on outside click.
 */

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faKey,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";

interface UserMenuProps {
  userName?: string | null;
  userImage?: string | null;
  userEmail?: string | null;
}

/**
 * Avatar-triggered dropdown menu for user actions.
 *
 * @param userName  - Display name from the session
 * @param userImage - Avatar URL from the OAuth provider
 * @param userEmail - Email address (shown in the menu header)
 */
export function UserMenu({ userName, userImage, userEmail }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initials = userName
    ? userName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  /** Close menu on click outside */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  /** Close menu on Escape key */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="User menu"
        className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-sm font-medium flex-shrink-0 transition-opacity hover:opacity-80"
        style={{
          backgroundColor: "var(--accent-green)",
          color: "var(--bg-primary)",
          border: "2px solid var(--border)",
        }}
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

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 w-56 rounded-xl overflow-hidden z-50"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* User identity header */}
          <div
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
          </div>

          {/* Navigation items */}
          <div className="py-1">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100 no-underline"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-primary)",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  "var(--bg-surface)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  "transparent")
              }
            >
              <FontAwesomeIcon
                icon={faGear}
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "var(--text-muted)" }}
                aria-hidden="true"
              />
              Einstellungen
            </Link>

            <Link
              href="/api-keys"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100 no-underline"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-primary)",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  "var(--bg-surface)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  "transparent")
              }
            >
              <FontAwesomeIcon
                icon={faKey}
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "var(--text-muted)" }}
                aria-hidden="true"
              />
              API Keys
            </Link>
          </div>

          {/* Divider */}
          <div
            className="border-t"
            style={{ borderColor: "var(--border)" }}
          />

          {/* Sign out */}
          <div className="py-1">
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut({ callbackUrl: "/login" });
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-primary)",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  "var(--bg-surface)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  "transparent")
              }
            >
              <FontAwesomeIcon
                icon={faRightFromBracket}
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "var(--text-muted)" }}
                aria-hidden="true"
              />
              Abmelden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
