"use client";

/**
 * search-filter-bar.tsx — Suche und Filter, jetzt getrennt.
 *
 * War eine Komponente (Sucheingabe + Filter-Pillen in einem Block).
 * `/tasks` (Task 8) braucht beides an verschiedenen Stellen: Suchen ist
 * etwas, das der Nutzer *tut* (Lesespalte); die Filter sagen etwas *über*
 * die Liste (Rand). `SearchInput` und `FilterPills` sind deshalb jetzt
 * eigene, exportierte Komponenten — `SearchFilterBar` bleibt als dünne
 * Komposition beider bestehen, mit unveränderten Props/Verhalten, damit
 * `wishlist-view.tsx` (Phase 2, noch nicht migriert) unangetastet
 * weiterläuft.
 *
 * Amber ist hier raus (Task 8, Schritt 9): die aktive "Alle"/Filter-Pille
 * trug Amber als Fläche UND Rahmen gleichzeitig. Der ausgewählte Zustand
 * ist eine Affordanz und darf eine Kante haben — aber keine Lichtfarbe;
 * jetzt `--raised`/`--hairline`/`--ink`. Ebenso der "Filter zurücksetzen"-
 * Link: `--ink-2` statt `--accent-amber`.
 */

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

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

export interface SearchInputProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  placeholder: string;
}

/**
 * Die Sucheingabe allein — gehört in die Lesespalte, weil Suchen etwas
 * ist, das der Nutzer tut.
 *
 * @param props - siehe SearchInputProps
 * @returns Ein Eingabefeld mit Lupe und Löschen-Knopf
 */
export function SearchInput({ searchQuery, onSearchChange, placeholder }: SearchInputProps) {
  const t = useTranslations("search");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <FontAwesomeIcon
        icon={faMagnifyingGlass}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--ink-3)]"
      />
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--radius-sm)] border border-[var(--hairline)] bg-[var(--raised)] py-2 pl-8 pr-8 font-[family-name:var(--font-ui)] text-sm text-[var(--ink)] outline-none transition-colors"
        aria-label={placeholder}
      />
      {searchQuery.length > 0 && (
        <button
          type="button"
          onClick={() => {
            onSearchChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] transition-opacity hover:opacity-70"
          aria-label={t("clear")}
        >
          <FontAwesomeIcon icon={faXmark} className="text-sm" />
        </button>
      )}
    </div>
  );
}

export interface FilterPillsProps {
  filters: FilterGroup[];
  activeFilters: Record<string, string | null>;
  onFilterChange: (key: string, value: string | null) => void;
  resultCount: number;
  totalCount: number;
  onClearAll: () => void;
  /** Ob Suchtext ODER ein Filter aktiv ist — nur dann erscheinen Zähler + "Zurücksetzen". */
  isFiltering: boolean;
}

/**
 * Die Filter-Pillen allein — gehören in den Rand, weil sie etwas über den
 * Zustand der Liste sagen, nicht etwas, das der Nutzer gerade tippt.
 *
 * @param props - siehe FilterPillsProps
 * @returns Filterzeilen je Gruppe, plus Zähler/Zurücksetzen wenn gefiltert wird
 */
export function FilterPills({
  filters,
  activeFilters,
  onFilterChange,
  resultCount,
  totalCount,
  onClearAll,
  isFiltering,
}: FilterPillsProps) {
  const t = useTranslations("search");

  return (
    <div className="flex flex-col gap-3">
      {filters.map((group) => {
        if (group.options.length === 0) return null;
        return (
          <div key={group.key} className="flex flex-col gap-2">
            <span className="shrink-0 font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)]">
              {group.label}
            </span>
            <div className="flex flex-wrap gap-2">
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
                      activeFilters[group.key] === opt.value ? null : opt.value,
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
        <div className="flex items-center gap-3 font-[family-name:var(--font-ui)] text-xs text-[var(--ink-3)]">
          <span>
            {resultCount} / {totalCount}
          </span>
          <button
            type="button"
            onClick={onClearAll}
            className="text-[var(--ink-2)] underline transition-colors hover:opacity-80"
          >
            {t("clear_filters")}
          </button>
        </div>
      )}
    </div>
  );
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
 *
 * Dünne Komposition aus `SearchInput` + `FilterPills` — unverändertes
 * Verhalten für bestehende Aufrufer (`wishlist-view.tsx`).
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
  const isFiltering =
    searchQuery.length > 0 || Object.values(activeFilters).some((v) => v !== null);

  return (
    <div className="mb-6 flex flex-col gap-3">
      <SearchInput searchQuery={searchQuery} onSearchChange={onSearchChange} placeholder={placeholder} />
      <FilterPills
        filters={filters}
        activeFilters={activeFilters}
        onFilterChange={onFilterChange}
        resultCount={resultCount}
        totalCount={totalCount}
        onClearAll={onClearAll}
        isFiltering={isFiltering}
      />
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
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-[var(--radius-pill)] border px-2 py-1 font-[family-name:var(--font-ui)] text-xs font-medium transition-colors duration-150",
        active
          ? "border-[var(--hairline)] bg-[var(--raised)] text-[var(--ink)]"
          : "border-transparent bg-transparent text-[var(--ink-3)]",
      )}
      aria-pressed={active}
    >
      {color && <span className="inline-block h-2.5 w-2.5 rounded-[var(--radius-pill)]" style={{ backgroundColor: color }} />}
      {label}
    </button>
  );
}
