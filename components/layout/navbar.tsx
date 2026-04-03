"use client";

/**
 * Navbar component — top navigation bar for the authenticated app shell.
 *
 * Contains:
 *  - App name "Momo" in Lora display font
 *  - Theme toggle button
 *  - User avatar and sign-out button
 *
 * This is a Client Component because it uses useSession from next-auth/react.
 */

import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CoinCounter } from "@/components/layout/coin-counter";
import Image from "next/image";
import Link from "next/link";

interface NavbarProps {
  /** Current user's display name */
  userName?: string | null;
  /** Current user's avatar URL */
  userImage?: string | null;
  /** Current user's email (used as fallback for avatar) */
  userEmail?: string | null;
  /** Initial coin balance fetched server-side */
  initialCoins?: number;
}

/**
 * Top navigation bar displayed on all authenticated pages.
 *
 * @param userName  - User's display name from the session
 * @param userImage - User's avatar URL from the OAuth provider
 * @param userEmail - User's email (fallback for UI)
 */
export function Navbar({ userName, userImage, userEmail, initialCoins = 0 }: NavbarProps) {
  /** Derives initials from user name for the fallback avatar */
  const initials = userName
    ? userName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* App name */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 no-underline group"
      >
        <Image
          src="/icon.svg"
          alt=""
          width={28}
          height={28}
          priority
          aria-hidden="true"
        />
        <span
          className="text-2xl font-semibold tracking-tight transition-colors duration-150"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-primary)",
          }}
        >
          momo
        </span>
      </Link>

      {/* Right-side actions */}
      <div className="flex items-center gap-3">
        <CoinCounter initialCoins={initialCoins} />
        <ThemeToggle />

        {/* User section */}
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-sm font-medium flex-shrink-0"
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
          </div>

          {/* User name — hidden on small screens */}
          {userName && (
            <span
              className="hidden sm:block text-sm font-medium"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {userName}
            </span>
          )}

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm px-3 py-1.5 rounded-lg transition-all duration-150 hover:opacity-80"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
            title={`Sign out ${userEmail ?? ""}`}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
