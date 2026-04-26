"use client";

/**
 * YearSelector — tiny client component for the /habits page.
 *
 * Renders a row of year chips (e.g. 2026 · 2025 · 2024). Clicking a chip
 * pushes `?year=YYYY` onto the URL, which re-runs the server page with
 * the new year. No local state — the URL is the source of truth.
 *
 * Visual pattern mirrors the active/inactive chip style used elsewhere
 * (language switcher, search filter bar): amber accent for active, flat
 * elevated background for inactive.
 */

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";

interface YearSelectorProps {
  currentYear: number;
  years: number[];
  label: string;
  /** Optional base URL to use instead of current pathname (e.g. "/progress?tab=habits") */
  baseHref?: string;
  /** Name of the year query param; defaults to "year" */
  yearParam?: string;
}

export function YearSelector({ currentYear, years, label, baseHref, yearParam = "year" }: YearSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function selectYear(year: number) {
    const base = baseHref ?? pathname;
    const separator = base.includes("?") ? "&" : "?";
    startTransition(() => {
      router.push(`${base}${separator}${yearParam}=${year}`);
    });
  }

  return (
    <div
      className="flex items-center gap-3 flex-wrap"
      role="group"
      aria-label={label}
    >
      <span
        className="text-xs uppercase tracking-wider"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
      <div className="flex gap-1.5 flex-wrap">
        {years.map((y) => {
          const active = y === currentYear;
          return (
            <button
              key={y}
              type="button"
              onClick={() => selectYear(y)}
              disabled={isPending}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                backgroundColor: active
                  ? "var(--accent-amber)"
                  : "var(--bg-elevated)",
                color: active ? "var(--bg-primary)" : "var(--text-muted)",
                border: active
                  ? "1px solid var(--accent-amber)"
                  : "1px solid var(--border)",
                cursor: isPending ? "wait" : "pointer",
                opacity: isPending && !active ? 0.6 : 1,
              }}
              aria-pressed={active}
            >
              {y}
            </button>
          );
        })}
      </div>
    </div>
  );
}
