"use client";

/**
 * TaskItem component — renders a single task row in the task list.
 *
 * Features:
 * - Checkbox to complete/uncomplete the task (with animated strikethrough)
 * - Double-click on title for inline editing (Enter/blur saves, Escape cancels)
 * - Priority badge (HIGH = red, NORMAL = amber, SOMEDAY = muted)
 * - Topic tag (if task belongs to a topic)
 * - Due date display (overdue dates in red)
 * - Recurring task indicator icon
 * - Edit and delete action buttons (larger, easier to hit)
 * - Framer Motion fade animation on completion
 */

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins, faLayerGroup, faClock } from "@fortawesome/free-solid-svg-icons";
import { TaskBreakdownModal } from "@/components/tasks/task-breakdown-modal";

interface TaskItemProps {
  id: string;
  title: string;
  type: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  completedAt: string | null;
  dueDate?: string | null;
  nextDueDate?: string | null;
  topicTitle?: string | null;
  topicColor?: string | null;
  coinValue: number;
  topicId?: string | null;
  postponeCount?: number;
  estimatedMinutes?: number | null;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  /** Called after inline title edit is saved */
  onInlineEdit?: (id: string, newTitle: string) => void;
  /** Called when the user promotes a standalone task to a topic (topicId === null) */
  onPromote?: (id: string) => void;
  /** Called when the user wants to navigate to the task's existing topic (topicId !== null) */
  onGoToTopic?: (topicId: string) => void;
  /** Called after a successful task breakdown (task is deleted) */
  onBreakdown?: (id: string) => void;
  /** Date until which this task is snoozed (YYYY-MM-DD), or null */
  snoozedUntil?: string | null;
  /** Called when the user snoozes a task until a specific date */
  onSnooze?: (id: string, snoozedUntil: string) => void;
  /** Called when the user unsnoozes (wakes up) a snoozed task */
  onUnsnooze?: (id: string) => void;
}

/**
 * Single task row with checkbox, title, badges, and action buttons.
 * Double-clicking the title enters inline edit mode.
 */
export function TaskItem({
  id,
  title,
  type,
  priority,
  completedAt,
  dueDate,
  nextDueDate,
  topicTitle,
  topicColor,
  topicId,
  coinValue,
  postponeCount = 0,
  estimatedMinutes,
  onComplete,
  onUncomplete,
  onEdit,
  onDelete,
  onInlineEdit,
  onPromote,
  onGoToTopic,
  onBreakdown,
  snoozedUntil,
  onSnooze,
  onUnsnooze,
}: TaskItemProps) {
  const t = useTranslations("tasks");

  const [isAnimating, setIsAnimating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 80;
  const SWIPE_MAX = 110;

  const isCompleted = completedAt !== null;

  /**
   * Priority badge label and style mappings.
   * Defined inside the component so labels are resolved through t().
   */
  const PRIORITY_CONFIG = {
    HIGH: {
      label: t("priority_high"),
      style: {
        color: "var(--accent-red)",
        backgroundColor: "color-mix(in srgb, var(--accent-red) 15%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent-red) 25%, transparent)",
      },
    },
    NORMAL: {
      label: t("priority_normal"),
      style: {
        color: "var(--accent-amber)",
        backgroundColor: "color-mix(in srgb, var(--accent-amber) 15%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent-amber) 25%, transparent)",
      },
    },
    SOMEDAY: {
      label: t("priority_someday"),
      style: {
        color: "var(--text-muted)",
        backgroundColor: "color-mix(in srgb, var(--text-muted) 12%, transparent)",
        border: "1px solid color-mix(in srgb, var(--text-muted) 20%, transparent)",
      },
    },
  } as const;

  /**
   * Formats a YYYY-MM-DD date string for display.
   * Returns "Overdue" styling data if the date is in the past.
   * Defined inside the component so it can use t() for translated labels.
   */
  function formatDueDate(dateStr: string): { text: string; overdue: boolean } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr + "T00:00:00");

    if (due < today) {
      const diffDays = Math.floor(
        (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        text: diffDays === 1 ? t("date_yesterday") : t("date_overdue", { days: diffDays }),
        overdue: true,
      };
    }

    if (due.getTime() === today.getTime()) {
      return { text: t("date_today"), overdue: false };
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (due.getTime() === tomorrow.getTime()) {
      return { text: t("date_tomorrow"), overdue: false };
    }

    return {
      text: due.toLocaleDateString("de-DE", { month: "short", day: "numeric" }),
      overdue: false,
    };
  }

  const priorityCfg = PRIORITY_CONFIG[priority];
  const displayDate = type === "RECURRING" ? nextDueDate : dueDate;

  const handleCheckboxChange = async () => {
    if (isCompleted) {
      onUncomplete(id);
      return;
    }
    setIsAnimating(true);
    setTimeout(() => {
      onComplete(id);
      setIsAnimating(false);
    }, 300);
  };

  /** Begin tracking a potential horizontal swipe gesture. */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditing || isCompleted) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  /**
   * Update swipe offset while the finger moves.
   * Cancels if the gesture is more vertical than horizontal (page scroll).
   */
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    // If mostly vertical → abort so the page can scroll
    if (Math.abs(deltaY) > Math.abs(deltaX) + 10) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    setIsSwiping(true);
    setSwipeX(Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, deltaX)));
  };

  /** Commit the swipe action or snap back if below threshold. */
  const handleTouchEnd = () => {
    if (touchStartX.current !== null) {
      if (swipeX > SWIPE_THRESHOLD) {
        handleCheckboxChange(); // complete
      } else if (swipeX < -SWIPE_THRESHOLD) {
        onDelete(id); // delete
      }
    }
    setSwipeX(0);
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleTitleDoubleClick = () => {
    if (isCompleted || !onInlineEdit) return;
    setEditValue(title);
    setIsEditing(true);
    // Focus input on next tick after render
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitInlineEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) {
      onInlineEdit?.(id, trimmed);
    }
    setIsEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitInlineEdit();
    } else if (e.key === "Escape") {
      setEditValue(title);
      setIsEditing(false);
    }
  };

  const isSnoozed = snoozedUntil != null && new Date(snoozedUntil + "T00:00:00") > new Date(new Date().toDateString());

  /** Computes a YYYY-MM-DD date string N days from now */
  function daysFromNow(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  /** Format a YYYY-MM-DD string as a short localized date for the badge */
  function formatSnoozeDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: "0.5rem" }}>
      {/* Right-swipe reveal: complete (green) */}
      {!isCompleted && (
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
            <span style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", fontSize: "0.75rem", fontWeight: 600 }}>
              Erledigt
            </span>
          )}
        </div>
      )}

      {/* Left-swipe reveal: delete (red) */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end gap-2 px-5"
        style={{
          backgroundColor: "var(--accent-red)",
          opacity: Math.max(0, Math.min(-swipeX / SWIPE_THRESHOLD, 1)),
          color: "var(--bg-primary)",
          minWidth: "90px",
          pointerEvents: "none",
        }}
      >
        {-swipeX > 40 && (
          <span style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", fontSize: "0.75rem", fontWeight: 600 }}>
            Löschen
          </span>
        )}
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>

    <motion.div
      layout
      initial={{ opacity: 1 }}
      animate={{ opacity: isAnimating ? 0.4 : isCompleted ? 0.6 : 1, x: swipeX }}
      transition={{
        opacity: { duration: 0.25 },
        x: isSwiping ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 35 },
      }}
      className="group flex items-start gap-3 px-4 py-3 rounded-lg transition-colors"
      style={{
        backgroundColor: isCompleted ? "transparent" : "var(--bg-surface)",
        border: "1px solid var(--border)",
        touchAction: isCompleted ? "auto" : "pan-y",
        position: "relative",
        zIndex: 1,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Checkbox */}
      <button
        onClick={handleCheckboxChange}
        className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 cursor-pointer"
        style={{
          borderColor: isCompleted ? "var(--accent-green)" : "var(--border)",
          backgroundColor: isCompleted ? "var(--accent-green)" : "transparent",
        }}
        aria-label={isCompleted ? t("aria_uncomplete") : t("aria_complete")}
      >
        {isCompleted && (
          <svg
            width="10"
            height="8"
            viewBox="0 0 10 8"
            fill="none"
            style={{ color: "var(--bg-primary)" }}
          >
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Main content — flex-1 so the edit/delete cluster stays at top-right */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Title — double-click to edit inline */}
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitInlineEdit}
              onKeyDown={handleInputKeyDown}
              className="text-sm rounded px-1 py-0.5 outline-none min-w-0 flex-1"
              style={{
                fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                color: "var(--text-primary)",
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--accent-amber)",
              }}
              autoFocus
            />
          ) : (
            <span
              className="text-sm task-text transition-all duration-200 cursor-text min-w-0 flex-1"
              title={title}
              onDoubleClick={handleTitleDoubleClick}
              style={{
                color: isCompleted ? "var(--text-muted)" : "var(--text-primary)",
                textDecoration: isCompleted ? "line-through" : "none",
                fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              }}
            >
              {title}
            </span>
          )}

          {/* Recurring indicator */}
          {type === "RECURRING" && (
            <span
              className="text-xs flex-shrink-0"
              title={t("aria_recurring")}
              aria-label={t("aria_recurring")}
              style={{ color: "var(--text-muted)" }}
            >
              ↺
            </span>
          )}

          {/* DAILY_ELIGIBLE indicator */}
          {type === "DAILY_ELIGIBLE" && (
            <span
              className="text-xs flex-shrink-0"
              title={t("aria_daily_eligible")}
              aria-label={t("aria_daily_eligible")}
              style={{ color: "var(--accent-amber)" }}
            >
              ★
            </span>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {/* Priority badge */}
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              ...priorityCfg.style,
            }}
          >
            {priorityCfg.label}
          </span>

          {/* Topic tag */}
          {topicTitle && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: topicColor ?? "var(--text-muted)",
                backgroundColor: topicColor
                  ? `${topicColor}22`
                  : "rgba(122,144,127,0.12)",
                border: `1px solid ${topicColor ?? "var(--border)"}44`,
              }}
            >
              {topicTitle}
            </span>
          )}

          {/* Due date */}
          {displayDate && (() => {
            const { text, overdue } = formatDueDate(displayDate);
            return (
              <span
                className="text-xs"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: overdue ? "var(--accent-red)" : "var(--text-muted)",
                }}
              >
                {type === "RECURRING" ? t("date_next", { date: text }) : text}
              </span>
            );
          })()}

          {/* Coin value */}
          {coinValue > 1 && (
            <span
              className="text-xs inline-flex items-center gap-1"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: postponeCount >= 3 ? "var(--accent-amber)" : "var(--coin-gold)",
              }}
            >
              {postponeCount >= 3 ? `+${coinValue * 2}` : `+${coinValue}`}{" "}
              <FontAwesomeIcon icon={faCoins} className="w-3 h-3" aria-hidden="true" />
            </span>
          )}

          {/* Time estimate badge */}
          {estimatedMinutes !== null && estimatedMinutes !== undefined && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--accent-green)",
                backgroundColor: "color-mix(in srgb, var(--accent-green) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--accent-green) 20%, transparent)",
              }}
            >
              {estimatedMinutes} min
            </span>
          )}

          {/* Often postponed badge */}
          {postponeCount >= 3 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--accent-red)",
                backgroundColor: "color-mix(in srgb, var(--accent-red) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--accent-red) 20%, transparent)",
              }}
            >
              {t("badge_postponed")}
            </span>
          )}

          {/* Snoozed until badge */}
          {isSnoozed && snoozedUntil && (
            <span
              className="text-xs px-1.5 py-0.5 rounded inline-flex items-center gap-1"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
                backgroundColor: "color-mix(in srgb, var(--text-muted) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--text-muted) 20%, transparent)",
              }}
            >
              <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5" aria-hidden="true" />
              {t("snooze_until", { date: formatSnoozeDate(snoozedUntil) })}
            </span>
          )}
        </div>

        {/* Secondary action buttons — contextual only (promote, goto-topic, breakdown, snooze) */}
        {(topicId === null && onPromote) || (topicId && onGoToTopic) || (!isCompleted && onBreakdown) || (!isCompleted && onSnooze) ? (
          <div className="flex items-center gap-1 mt-2 -ml-1">
            {/* Promote to topic — only for standalone tasks */}
            {topicId === null && onPromote && (
              <button
                onClick={() => onPromote(id)}
                className="p-1.5 rounded-lg transition-colors"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                }}
                aria-label={t("aria_promote")}
                title={t("aria_promote")}
              >
                ⤴
              </button>
            )}
            {/* Go to topic — for tasks that already belong to a topic */}
            {topicId && onGoToTopic && (
              <button
                onClick={() => onGoToTopic(topicId)}
                className="p-1.5 rounded-lg transition-colors"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                }}
                aria-label={t("aria_go_topic")}
                title={t("aria_go_topic")}
              >
                →
              </button>
            )}
            {/* Breakdown button — only for non-completed tasks */}
            {!isCompleted && onBreakdown && (
              <button
                onClick={() => setShowBreakdownModal(true)}
                className="p-1.5 rounded-lg transition-colors"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                }}
                aria-label={t("breakdown_btn")}
                title={t("breakdown_btn")}
              >
                <FontAwesomeIcon icon={faLayerGroup} className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
            {/* Snooze / Unsnooze — only for non-completed tasks */}
            {!isCompleted && onSnooze && (
              isSnoozed && onUnsnooze ? (
                <button
                  onClick={() => onUnsnooze(id)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{
                    color: "var(--accent-amber)",
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  }}
                  aria-label={t("unsnooze_btn")}
                  title={t("unsnooze_btn")}
                >
                  <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5" />
                </button>
              ) : !isSnoozed ? (
                <div className="relative">
                  <button
                    onClick={() => setShowSnoozeMenu((v) => !v)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    }}
                    aria-label={t("snooze_btn")}
                    title={t("snooze_btn")}
                  >
                    <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5" />
                  </button>
                  {showSnoozeMenu && (
                    <>
                      {/* Backdrop to close menu */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSnoozeMenu(false)}
                      />
                      <div
                        className="absolute left-0 top-full mt-1 z-50 py-1 rounded-lg shadow-lg min-w-[160px]"
                        style={{
                          backgroundColor: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {[
                          { label: t("snooze_tomorrow"), days: 1 },
                          { label: t("snooze_next_week"), days: 7 },
                          { label: t("snooze_next_month"), days: 30 },
                        ].map(({ label, days }) => (
                          <button
                            key={days}
                            onClick={() => {
                              onSnooze(id, daysFromNow(days));
                              setShowSnoozeMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm transition-colors hover:opacity-80"
                            style={{
                              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {label}
                          </button>
                        ))}
                        <div style={{ borderTop: "1px solid var(--border)", margin: "2px 0" }} />
                        <label
                          className="w-full text-left px-3 py-2 text-sm cursor-pointer block transition-colors hover:opacity-80"
                          style={{
                            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {t("snooze_pick_date")}
                          <input
                            type="date"
                            className="sr-only"
                            min={daysFromNow(1)}
                            onChange={(e) => {
                              if (e.target.value) {
                                onSnooze(id, e.target.value);
                                setShowSnoozeMenu(false);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </>
                  )}
                </div>
              ) : null
            )}
          </div>
        ) : null}
        </div>

      {/* Edit + Delete cluster — top-right, identical positioning to TopicCard */}
      {!isEditing && (
        <div className="flex gap-1 flex-shrink-0 items-start pt-0.5">
          <button
            onClick={() => onEdit(id)}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            }}
            aria-label={t("aria_edit")}
            title={t("aria_edit")}
          >
            ✎
          </button>
          <button
            onClick={() => onDelete(id)}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: "var(--accent-red)",
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            }}
            aria-label={t("aria_delete")}
            title={t("aria_delete")}
          >
            ✕
          </button>
        </div>
      )}

      {/* Breakdown modal */}
      {showBreakdownModal && (
        <TaskBreakdownModal
          task={{ id, title }}
          onCancel={() => setShowBreakdownModal(false)}
          onSuccess={() => {
            setShowBreakdownModal(false);
            onBreakdown?.(id);
          }}
        />
      )}
    </motion.div>
    </div>
  );
}
