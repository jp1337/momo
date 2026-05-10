"use client";

/**
 * WishlistView — interactive client component for the wishlist page.
 *
 * Manages all client-side state for wishlist items and budget.
 * Handles CRUD operations via API calls and triggers re-renders.
 *
 * Layout:
 * - BudgetBar at the top
 * - Open items grid (2-3 cols on desktop, 1 on mobile)
 * - History section (bought + discarded, collapsed by default)
 */

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faChevronRight, faGift } from "@fortawesome/free-solid-svg-icons";
import { BudgetBar } from "@/components/wishlist/budget-bar";
import { WishlistCard } from "@/components/wishlist/wishlist-card";
import { WishlistForm } from "@/components/wishlist/wishlist-form";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import type { FilterGroup } from "@/components/shared/search-filter-bar";
import { triggerSmallConfetti } from "@/components/animations/confetti";
import { dispatchCoinsEarned } from "@/lib/client/coin-events";

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
  initialItems: SerializedWishlistItem[];
  initialBudget: SerializedBudgetSummary;
  userCoins: number;
}

/**
 * Main interactive wishlist view.
 * Owns all local state for items, budget, and modal visibility.
 */
export function WishlistView({
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

  return (
    <div className="flex flex-col gap-8">
      {/* Budget bar */}
      <BudgetBar
        monthlyBudget={budget.monthlyBudget}
        spentThisMonth={budget.spentThisMonth}
        remaining={budget.remaining}
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

      {/* Add item button */}
      <div className="flex items-center justify-between">
        <h2
          className="text-xl font-semibold"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-primary)",
          }}
        >
          {t("page_title")}
          {openItems.length > 0 && (
            <span
              className="ml-2 text-sm font-normal"
              style={{ color: "var(--text-muted)" }}
            >
              ({openItems.length})
            </span>
          )}
        </h2>
        <button
          onClick={() => {
            setEditingItemId(null);
            setShowForm(true);
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            backgroundColor: "var(--accent-amber)",
            color: "var(--bg-primary)",
          }}
        >
          {t("view_add")}
        </button>
      </div>

      {/* Search & Filter bar — only shown when there are items */}
      {items.length > 0 && (
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder={tSearch("placeholder_wishlist")}
          filters={filterGroups}
          activeFilters={{ priority: priorityFilter }}
          onFilterChange={handleFilterChange}
          resultCount={filteredItems.length}
          totalCount={items.length}
          onClearAll={clearAllFilters}
        />
      )}

      {/* No results from search/filter */}
      {items.length > 0 && filteredItems.length === 0 && isFiltering && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px dashed var(--border)",
          }}
        >
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="text-2xl mb-3"
            style={{ color: "var(--text-muted)" }}
          />
          <p
            className="text-base font-medium mb-1"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {tSearch("no_results_wishlist")}
          </p>
          <p
            className="text-sm mb-4"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {tSearch("no_results_hint")}
          </p>
          <button
            onClick={clearAllFilters}
            className="text-sm font-medium underline transition-opacity hover:opacity-80"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--accent-amber)",
            }}
          >
            {tSearch("clear_filters")}
          </button>
        </div>
      )}

      {/* Insufficient coins error banner */}
      {coinError && (
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            backgroundColor: "color-mix(in srgb, var(--accent-red) 12%, transparent)",
            color: "var(--accent-red)",
            border: "1px solid color-mix(in srgb, var(--accent-red) 25%, transparent)",
          }}
        >
          {coinError}
        </div>
      )}

      {/* Open items grid */}
      {openItems.length === 0 && !isFiltering ? (
        <div
          className="relative rounded-2xl p-12 sm:p-16 text-center overflow-hidden"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px dashed var(--border)",
          }}
        >
          {/* Soft amber halo behind the icon — same atmospheric pattern as the tasks empty state */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "20%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "240px",
              height: "240px",
              borderRadius: "50%",
              background: "radial-gradient(circle, color-mix(in srgb, var(--accent-amber) 12%, transparent) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            className="relative mx-auto mb-5 flex items-center justify-center"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              backgroundColor: "color-mix(in srgb, var(--accent-amber) 14%, transparent)",
            }}
            role="img"
            aria-label="Gift"
          >
            <FontAwesomeIcon icon={faGift} style={{ fontSize: 28, color: "var(--accent-amber)" }} />
          </div>
          <p
            className="relative text-xl font-semibold mb-2"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              fontStyle: "italic",
              color: "var(--text-primary)",
            }}
          >
            {t("view_empty")}
          </p>
          <p
            className="relative text-sm max-w-sm mx-auto"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            {t("view_empty_sub")}
          </p>
        </div>
      ) : openItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {openItems.map((item) => (
            <WishlistCard
              key={item.id}
              id={item.id}
              title={item.title}
              price={item.price}
              url={item.url}
              priority={item.priority}
              status={item.status}
              coinUnlockThreshold={item.coinUnlockThreshold}
              userCoins={coins}
              monthlyBudget={budget.monthlyBudget}
              remainingBudget={budget.remaining}
              onBuy={handleBuy}
              onUnbuy={handleUnbuy}
              onDiscard={handleDiscard}
              onUndiscard={handleUndiscard}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : null}

      {/* Bought gallery — shown when there are purchased items */}
      {historyItems.filter((i) => i.status === "BOUGHT").length > 0 && (
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-medium"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textAlign: "left",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: showHistory ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
            >
              <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 9 }} />
            </span>
            <span>
              {t("view_history")}{" "}
              <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>
                ({historyItems.filter((i) => i.status === "BOUGHT").length})
              </span>
            </span>
          </button>

          {showHistory && (
            <div className="flex flex-col gap-3">
              {/* Bought items — compact green-tinted row layout */}
              {historyItems
                .filter((i) => i.status === "BOUGHT")
                .map((item) => (
                  <WishlistCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    price={item.price}
                    url={item.url}
                    priority={item.priority}
                    status={item.status}
                    coinUnlockThreshold={item.coinUnlockThreshold}
                    userCoins={coins}
                    monthlyBudget={budget.monthlyBudget}
                    remainingBudget={budget.remaining}
                    onBuy={handleBuy}
                    onUnbuy={handleUnbuy}
                    onDiscard={handleDiscard}
                    onUndiscard={handleUndiscard}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}

              {/* Discarded items — even more muted */}
              {historyItems.filter((i) => i.status === "DISCARDED").length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  <p
                    className="text-xs uppercase tracking-widest"
                    style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}
                  >
                    {t("view_discarded")}
                  </p>
                  {historyItems
                    .filter((i) => i.status === "DISCARDED")
                    .map((item) => (
                      <WishlistCard
                        key={item.id}
                        id={item.id}
                        title={item.title}
                        price={item.price}
                        url={item.url}
                        priority={item.priority}
                        status={item.status}
                        coinUnlockThreshold={item.coinUnlockThreshold}
                        userCoins={coins}
                        monthlyBudget={budget.monthlyBudget}
                        remainingBudget={budget.remaining}
                        onBuy={handleBuy}
                        onUnbuy={handleUnbuy}
                        onDiscard={handleDiscard}
                        onUndiscard={handleUndiscard}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Discarded-only section when no bought items */}
      {historyItems.filter((i) => i.status === "BOUGHT").length === 0 &&
        historyItems.filter((i) => i.status === "DISCARDED").length > 0 && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setShowHistory((prev) => !prev)}
              className="flex items-center gap-2 text-sm font-medium"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span style={{ display: "inline-block", transform: showHistory ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}>
                <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 9 }} />
              </span>
              {t("view_discarded")} ({historyItems.filter((i) => i.status === "DISCARDED").length})
            </button>
            {showHistory && (
              <div className="flex flex-col gap-2">
                {historyItems
                  .filter((i) => i.status === "DISCARDED")
                  .map((item) => (
                    <WishlistCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      price={item.price}
                      url={item.url}
                      priority={item.priority}
                      status={item.status}
                      coinUnlockThreshold={item.coinUnlockThreshold}
                      userCoins={coins}
                      monthlyBudget={budget.monthlyBudget}
                      remainingBudget={budget.remaining}
                      onBuy={handleBuy}
                      onUnbuy={handleUnbuy}
                      onDiscard={handleDiscard}
                      onUndiscard={handleUndiscard}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
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
    </div>
  );
}
