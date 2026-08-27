"use client";

/**
 * Der Rand von /tasks: Zähler und die Filter.
 *
 * "In die Lesespalte gehört, was der Nutzer tut. In den Rand gehört, was
 * die App über seinen Tag sagt." Die Coins der einzelnen Zeilen landen
 * hier als Summe statt an jeder Zeile — und der Rand trägt nie Amber.
 *
 * Der Plan rief hier `SearchFilterBar` mit Props auf, die es nicht gibt
 * (`filterGroups`/`onFilterChange`/`onClearAll` statt der echten
 * Schnittstelle, siehe `components/shared/search-filter-bar.tsx`), und
 * `SearchFilterBar` bündelt ohnehin ein Sucheingabefeld UND die
 * Filter-Pillen — für einen 208-px-Rand zu viel. Dieser Rand verwendet
 * deshalb nur `FilterPills` (Suchen bleibt in der Lesespalte, siehe
 * `task-list.tsx`).
 */
import { useTranslations } from "next-intl";
import { FilterPills } from "@/components/shared/search-filter-bar";
import type { FilterGroup } from "@/components/shared/search-filter-bar";

export interface TasksRailProps {
  open: number;
  overdue: number;
  coins: number;
  filters: FilterGroup[];
  activeFilters: Record<string, string | null>;
  onFilterChange: (key: string, value: string | null) => void;
  resultCount: number;
  totalCount: number;
  isFiltering: boolean;
  onClear: () => void;
}

/**
 * Der Rand von /tasks.
 *
 * @param props - siehe TasksRailProps
 * @returns Zähler (offen, überfällig, Münzen) plus die Filter-Pillen
 */
export function TasksRail({
  open,
  overdue,
  coins,
  filters,
  activeFilters,
  onFilterChange,
  resultCount,
  totalCount,
  isFiltering,
  onClear,
}: TasksRailProps) {
  const t = useTranslations("tasks");
  return (
    <>
      <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--ink-3)]">
        {t("rail_open", { count: open })}
      </p>
      {/* Überfällige nur zeigen, wenn es welche gibt: eine Null als Tatsache
          zu präsentieren ist ein täglicher kleiner Vorwurf (Spec §6). */}
      {overdue > 0 && (
        <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--danger)]">
          {t("rail_overdue", { count: overdue })}
        </p>
      )}
      <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--ink-3)]">
        {t("rail_coins", { coins })}
      </p>
      <FilterPills
        filters={filters}
        activeFilters={activeFilters}
        onFilterChange={onFilterChange}
        resultCount={resultCount}
        totalCount={totalCount}
        onClearAll={onClear}
        isFiltering={isFiltering}
      />
    </>
  );
}
