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

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BudgetBar } from "@/components/wishlist/budget-bar";
import { WishlistCard } from "@/components/wishlist/wishlist-card";
import { WishlistForm } from "@/components/wishlist/wishlist-form";
import { triggerSmallConfetti } from "@/components/animations/confetti";

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
  const [items, setItems] = useState<SerializedWishlistItem[]>(initialItems);
  const [budget, setBudget] = useState<SerializedBudgetSummary>(initialBudget);
  const [showForm, setShowForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Derive open vs history items
  const openItems = items.filter((i) => i.status === "OPEN");
  const historyItems = items.filter(
    (i) => i.status === "BOUGHT" || i.status === "DISCARDED"
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

  /** Mark an item as bought */
  const handleBuy = async (id: string) => {
    try {
      await fetch(`/api/wishlist/${id}/buy`, { method: "POST" });
      await refresh();
      triggerSmallConfetti();
    } catch {
      // no-op
    }
  };

  /** Revert a bought item to OPEN */
  const handleUnbuy = async (id: string) => {
    try {
      await fetch(`/api/wishlist/${id}/buy`, { method: "DELETE" });
      await refresh();
    } catch {
      // no-op
    }
  };

  /** Restore a discarded item back to OPEN */
  const handleUndiscard = async (id: string) => {
    try {
      await fetch(`/api/wishlist/${id}/discard`, { method: "DELETE" });
      await refresh();
    } catch {
      // no-op
    }
  };

  /** Mark an item as discarded */
  const handleDiscard = async (id: string) => {
    try {
      await fetch(`/api/wishlist/${id}/discard`, { method: "POST" });
      await refresh();
    } catch {
      // no-op
    }
  };

  /** Permanently delete an item */
  const handleDelete = async (id: string) => {
    if (!confirm(t("view_confirm_delete"))) return;
    try {
      await fetch(`/api/wishlist/${id}`, { method: "DELETE" });
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
          Wishlist
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

      {/* Open items grid */}
      {openItems.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-base"
            style={{
              fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              color: "var(--text-muted)",
            }}
          >
            {t("view_empty")}
          </p>
        </div>
      ) : (
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
              userCoins={userCoins}
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

      {/* History section */}
      {historyItems.length > 0 && (
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
              ▶
            </span>
            {t("view_history")} ({t("view_history_count", { count: historyItems.length })})
          </button>

          {showHistory && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {historyItems.map((item) => (
                <WishlistCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  price={item.price}
                  url={item.url}
                  priority={item.priority}
                  status={item.status}
                  coinUnlockThreshold={item.coinUnlockThreshold}
                  userCoins={userCoins}
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
