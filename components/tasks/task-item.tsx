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
import { faCoins, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
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
}: TaskItemProps) {
  const t = useTranslations("tasks");

  const [isAnimating, setIsAnimating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCompleted = completedAt !== null;

  /**
   * Priority badge label and style mappings.
   * Defined inside the component so labels are resolved through t().
   */
  const PRIORITY_CONFIG = {
    HIGH: {
      label: t("priority_high"),
      style: { color: "var(--accent-red)", backgroundColor: "rgba(184,84,80,0.12)" },
    },
    NORMAL: {
      label: t("priority_normal"),
      style: {
        color: "var(--accent-amber)",
        backgroundColor: "rgba(240,165,0,0.12)",
      },
    },
    SOMEDAY: {
      label: t("priority_someday"),
      style: {
        color: "var(--text-muted)",
        backgroundColor: "rgba(122,144,127,0.12)",
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

  return (
    <motion.div
      layout
      initial={{ opacity: 1 }}
      animate={{ opacity: isAnimating ? 0.4 : 1 }}
      transition={{ duration: 0.25 }}
      className="group flex items-start gap-3 px-4 py-3 rounded-lg transition-colors"
      style={{
        backgroundColor: isCompleted ? "transparent" : "var(--bg-surface)",
        border: "1px solid var(--border)",
        opacity: isCompleted ? 0.6 : 1,
      }}
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

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Title — double-click to edit inline */}
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitInlineEdit}
              onKeyDown={handleInputKeyDown}
              className="text-sm rounded px-1 py-0.5 outline-none min-w-0 w-full"
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
              className="text-sm task-text transition-all duration-200 cursor-text"
              title={onInlineEdit && !isCompleted ? t("inline_hint") : undefined}
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
              className="text-xs"
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
              className="text-xs"
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
        </div>
      </div>

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

      {/* Action buttons — always visible for touch and desktop accessibility */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Promote to topic — only for standalone tasks */}
        {topicId === null && onPromote && (
          <button
            onClick={() => onPromote(id)}
            className="p-2 rounded-lg transition-colors"
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
            className="p-2 rounded-lg transition-colors"
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
            className="p-2 rounded-lg transition-colors"
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
        <button
          onClick={() => onEdit(id)}
          className="p-2 rounded-lg transition-colors"
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
          className="p-2 rounded-lg transition-colors"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          }}
          aria-label={t("aria_delete")}
          title={t("aria_delete")}
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}
