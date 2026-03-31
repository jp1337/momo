"use client";

/**
 * TopicsGrid component — interactive grid of topic cards.
 *
 * Manages topic state after initial server-fetched data.
 * Handles create/edit/delete actions via the TopicForm modal.
 */

import { useState, useCallback } from "react";
import { TopicCard } from "./topic-card";
import { TopicForm } from "./topic-form";

interface Topic {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  taskCount: number;
  completedCount: number;
}

interface TopicsGridProps {
  initialTopics: Topic[];
}

/**
 * Empty state for when the user has no topics.
 */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="rounded-2xl p-12 text-center"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px dashed var(--border)",
      }}
    >
      <p className="text-2xl mb-3" role="img" aria-label="Folder">
        📂
      </p>
      <p
        className="text-base font-medium mb-1"
        style={{
          fontFamily: "var(--font-display, 'Lora', serif)",
          color: "var(--text-primary)",
        }}
      >
        No topics yet
      </p>
      <p
        className="text-sm mb-4"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        Group your tasks into topics like &quot;Tax Return&quot;, &quot;Moving&quot;, or &quot;Health&quot;.
      </p>
      <button
        onClick={onAdd}
        className="px-4 py-2 rounded-lg text-sm font-medium"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          backgroundColor: "var(--accent-amber)",
          color: "var(--bg-primary)",
        }}
      >
        Create first topic
      </button>
    </div>
  );
}

/**
 * Interactive grid of topic cards with CRUD functionality.
 */
export function TopicsGrid({ initialTopics }: TopicsGridProps) {
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const editingTopic = topics.find((t) => t.id === editingTopicId);

  const refreshTopics = useCallback(async () => {
    try {
      const res = await fetch("/api/topics");
      if (res.ok) {
        const data = await res.json() as { topics: Topic[] };
        setTopics(data.topics);
      }
    } catch {
      // silent fail
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this topic? Tasks will become standalone.")) return;
      try {
        const res = await fetch(`/api/topics/${id}`, { method: "DELETE" });
        if (res.ok) {
          setTopics((prev) => prev.filter((t) => t.id !== id));
        }
      } catch {
        // silent fail
      }
    },
    []
  );

  const handleFormSuccess = useCallback(async () => {
    setEditingTopicId(null);
    setShowCreateForm(false);
    await refreshTopics();
  }, [refreshTopics]);

  return (
    <div>
      {/* New Topic button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            backgroundColor: "var(--accent-amber)",
            color: "var(--bg-primary)",
          }}
        >
          + New Topic
        </button>
      </div>

      {/* Empty state */}
      {topics.length === 0 && (
        <EmptyState onAdd={() => setShowCreateForm(true)} />
      )}

      {/* Topics grid */}
      {topics.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              id={topic.id}
              title={topic.title}
              description={topic.description}
              color={topic.color}
              icon={topic.icon}
              priority={topic.priority}
              taskCount={topic.taskCount}
              completedCount={topic.completedCount}
              onEdit={setEditingTopicId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Topic form modal */}
      {(showCreateForm || editingTopicId) && (
        <TopicForm
          initialData={
            editingTopic
              ? {
                  id: editingTopic.id,
                  title: editingTopic.title,
                  description: editingTopic.description ?? "",
                  color: editingTopic.color ?? "#4a8c5c",
                  icon: editingTopic.icon ?? "📁",
                  priority: editingTopic.priority,
                }
              : undefined
          }
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingTopicId(null);
          }}
        />
      )}
    </div>
  );
}
