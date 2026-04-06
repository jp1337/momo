"use client";

/**
 * SearchFilterBar — reusable search input + filter chip bar.
 *
 * Used on the Tasks and Wishlist pages to provide client-side
 * text search and category filtering. Filter chips follow the
 * LanguageSwitcher styling pattern (amber active, elevated inactive).
 */

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";

export interface FilterOption {
  value: string;
  label: string;
  /** Optional colour dot shown before the label (e.g. topic colour). */
  color?: string | null;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
}

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  placeholder: string;
  filters: FilterGroup[];
  activeFilters: Record<string, string | null>;
  onFilterChange: (key: string, value: string | null) => void;
  resultCount: number;
  totalCount: number;
  onClearAll: () => void;
}

/**
 * Renders a search input and optional filter chip rows.
 * When any filter is active, a result-count hint and "clear all" link appear.
 */
export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  placeholder,
  filters,
  activeFilters,
  onFilterChange,
  resultCount,
  totalCount,
  onClearAll,
}: SearchFilterBarProps) {
  const t = useTranslations("search");
  const inputRef = useRef<HTMLInputElement>(null);

  const isFiltering =
    searchQuery.length > 0 ||
    Object.values(activeFilters).some((v) => v !== null);

  return (
    <div className="mb-5 flex flex-col gap-3">
      {/* Search input */}
      <div className="relative">
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-xs"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg py-2.5 pl-9 pr-9 text-sm outline-none transition-colors"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
          aria-label={placeholder}
        />
        {searchQuery.length > 0 && (
          <button
            onClick={() => {
              onSearchChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
            aria-label={t("clear")}
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        )}
      </div>

      {/* Filter chip rows */}
      {filters.map((group) => {
        if (group.options.length === 0) return null;
        return (
          <div key={group.key} className="flex items-center gap-2">
            <span
              className="shrink-0 text-xs font-medium uppercase tracking-wide"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {group.label}
            </span>
            <div
              className="flex gap-1.5 overflow-x-auto pb-0.5"
              style={{ scrollbarWidth: "none" }}
            >
              {/* "All" chip — resets this group */}
              <FilterChip
                label={t("all")}
                active={activeFilters[group.key] === null}
                onClick={() => onFilterChange(group.key, null)}
              />
              {group.options.map((opt) => (
                <FilterChip
                  key={opt.value}
                  label={opt.label}
                  color={opt.color}
                  active={activeFilters[group.key] === opt.value}
                  onClick={() =>
                    onFilterChange(
                      group.key,
                      activeFilters[group.key] === opt.value
                        ? null
                        : opt.value,
                    )
                  }
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Result count + clear-all link */}
      {isFiltering && (
        <div
          className="flex items-center gap-3 text-xs"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          <span>
            {resultCount} / {totalCount}
          </span>
          <button
            onClick={onClearAll}
            className="underline transition-colors hover:opacity-80"
            style={{ color: "var(--accent-amber)" }}
          >
            {t("clear_filters")}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── FilterChip ──────────────────────────────────────────────────────────── */

function FilterChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150"
      style={{
        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
        backgroundColor: active ? "var(--accent-amber)" : "var(--bg-elevated)",
        color: active ? "var(--bg-primary)" : "var(--text-muted)",
        border: `1px solid ${active ? "var(--accent-amber)" : "var(--border)"}`,
        cursor: "pointer",
      }}
      aria-pressed={active}
    >
      {color && (
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}
