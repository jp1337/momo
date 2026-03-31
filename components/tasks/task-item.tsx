"use client";

/**
 * TaskItem component — renders a single task row in the task list.
 *
 * Features:
 * - Checkbox to complete/uncomplete the task (with animated strikethrough)
 * - Priority badge (HIGH = red, NORMAL = amber, SOMEDAY = muted)
 * - Topic tag (if task belongs to a topic)
 * - Due date display (overdue dates in red)
 * - Recurring task indicator icon
 * - Edit and delete action buttons
 * - Framer Motion fade animation on completion
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Priority badge label and style mappings.
 */
const PRIORITY_CONFIG = {
  HIGH: {
    label: "High",
    style: { color: "var(--accent-red)", backgroundColor: "rgba(184,84,80,0.12)" },
  },
  NORMAL: {
    label: "Normal",
    style: {
      color: "var(--accent-amber)",
      backgroundColor: "rgba(240,165,0,0.12)",
    },
  },
  SOMEDAY: {
    label: "Someday",
    style: {
      color: "var(--text-muted)",
      backgroundColor: "rgba(122,144,127,0.12)",
    },
  },
} as const;

/**
 * Formats a YYYY-MM-DD date string for display.
 * Returns "Overdue" styling data if the date is in the past.
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
      text: diffDays === 1 ? "Yesterday" : `${diffDays}d overdue`,
      overdue: true,
    };
  }

  if (due.getTime() === today.getTime()) {
    return { text: "Today", overdue: false };
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (due.getTime() === tomorrow.getTime()) {
    return { text: "Tomorrow", overdue: false };
  }

  return {
    text: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    overdue: false,
  };
}

/**
 * Single task row with checkbox, title, badges, and action buttons.
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
  coinValue,
  onComplete,
  onUncomplete,
  onEdit,
  onDelete,
}: TaskItemProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const isCompleted = completedAt !== null;
  const priorityCfg = PRIORITY_CONFIG[priority];

  // For recurring tasks, show the next due date
  const displayDate = type === "RECURRING" ? nextDueDate : dueDate;

  const handleCheckboxChange = async () => {
    if (isCompleted) {
      onUncomplete(id);
      return;
    }
    setIsAnimating(true);
    // Brief delay before calling complete to let animation play
    setTimeout(() => {
      onComplete(id);
      setIsAnimating(false);
    }, 300);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 1 }}
      animate={{ opacity: isAnimating ? 0.4 : 1 }}
      transition={{ duration: 0.25 }}
      className="group flex items-start gap-3 px-4 py-3 rounded-lg transition-colors"
      style={{
        backgroundColor: isCompleted
          ? "transparent"
          : "var(--bg-surface)",
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
          backgroundColor: isCompleted
            ? "var(--accent-green)"
            : "transparent",
        }}
        aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
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
          {/* Title */}
          <span
            className="text-sm task-text transition-all duration-200"
            style={{
              color: isCompleted ? "var(--text-muted)" : "var(--text-primary)",
              textDecoration: isCompleted ? "line-through" : "none",
              fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
            }}
          >
            {title}
          </span>

          {/* Recurring indicator */}
          {type === "RECURRING" && (
            <span
              className="text-xs"
              title="Recurring task"
              aria-label="Recurring task"
              style={{ color: "var(--text-muted)" }}
            >
              ↺
            </span>
          )}

          {/* DAILY_ELIGIBLE indicator */}
          {type === "DAILY_ELIGIBLE" && (
            <span
              className="text-xs"
              title="Daily quest eligible"
              aria-label="Daily quest eligible"
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
                {type === "RECURRING" ? `Next: ${text}` : text}
              </span>
            );
          })()}

          {/* Coin value */}
          {coinValue > 1 && (
            <span
              className="text-xs"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--coin-gold)",
              }}
            >
              +{coinValue} ◎
            </span>
          )}
        </div>
      </div>

      {/* Action buttons — visible on hover */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0"
      >
        <button
          onClick={() => onEdit(id)}
          className="p-1.5 rounded transition-colors text-xs"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          }}
          aria-label="Edit task"
          title="Edit"
        >
          ✎
        </button>
        <button
          onClick={() => onDelete(id)}
          className="p-1.5 rounded transition-colors text-xs"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          }}
          aria-label="Delete task"
          title="Delete"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}
