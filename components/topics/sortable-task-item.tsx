"use client";

/**
 * SortableTaskItem — wraps a TaskItem with dnd-kit sortable functionality.
 *
 * Renders a drag handle (grip icon) to the left of the task. The handle is the
 * only draggable element, so it doesn't conflict with TaskItem's swipe-to-complete.
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { TaskItem } from "@/components/tasks/task-item";

interface SortableTaskItemProps {
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
  snoozedUntil?: string | null;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onBreakdown?: (id: string) => void;
  onSnooze?: (id: string, snoozedUntil: string) => void;
  onUnsnooze?: (id: string) => void;
}

export function SortableTaskItem(props: SortableTaskItemProps) {
  const t = useTranslations("topics");
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-1"
    >
      {/* Drag handle */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex-shrink-0 mt-3 p-1.5 rounded cursor-grab active:cursor-grabbing touch-none opacity-40 hover:opacity-80 transition-opacity"
        style={{ color: "var(--text-muted)" }}
        aria-label={t("drag_handle_aria")}
      >
        <svg
          width="12"
          height="18"
          viewBox="0 0 12 18"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="9" r="1.5" />
          <circle cx="9" cy="9" r="1.5" />
          <circle cx="3" cy="15" r="1.5" />
          <circle cx="9" cy="15" r="1.5" />
        </svg>
      </button>

      {/* Task item — full width */}
      <div className="flex-1 min-w-0">
        <TaskItem
          id={props.id}
          title={props.title}
          type={props.type}
          priority={props.priority}
          completedAt={props.completedAt}
          dueDate={props.dueDate}
          nextDueDate={props.nextDueDate}
          topicTitle={props.topicTitle}
          topicColor={props.topicColor}
          coinValue={props.coinValue}
          onComplete={props.onComplete}
          onUncomplete={props.onUncomplete}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          onBreakdown={props.onBreakdown}
          snoozedUntil={props.snoozedUntil}
          onSnooze={props.onSnooze}
          onUnsnooze={props.onUnsnooze}
        />
      </div>
    </div>
  );
}
