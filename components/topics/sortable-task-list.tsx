"use client";

/**
 * SortableTaskList — drag-and-drop reorderable task list for topic detail views.
 *
 * Uses @dnd-kit with PointerSensor (mouse), TouchSensor (mobile), and
 * KeyboardSensor (accessibility). Only active (uncompleted, not snoozed) tasks
 * are reorderable.
 */

import { useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableTaskItem } from "./sortable-task-item";
import { TaskItem } from "@/components/tasks/task-item";

interface Task {
  id: string;
  title: string;
  type: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  completedAt: string | null;
  dueDate: string | null;
  nextDueDate: string | null;
  topicId: string | null;
  notes: string | null;
  coinValue: number;
  createdAt: string;
  sortOrder: number;
  snoozedUntil?: string | null;
}

interface SortableTaskListProps {
  tasks: Task[];
  topicTitle: string | null;
  topicColor: string | null;
  onReorder: (taskIds: string[]) => void;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onBreakdown?: (id: string) => void;
  onSnooze?: (id: string, snoozedUntil: string) => void;
  onUnsnooze?: (id: string) => void;
}

export function SortableTaskList({
  tasks,
  topicTitle,
  topicColor,
  onReorder,
  onComplete,
  onUncomplete,
  onEdit,
  onDelete,
  onBreakdown,
  onSnooze,
  onUnsnooze,
}: SortableTaskListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(tasks, oldIndex, newIndex);
      onReorder(reordered.map((t) => t.id));
    },
    [tasks, onReorder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <SortableTaskItem
              key={task.id}
              id={task.id}
              title={task.title}
              type={task.type}
              priority={task.priority}
              completedAt={task.completedAt}
              dueDate={task.dueDate}
              nextDueDate={task.nextDueDate}
              topicTitle={topicTitle}
              topicColor={topicColor}
              coinValue={task.coinValue}
              onComplete={onComplete}
              onUncomplete={onUncomplete}
              onEdit={onEdit}
              onDelete={onDelete}
              onBreakdown={onBreakdown}
              snoozedUntil={task.snoozedUntil}
              onSnooze={onSnooze}
              onUnsnooze={onUnsnooze}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag overlay — rendered outside the sortable context for smooth visuals */}
      <DragOverlay>
        {activeTask ? (
          <div style={{ opacity: 0.9 }}>
            <TaskItem
              id={activeTask.id}
              title={activeTask.title}
              type={activeTask.type}
              priority={activeTask.priority}
              completedAt={activeTask.completedAt}
              dueDate={activeTask.dueDate}
              nextDueDate={activeTask.nextDueDate}
              topicTitle={topicTitle}
              topicColor={topicColor}
              coinValue={activeTask.coinValue}
              onComplete={() => {}}
              onUncomplete={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
