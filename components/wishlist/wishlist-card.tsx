"use client";

/**
 * WishlistCard component — displays a single wishlist item.
 *
 * Features:
 * - Title (bold, --font-body)
 * - Price (large, --accent-amber) or "No price"
 * - Priority badge: WANT = accent-red, NICE_TO_HAVE = accent-amber, SOMEDAY = muted
 * - URL link (if set): external link icon, truncated
 * - Affordability indicator (if price + budget set)
 * - Coin-unlock indicator (if threshold set and user coins < threshold)
 * - Action buttons: "Bought", "Discard", "Edit" (hover reveal)
 * - Bought/Discarded items: distinct visual treatment
 */

import { useState } from "react";
import { useTranslations } from "next-intl";

interface WishlistCardProps {
  id: string;
  title: string;
  price: string | null;
  url: string | null;
  priority: "WANT" | "NICE_TO_HAVE" | "SOMEDAY";
  status: "OPEN" | "BOUGHT" | "DISCARDED";
  coinUnlockThreshold: number | null;
  /** User's current coin balance for coin-unlock indicator */
  userCoins: number;
  /** Budget summary for affordability indicator */
  monthlyBudget: number | null;
  remainingBudget: number | null;
  /** Callbacks */
  onBuy: (id: string) => void;
  onUnbuy: (id: string) => void;
  onDiscard: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Priority badge visual styles for wishlist items (labels computed in component with i18n).
 */
const PRIORITY_STYLES = {
  WANT: {
    color: "var(--accent-red)",
    backgroundColor: "rgba(184,84,80,0.12)",
  },
  NICE_TO_HAVE: {
    color: "var(--accent-amber)",
    backgroundColor: "rgba(240,165,0,0.12)",
  },
  SOMEDAY: {
    color: "var(--text-muted)",
    backgroundColor: "rgba(122,144,127,0.12)",
  },
} as const;

/**
 * Renders a single wishlist item card with actions and affordability info.
 */
export function WishlistCard({
  id,
  title,
  price,
  url,
  priority,
  status,
  coinUnlockThreshold,
  userCoins,
  monthlyBudget,
  remainingBudget,
  onBuy,
  onUnbuy,
  onDiscard,
  onEdit,
  onDelete,
}: WishlistCardProps) {
  const t = useTranslations("wishlist");
  const [isLoading, setIsLoading] = useState(false);

  const PRIORITY_LABELS: Record<"WANT" | "NICE_TO_HAVE" | "SOMEDAY", string> = {
    WANT: t("priority_want"),
    NICE_TO_HAVE: t("priority_nice"),
    SOMEDAY: t("priority_someday"),
  };

  const isBought = status === "BOUGHT";
  const isDiscarded = status === "DISCARDED";
  const isOpen = status === "OPEN";

  const numericPrice = price !== null ? Number(price) : null;
  const priorityStyle = PRIORITY_STYLES[priority];
  const priorityLabel = PRIORITY_LABELS[priority];

  // Affordability: only relevant for OPEN items with a price and budget
  let affordability: "affordable" | "over" | "no-budget" | null = null;
  if (isOpen && numericPrice !== null) {
    if (monthlyBudget === null) {
      affordability = "no-budget";
    } else if (remainingBudget !== null && numericPrice <= remainingBudget) {
      affordability = "affordable";
    } else {
      affordability = "over";
    }
  }

  // Coin-unlock: only relevant when threshold is set
  const needsMoreCoins =
    isOpen &&
    coinUnlockThreshold !== null &&
    userCoins < coinUnlockThreshold;
  const coinsNeeded =
    coinUnlockThreshold !== null ? coinUnlockThreshold - userCoins : 0;

  const handleAction = async (action: () => void) => {
    setIsLoading(true);
    try {
      action();
    } finally {
      // Loading state is managed by parent refresh
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  // Card border: bought = green left border, discarded = normal border
  const cardStyle: React.CSSProperties = {
    backgroundColor: isDiscarded
      ? "var(--bg-surface)"
      : "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderLeft: isBought
      ? "3px solid var(--accent-green)"
      : isDiscarded
      ? "3px solid var(--border)"
      : "1px solid var(--border)",
    opacity: isDiscarded ? 0.5 : 1,
    transition: "box-shadow 0.15s ease, background-color 0.15s ease",
  };

  return (
    <div
      className="group relative rounded-xl p-4 flex flex-col gap-3"
      style={cardStyle}
    >
      {/* Status badge for bought items */}
      {isBought && (
        <div
          className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: "rgba(74,140,92,0.15)",
            color: "var(--accent-green)",
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          }}
        >
          {t("card_bought")}
        </div>
      )}

      {/* Title */}
      <div className="pr-16">
        <span
          className="text-sm font-semibold leading-snug"
          style={{
            fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
            color: isBought || isDiscarded
              ? "var(--text-muted)"
              : "var(--text-primary)",
            textDecoration: isDiscarded ? "line-through" : "none",
          }}
        >
          {title}
        </span>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-2">
        {numericPrice !== null ? (
          <span
            className="font-semibold"
            style={{
              fontSize: "1.5rem",
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: isBought || isDiscarded
                ? "var(--text-muted)"
                : "var(--accent-amber)",
            }}
          >
            €{numericPrice.toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ) : (
          <span
            className="text-sm"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("card_no_price")}
          </span>
        )}
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Priority badge */}
        <span
          className="text-xs px-1.5 py-0.5 rounded font-medium"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            ...priorityStyle,
          }}
        >
          {priorityLabel}
        </span>

        {/* Affordability indicator */}
        {affordability === "affordable" && (
          <span
            className="text-xs font-medium"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--accent-green)",
            }}
          >
            {t("card_affordable")}
          </span>
        )}
        {affordability === "over" && (
          <span
            className="text-xs font-medium"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--accent-red)",
            }}
          >
            {t("card_over_budget")}
          </span>
        )}
        {affordability === "no-budget" && (
          <span
            className="text-xs"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            —
          </span>
        )}

        {/* Coin-unlock indicator */}
        {needsMoreCoins && (
          <span
            className="text-xs"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--coin-gold)",
            }}
            title={t("card_locked", { coins: coinsNeeded })}
          >
            {t("card_locked", { coins: coinsNeeded })}
          </span>
        )}
      </div>

      {/* URL link */}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs truncate max-w-full"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--accent-amber)",
          }}
          title={url}
        >
          ↗ {url.replace(/^https?:\/\//, "").split("/")[0]}
        </a>
      )}

      {/* Action buttons — visible on hover for OPEN items, always for bought */}
      {!isDiscarded && (
        <div
          className={`flex items-center gap-2 pt-1 ${
            isOpen ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          } transition-opacity duration-150`}
        >
          {isOpen && (
            <>
              <button
                onClick={() => handleAction(() => onBuy(id))}
                disabled={isLoading}
                className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  backgroundColor: "rgba(74,140,92,0.15)",
                  color: "var(--accent-green)",
                  border: "1px solid rgba(74,140,92,0.3)",
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                {t("card_btn_bought")}
              </button>
              <button
                onClick={() => handleAction(() => onDiscard(id))}
                disabled={isLoading}
                className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  backgroundColor: "rgba(122,144,127,0.1)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                {t("card_btn_discard")}
              </button>
              <button
                onClick={() => onEdit(id)}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {t("card_btn_edit")}
              </button>
            </>
          )}
          {isBought && (
            <button
              onClick={() => handleAction(() => onUnbuy(id))}
              disabled={isLoading}
              className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              {t("card_btn_undo")}
            </button>
          )}
        </div>
      )}

      {/* Delete button for discarded items */}
      {isDiscarded && (
        <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={() => handleAction(() => onDelete(id))}
            disabled={isLoading}
            className="text-xs px-2.5 py-1 rounded-lg transition-colors"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--accent-red)",
              border: "1px solid rgba(184,84,80,0.3)",
              backgroundColor: "rgba(184,84,80,0.08)",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {t("card_btn_delete")}
          </button>
        </div>
      )}
    </div>
  );
}
