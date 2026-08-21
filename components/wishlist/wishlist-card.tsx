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
 * - Coin progress ring (SVG) when threshold is set — shows % of coins earned toward goal
 * - Action buttons: "Bought", "Discard", "Edit" (always visible)
 * - Swipe gestures (OPEN items only): right = buy (green), left = discard (red)
 * - Bought/Discarded items: distinct visual treatment, no swipe
 */

import { useState, useRef } from "react";
import { motion } from "motion/react";
import { useTranslations, useLocale } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink, faPen, faXmark } from "@fortawesome/free-solid-svg-icons";

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
  onUndiscard: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_STYLES = {
  WANT: {
    color: "var(--accent-red)",
    backgroundColor: "color-mix(in srgb, var(--accent-red) 15%, transparent)",
    border: "1px solid color-mix(in srgb, var(--accent-red) 25%, transparent)",
  },
  NICE_TO_HAVE: {
    color: "var(--accent-amber)",
    backgroundColor: "color-mix(in srgb, var(--accent-amber) 15%, transparent)",
    border: "1px solid color-mix(in srgb, var(--accent-amber) 25%, transparent)",
  },
  SOMEDAY: {
    color: "var(--text-muted)",
    backgroundColor: "color-mix(in srgb, var(--text-muted) 12%, transparent)",
    border: "1px solid color-mix(in srgb, var(--text-muted) 20%, transparent)",
  },
} as const;

/** SVG coin progress ring — shows % of coins earned toward the unlock threshold. */
function CoinProgressRing({
  userCoins,
  threshold,
}: {
  userCoins: number;
  threshold: number;
}) {
  const SIZE = 52;
  const R = 21;
  const CIRC = 2 * Math.PI * R;
  const progress = Math.min(1, userCoins / threshold);
  const dashOffset = CIRC * (1 - progress);
  const isDone = progress >= 1;
  const pct = Math.round(progress * 100);

  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE, flexShrink: 0 }}>
      <svg
        width={SIZE}
        height={SIZE}
        style={{ transform: "rotate(-90deg)" }}
        aria-label={`${pct}% gespart`}
      >
        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--border)"
          strokeWidth={3.5}
        />
        {/* Progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={isDone ? "var(--accent-green)" : "var(--coin-gold)"}
          strokeWidth={3.5}
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
        />
      </svg>
      {/* Center label */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        <span
          style={{
            fontSize: "7px",
            lineHeight: 1,
            fontWeight: 700,
            color: isDone ? "var(--accent-green)" : "var(--coin-gold)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {pct}%
        </span>
        <span style={{ fontSize: "11px", lineHeight: 1, marginTop: 1 }}>🪙</span>
      </div>
    </div>
  );
}

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
  onUndiscard,
  onEdit,
  onDelete,
}: WishlistCardProps) {
  const t = useTranslations("wishlist");
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 80;
  const SWIPE_MAX = 110;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isOpen) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(deltaY) > Math.abs(deltaX) + 10) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    setIsSwiping(true);
    setSwipeX(Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, deltaX)));
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null) {
      if (swipeX > SWIPE_THRESHOLD && !needsMoreCoins) {
        handleAction(() => onBuy(id));
      } else if (swipeX < -SWIPE_THRESHOLD) {
        handleAction(() => onDiscard(id));
      }
    }
    setSwipeX(0);
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
  };

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

  // Affordability
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

  // Coin-unlock
  const hasCoinThreshold = coinUnlockThreshold !== null && coinUnlockThreshold > 0;
  const needsMoreCoins = isOpen && hasCoinThreshold && userCoins < coinUnlockThreshold!;
  const coinsNeeded = hasCoinThreshold ? coinUnlockThreshold! - userCoins : 0;
  const coinProgress = hasCoinThreshold ? Math.min(1, userCoins / coinUnlockThreshold!) : 0;

  const handleAction = async (action: () => void) => {
    setIsLoading(true);
    try {
      action();
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderLeft: isBought
      ? "3px solid var(--accent-green)"
      : isDiscarded
        ? "3px solid var(--border)"
        : "1px solid var(--border)",
    opacity: isDiscarded ? 0.55 : 1,
  };

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: "1rem" }}>
      {/* Right-swipe reveal: buy */}
      {isOpen && (
        <div
          className="absolute inset-y-0 left-0 flex items-center gap-2 px-5"
          style={{
            backgroundColor: "var(--accent-green)",
            opacity: Math.max(0, Math.min(swipeX / SWIPE_THRESHOLD, 1)),
            color: "var(--bg-primary)",
            minWidth: "90px",
            pointerEvents: "none",
          }}
        >
          <svg width="16" height="13" viewBox="0 0 10 8" fill="none" aria-hidden="true">
            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {swipeX > 40 && (
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "0.75rem", fontWeight: 600 }}>
              {t("card_bought")}
            </span>
          )}
        </div>
      )}

      {/* Left-swipe reveal: discard */}
      {isOpen && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end gap-2 px-5"
          style={{
            backgroundColor: "var(--accent-red)",
            opacity: Math.max(0, Math.min(-swipeX / SWIPE_THRESHOLD, 0.8)),
            color: "var(--bg-primary)",
            minWidth: "90px",
            pointerEvents: "none",
          }}
        >
          {-swipeX > 40 && (
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "0.75rem", fontWeight: 600 }}>
              {t("card_btn_discard")}
            </span>
          )}
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      )}

      <motion.div
        animate={{ x: swipeX }}
        transition={
          isSwiping
            ? { duration: 0 }
            : { type: "spring", stiffness: 400, damping: 35 }
        }
        className="group relative rounded-2xl p-5 flex flex-col gap-4 card-hover"
        style={{
          ...cardStyle,
          touchAction: isOpen ? "pan-y" : "auto",
          position: "relative",
          zIndex: 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── Header row: title + coin ring + edit/delete ──────────────────── */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <span
              className="font-semibold leading-snug"
              style={{
                fontSize: "0.9375rem",
                fontFamily: "var(--font-body)",
                color:
                  isBought || isDiscarded
                    ? "var(--text-muted)"
                    : "var(--text-primary)",
                textDecoration: isDiscarded ? "line-through" : "none",
                display: "block",
                overflowWrap: "break-word",
                wordBreak: "break-word",
              }}
            >
              {title}
            </span>

            {/* Status badges */}
            {isBought && (
              <span
                className="inline-block text-xs px-2 py-0.5 rounded-full font-medium w-fit"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--accent-green) 18%, transparent)",
                  color: "var(--accent-green)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                ✓ {t("card_bought")}
              </span>
            )}
            {isDiscarded && (
              <span
                className="inline-block text-xs px-2 py-0.5 rounded-full font-medium w-fit"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--text-muted) 12%, transparent)",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {t("card_discarded")}
              </span>
            )}
          </div>

          {/* Coin progress ring — shown when threshold is set on open items */}
          {isOpen && hasCoinThreshold && (
            <CoinProgressRing
              userCoins={userCoins}
              threshold={coinUnlockThreshold!}
            />
          )}

          {/* Edit + Delete */}
          <div className="flex gap-0.5 flex-shrink-0 items-center">
            {confirmingDelete ? (
              <>
                <button
                  onClick={() => {
                    setConfirmingDelete(false);
                    handleAction(() => onDelete(id));
                  }}
                  disabled={isLoading}
                  className="text-xs px-2 py-0.5 rounded font-medium transition-colors"
                  style={{
                    fontFamily: "var(--font-ui)",
                    backgroundColor: "color-mix(in srgb, var(--accent-red) 15%, transparent)",
                    color: "var(--accent-red)",
                    border: "1px solid color-mix(in srgb, var(--accent-red) 30%, transparent)",
                  }}
                  aria-label={t("card_btn_delete_confirm")}
                >
                  {t("card_btn_delete_confirm")}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs px-2 py-0.5 rounded font-medium transition-colors ml-1"
                  style={{
                    fontFamily: "var(--font-ui)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                  aria-label={t("card_btn_delete_cancel")}
                >
                  {t("card_btn_delete_cancel")}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onEdit(id)}
                  className="p-2 rounded-lg transition-colors hover:opacity-70"
                  style={{ color: "var(--text-muted)" }}
                  aria-label={t("card_btn_edit")}
                  title={t("card_btn_edit")}
                >
                  <FontAwesomeIcon icon={faPen} style={{ fontSize: 11 }} />
                </button>
                <button
                  onClick={() => setConfirmingDelete(true)}
                  disabled={isLoading}
                  className="p-2 rounded-lg transition-colors hover:opacity-70"
                  style={{
                    color: "var(--accent-red)",
                    cursor: isLoading ? "not-allowed" : "pointer",
                  }}
                  aria-label={t("card_btn_delete")}
                  title={t("card_btn_delete")}
                >
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: 12 }} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Price ──────────────────────────────────────────────────────────── */}
        {numericPrice !== null ? (
          <div className="flex items-baseline gap-2">
            <span
              className="font-semibold"
              style={{
                fontSize: "1.625rem",
                lineHeight: 1,
                fontFamily: "var(--font-ui)",
                color:
                  isBought || isDiscarded
                    ? "var(--text-muted)"
                    : "var(--accent-amber)",
              }}
            >
              €
              {numericPrice.toLocaleString(locale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            {affordability === "affordable" && isOpen && (
              <span
                className="text-xs font-medium"
                style={{
                  fontFamily: "var(--font-ui)",
                  color: "var(--accent-green)",
                }}
              >
                {t("card_affordable")}
              </span>
            )}
            {affordability === "over" && isOpen && (
              <span
                className="text-xs font-medium"
                style={{
                  fontFamily: "var(--font-ui)",
                  color: "var(--accent-red)",
                }}
              >
                {t("card_over_budget")}
              </span>
            )}
          </div>
        ) : (
          <span
            className="text-sm"
            style={{
              fontFamily: "var(--font-ui)",
              color: "var(--text-muted)",
            }}
          >
            {t("card_no_price")}
          </span>
        )}

        {/* ── Coin-unlock progress banner (aspirational) ─────────────────────── */}
        {isOpen && hasCoinThreshold && (
          <div
            className="rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{
              backgroundColor: needsMoreCoins
                ? "color-mix(in srgb, var(--coin-gold) 8%, transparent)"
                : "color-mix(in srgb, var(--accent-green) 10%, transparent)",
              border: `1px solid ${
                needsMoreCoins
                  ? "color-mix(in srgb, var(--coin-gold) 22%, transparent)"
                  : "color-mix(in srgb, var(--accent-green) 22%, transparent)"
              }`,
            }}
          >
            {/* Progress bar */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-medium"
                  style={{
                    fontFamily: "var(--font-ui)",
                    color: needsMoreCoins ? "var(--coin-gold)" : "var(--accent-green)",
                  }}
                >
                  {needsMoreCoins
                    ? t("card_locked", { coins: coinsNeeded })
                    : t("card_unlockable")}
                </span>
                <span
                  className="text-xs"
                  style={{
                    fontFamily: "var(--font-ui)",
                    color: "var(--text-muted)",
                  }}
                >
                  {userCoins} / {coinUnlockThreshold} 🪙
                </span>
              </div>
              {/* Linear progress bar */}
              <div
                className="rounded-full overflow-hidden"
                style={{ height: 4, backgroundColor: "var(--border)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(coinProgress * 100)}%`,
                    backgroundColor: needsMoreCoins
                      ? "var(--coin-gold)"
                      : "var(--accent-green)",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Metadata row ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority badge */}
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              fontFamily: "var(--font-ui)",
              ...priorityStyle,
            }}
          >
            {priorityLabel}
          </span>

          {/* URL link */}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--text-muted)",
              }}
              title={url}
            >
              <FontAwesomeIcon icon={faLink} style={{ fontSize: 10 }} />
              {url.replace(/^https?:\/\//, "").split("/")[0]}
            </a>
          )}
        </div>

        {/* ── Action buttons ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {isOpen && (
            <>
              <button
                onClick={() => handleAction(() => onBuy(id))}
                disabled={isLoading || needsMoreCoins}
                className="text-sm px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{
                  fontFamily: "var(--font-ui)",
                  backgroundColor: needsMoreCoins
                    ? "color-mix(in srgb, var(--text-muted) 10%, transparent)"
                    : "color-mix(in srgb, var(--accent-green) 18%, transparent)",
                  color: needsMoreCoins
                    ? "var(--text-muted)"
                    : "var(--accent-green)",
                  border: needsMoreCoins
                    ? "1px solid var(--border)"
                    : "1px solid color-mix(in srgb, var(--accent-green) 30%, transparent)",
                  cursor: isLoading || needsMoreCoins ? "not-allowed" : "pointer",
                  opacity: needsMoreCoins ? 0.55 : 1,
                }}
                title={needsMoreCoins ? t("card_locked", { coins: coinsNeeded }) : undefined}
              >
                {hasCoinThreshold
                  ? t("buy_with_coins", { coins: coinUnlockThreshold })
                  : t("card_btn_bought")}
              </button>
              <button
                onClick={() => handleAction(() => onDiscard(id))}
                disabled={isLoading}
                className="text-sm px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{
                  fontFamily: "var(--font-ui)",
                  backgroundColor: "color-mix(in srgb, var(--text-muted) 8%, transparent)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                {t("card_btn_discard")}
              </button>
            </>
          )}
          {isBought && (
            <button
              onClick={() => handleAction(() => onUnbuy(id))}
              disabled={isLoading}
              className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              {t("card_btn_undo")}
            </button>
          )}
          {isDiscarded && (
            <button
              onClick={() => handleAction(() => onUndiscard(id))}
              disabled={isLoading}
              className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              {t("card_btn_restore")}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
