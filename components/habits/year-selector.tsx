"use client";

/**
 * YearSelector — tiny client component for the /habits page.
 *
 * Renders a row of year chips (e.g. 2026 · 2025 · 2024). Clicking a chip
 * pushes `?year=YYYY` onto the URL, which re-runs the server page with
 * the new year. No local state — the URL is the source of truth.
 *
 * Task 11: was an amber-filled pill for the active year — a filled
 * surface, and amber as a fill (not text, not a wash) is exactly what the
 * spec forbids (`components/ui/button.tsx`'s own `primary` variant already
 * documents the same rule: "Amber ist Licht", text only, never a
 * background). Active/inactive now reuse the same distinction
 * `app/(app)/progress/page.tsx`'s tab nav uses one level up: `--raised`
 * fill + `--ink` text for the current year, transparent + `--ink-3` for
 * the rest.
 */

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

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
      <span className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-wider text-[var(--ink-3)]">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {years.map((y) => {
          const active = y === currentYear;
          return (
            <button
              key={y}
              type="button"
              onClick={() => selectYear(y)}
              disabled={isPending}
              className={cn(
                "rounded-[var(--radius-pill)] border px-3 py-1.5 font-[family-name:var(--font-ui)] text-sm font-medium transition-colors disabled:cursor-wait",
                active
                  ? "border-transparent bg-[var(--raised)] text-[var(--ink)]"
                  : "border-[var(--hairline)] bg-transparent text-[var(--ink-3)] disabled:opacity-60",
              )}
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
