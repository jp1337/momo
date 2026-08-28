"use client";

/**
 * WishlistView — interactive client component for the wishlist page.
 *
 * Manages all client-side state for wishlist items and budget.
 * Handles CRUD operations via API calls and triggers re-renders.
 *
 * Layout (Lichtkegel, Phase 2 Task 6): `PageFrame` with the budget bar and
 * filter pills in the rail, the passed-in page header plus search, item
 * list and history in the reading column.
 */

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { BudgetBar } from "@/components/wishlist/budget-bar";
import { WishlistRow } from "@/components/wishlist/wishlist-row";
import { WishlistForm } from "@/components/wishlist/wishlist-form";
import { List, GroupHeading } from "@/components/ui/list";
import { PageFrame } from "@/components/ui/page-frame";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SearchInput, FilterPills } from "@/components/shared/search-filter-bar";
import type { FilterGroup } from "@/components/shared/search-filter-bar";
import { triggerSmallConfetti } from "@/components/animations/confetti";
import { dispatchCoinsEarned } from "@/lib/client/coin-events";
import { cn } from "@/lib/utils";

/** Serialised wishlist item shape passed from the server page */
export interface SerializedWishlistItem {
  id: string;
  title: string;
  price: string | null;
  url: string | null;
  priority: "WANT" | "NICE_TO_HAVE" | "SOMEDAY";
  status: "OPEN" | "BOUGHT" | "DISCARDED";
  coinUnlockThreshold: number | null;
  createdAt: string;
}

/** Serialised budget summary passed from the server page */
export interface SerializedBudgetSummary {
  monthlyBudget: number | null;
  spentThisMonth: number;
  remaining: number | null;
}

interface WishlistViewProps {
  /** Die Kopfzeile der Seite (h1 + Untertitel), von `app/(app)/wishlist/page.tsx` gereicht. */
  header: React.ReactNode;
  initialItems: SerializedWishlistItem[];
  initialBudget: SerializedBudgetSummary;
  userCoins: number;
}

/**
 * Main interactive wishlist view.
 * Owns all local state for items, budget, and modal visibility.
 */
export function WishlistView({
  header,
  initialItems,
  initialBudget,
  userCoins,
}: WishlistViewProps) {
  const t = useTranslations("wishlist");
  const tSearch = useTranslations("search");
  const [items, setItems] = useState<SerializedWishlistItem[]>(initialItems);
  const [budget, setBudget] = useState<SerializedBudgetSummary>(initialBudget);
  const [coins, setCoins] = useState(userCoins);
  const [showForm, setShowForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [coinError, setCoinError] = useState<string | null>(null);

  /* ─── Search & Filter state ─────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let result = items;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => i.title.toLowerCase().includes(q));
    }
    if (priorityFilter) {
      result = result.filter((i) => i.priority === priorityFilter);
    }
    return result;
  }, [items, searchQuery, priorityFilter]);

  const isFiltering = searchQuery.length > 0 || priorityFilter !== null;

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        key: "priority",
        label: tSearch("filter_priority"),
        options: [
          { value: "WANT", label: t("priority_want") },
          { value: "NICE_TO_HAVE", label: t("priority_nice") },
          { value: "SOMEDAY", label: t("priority_someday") },
        ],
      },
    ],
    [t, tSearch],
  );

  const handleFilterChange = useCallback(
    (key: string, value: string | null) => {
      if (key === "priority") setPriorityFilter(value);
    },
    [],
  );

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setPriorityFilter(null);
  }, []);

  // Derive open vs history items from filtered list
  const openItems = filteredItems.filter((i) => i.status === "OPEN");
  const historyItems = filteredItems.filter(
    (i) => i.status === "BOUGHT" || i.status === "DISCARDED",
  );
  const boughtItems = historyItems.filter((i) => i.status === "BOUGHT");
  const discardedItems = historyItems.filter((i) => i.status === "DISCARDED");

  // Alle Zeiten, nicht nur der laufende Monat — aus den Einträgen abgeleitet,
  // die die Seite ohnehin hält, statt aus einer zweiten Abfrage. Nebenwirkung
  // und Absicht zugleich: die Zahl aktualisiert sich sofort mit, wenn ein
  // Wunsch gekauft oder ein Kauf zurückgenommen wird, weil sie aus `items`
  // fällt und nicht aus einer Server-Momentaufnahme. Bewusst über `items`
  // statt `filteredItems`: eine Gesamtsumme darf nicht auf einen Suchbegriff
  // reagieren.
  const totalSpent = items.reduce(
    (sum, i) => (i.status === "BOUGHT" && i.price ? sum + Number(i.price) : sum),
    0,
  );

  /** Reload all items + budget from the API */
  const refresh = async () => {
    try {
      const res = await fetch("/api/wishlist");
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: SerializedWishlistItem[];
        budget: SerializedBudgetSummary;
      };
      setItems(data.items);
      setBudget(data.budget);
    } catch {
      // Silently fail — state stays as-is
    }
  };

  /** Mark an item as bought; deducts coins if threshold is set */
  const handleBuy = async (id: string) => {
    setCoinError(null);
    try {
      const res = await fetch(`/api/wishlist/${id}/buy`, { method: "POST" });
      if (res.status === 422) {
        setCoinError(t("error_insufficient_coins"));
        setTimeout(() => setCoinError(null), 4000);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      const coinsSpent: number = data.coinsSpent ?? 0;
      if (coinsSpent > 0) {
        setCoins((prev) => prev - coinsSpent);
        dispatchCoinsEarned(-coinsSpent);
      }
      await refresh();
      triggerSmallConfetti();
    } catch {
      // no-op
    }
  };

  /** Revert a bought item to OPEN; refunds coins if applicable */
  const handleUnbuy = async (id: string) => {
    try {
      const res = await fetch(`/api/wishlist/${id}/buy`, { method: "DELETE" });
      if (!res.ok) return;
      const data = await res.json();
      const coinsRefunded: number = data.coinsRefunded ?? 0;
      if (coinsRefunded > 0) {
        setCoins((prev) => prev + coinsRefunded);
        dispatchCoinsEarned(coinsRefunded);
      }
      await refresh();
    } catch {
      // no-op
    }
  };

  /** Restore a discarded item back to OPEN */
  const handleUndiscard = async (id: string) => {
    try {
      const res = await fetch(`/api/wishlist/${id}/discard`, { method: "DELETE" });
      if (!res.ok) return;
      await refresh();
    } catch {
      // no-op
    }
  };

  /** Mark an item as discarded */
  const handleDiscard = async (id: string) => {
    try {
      const res = await fetch(`/api/wishlist/${id}/discard`, { method: "POST" });
      if (!res.ok) return;
      await refresh();
    } catch {
      // no-op
    }
  };

  /** Permanently delete an item */
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/wishlist/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // no-op
    }
  };

  /** Open edit form for a specific item */
  const handleEdit = (id: string) => {
    setEditingItemId(id);
    setShowForm(true);
  };

  /** Called when form is successfully submitted */
  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingItemId(null);
    await refresh();
  };

  /** Die sechzehn Props einer Zeile, an drei Stellen identisch. */
  const rowProps = (item: SerializedWishlistItem) => ({
    id: item.id,
    title: item.title,
    price: item.price,
    url: item.url,
    priority: item.priority,
    status: item.status,
    coinUnlockThreshold: item.coinUnlockThreshold,
    userCoins: coins,
    monthlyBudget: budget.monthlyBudget,
    remainingBudget: budget.remaining,
    onBuy: handleBuy,
    onUnbuy: handleUnbuy,
    onDiscard: handleDiscard,
    onUndiscard: handleUndiscard,
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  const editingItem = editingItemId
    ? items.find((i) => i.id === editingItemId)
    : null;

  /** Build initial data for the edit form */
  const editingInitialData = editingItem
    ? {
        id: editingItem.id,
        title: editingItem.title,
        price: editingItem.price !== null ? editingItem.price : "",
        url: editingItem.url ?? "",
        priority: editingItem.priority,
        coinUnlockThreshold:
          editingItem.coinUnlockThreshold !== null
            ? String(editingItem.coinUnlockThreshold)
            : "",
      }
    : undefined;

  const rail = (
    <>
      <BudgetBar
        monthlyBudget={budget.monthlyBudget}
        spentThisMonth={budget.spentThisMonth}
        remaining={budget.remaining}
        totalSpent={totalSpent}
        onBudgetUpdate={async (newBudget) => {
          setBudget((prev) => ({
            ...prev,
            monthlyBudget: newBudget,
            remaining:
              newBudget !== null
                ? newBudget - prev.spentThisMonth
                : null,
          }));
          // Full refresh to get consistent state
          await refresh();
        }}
      />
      {items.length > 0 && (
        <FilterPills
          filters={filterGroups}
          activeFilters={{ priority: priorityFilter }}
          onFilterChange={handleFilterChange}
          resultCount={filteredItems.length}
          totalCount={items.length}
          onClearAll={clearAllFilters}
          isFiltering={isFiltering}
        />
      )}
    </>
  );

  return (
    <PageFrame rail={rail}>
      {header}

      {/* Add item — always available, not just from the empty state's own action. */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="quiet"
          size="sm"
          onClick={() => {
            setEditingItemId(null);
            setShowForm(true);
          }}
        >
          {t("view_add")}
        </Button>
      </div>

      {/* Search — only shown when there are items; filters live in the rail. */}
      {items.length > 0 && (
        <SearchInput
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder={tSearch("placeholder_wishlist")}
        />
      )}

      {/* No results from search/filter */}
      {items.length > 0 && filteredItems.length === 0 && isFiltering && (
        <EmptyState
          line={tSearch("no_results_hint")}
          action={
            <Button variant="quiet" size="sm" onClick={clearAllFilters}>
              {tSearch("clear_filters")}
            </Button>
          }
        />
      )}

      {/* Insufficient coins error banner — the phase's one named --danger
          exception outside destruction/overdue: an invisible error message
          is an accessibility defect, and this is a failed action, not a
          status badge. */}
      {coinError && (
        <p role="alert" className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--danger)]">
          {coinError}
        </p>
      )}

      {/* No open wishes (whether or not any bought/discarded items exist) */}
      {openItems.length === 0 && !isFiltering ? (
        <EmptyState
          line={t("view_empty_sub")}
          action={
            <Button
              variant="quiet"
              size="md"
              onClick={() => {
                setEditingItemId(null);
                setShowForm(true);
              }}
            >
              {t("view_add")}
            </Button>
          }
        />
      ) : openItems.length > 0 ? (
        <List>
          {openItems.map((item) => (
            <WishlistRow key={item.id} {...rowProps(item)} />
          ))}
        </List>
      ) : null}

      {/* History: bought + discarded, collapsed by default. One toggle for
          both — the label names whichever group is actually present, since
          the two groups are never both absent here (the section itself is
          gated on that). */}
      {(boughtItems.length > 0 || discardedItems.length > 0) && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="m-0 flex w-fit items-center gap-2 border-0 bg-transparent p-0 text-left font-[family-name:var(--font-ui)] text-sm font-medium text-[var(--ink-2)]"
          >
            <span
              className={cn(
                "inline-block transition-transform duration-150",
                showHistory ? "rotate-90" : "rotate-0",
              )}
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
            </span>
            {boughtItems.length > 0 ? (
              <span>
                {t("view_history")}{" "}
                <span className="font-semibold text-[var(--done)]">
                  ({boughtItems.length})
                </span>
              </span>
            ) : (
              <span>
                {t("card_discarded")} ({discardedItems.length})
              </span>
            )}
          </button>

          {showHistory && (
            <div className="flex flex-col gap-4">
              {/* Bought items */}
              {boughtItems.length > 0 && (
                <List>
                  {boughtItems.map((item) => (
                    <WishlistRow key={item.id} {...rowProps(item)} />
                  ))}
                </List>
              )}

              {/* Discarded items — own `List`; a `GroupHeading` only appears
                  as a sibling before it when a bought group precedes it in
                  the same disclosure, where it earns its keep as a
                  separator between two groups. When there is no bought
                  group, the toggle button above already names this section
                  ("Verworfen (N)") — a heading repeating the same word right
                  below it would name the section twice (Task 5 review
                  finding 1). Also standardised on `card_discarded`
                  ("Verworfen") here and in the toggle label above, instead
                  of the now-unused `view_discarded` ("Abgelegt") — the same
                  status word `wishlist-row.tsx`'s eyebrow already uses per
                  row (Task 5 review finding 2). */}
              {discardedItems.length > 0 && (
                <section>
                  {boughtItems.length > 0 && (
                    <GroupHeading>
                      {t("card_discarded")} ({discardedItems.length})
                    </GroupHeading>
                  )}
                  <List>
                    {discardedItems.map((item) => (
                      <WishlistRow key={item.id} {...rowProps(item)} />
                    ))}
                  </List>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit form modal */}
      {showForm && (
        <WishlistForm
          initialData={editingInitialData}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingItemId(null);
          }}
        />
      )}
    </PageFrame>
  );
}
