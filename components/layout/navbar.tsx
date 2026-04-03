"use client";

/**
 * Navbar component — top navigation bar for the authenticated app shell.
 *
 * Contains:
 *  - App feather icon + "momo" wordmark (Lora font)
 *  - Theme toggle button
 *  - Coin counter
 *  - UserMenu (avatar dropdown: Settings, API Keys, Sign out)
 *
 * This is a Client Component because UserMenu uses next-auth/react hooks.
 */

import { ThemeToggle } from "@/components/theme-toggle";
import { CoinCounter } from "@/components/layout/coin-counter";
import { UserMenu } from "@/components/layout/user-menu";
import Image from "next/image";
import Link from "next/link";

interface NavbarProps {
  /** Current user's display name */
  userName?: string | null;
  /** Current user's avatar URL */
  userImage?: string | null;
  /** Current user's email (shown in user menu) */
  userEmail?: string | null;
  /** Initial coin balance fetched server-side */
  initialCoins?: number;
}

/**
 * Top navigation bar displayed on all authenticated pages.
 *
 * @param userName  - User's display name from the session
 * @param userImage - User's avatar URL from the OAuth provider
 * @param userEmail - User's email (shown in the user menu)
 * @param initialCoins - Initial coin balance for the animated counter
 */
export function Navbar({ userName, userImage, userEmail, initialCoins = 0 }: NavbarProps) {
  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* App wordmark */}
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
        <UserMenu
          userName={userName}
          userImage={userImage}
          userEmail={userEmail}
        />
      </div>
    </header>
  );
}
