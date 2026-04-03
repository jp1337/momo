/**
 * Topic detail page — Phase 2.
 *
 * Shows the topic header (title, description, color, progress bar)
 * and all subtasks within this topic.
 * Provides an "Add subtask" button and back navigation.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTopicById } from "@/lib/topics";
import { TopicDetailView } from "@/components/topics/topic-detail-view";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { resolveTopicIcon } from "@/lib/topic-icons";

export const metadata: Metadata = {
  title: "Topic — Momo",
};

interface TopicDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Topic detail page.
 * Fetches the topic with its tasks for the authenticated user.
 */
export default async function TopicDetailPage({ params }: TopicDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const topic = await getTopicById(id, session.user.id);

  if (!topic) {
    notFound();
  }

  const completedCount = topic.tasks.filter((t) => t.completedAt !== null).length;
  const progressPercent =
    topic.tasks.length > 0
      ? Math.round((completedCount / topic.tasks.length) * 100)
      : 0;

  const serializedTasks = topic.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    priority: t.priority,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    dueDate: t.dueDate ?? null,
    nextDueDate: t.nextDueDate ?? null,
    topicId: t.topicId ?? null,
    coinValue: t.coinValue,
    createdAt: t.createdAt.toISOString(),
  }));

  const accentColor = topic.color ?? "var(--accent-amber)";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/topics"
        className="inline-flex items-center gap-1.5 text-sm mb-6 no-underline transition-colors"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        ← Back to Topics
      </Link>

      {/* Topic header */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderLeft: `4px solid ${accentColor}`,
        }}
      >
        {/* Title row */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{
              backgroundColor: topic.color ? `${topic.color}22` : "var(--bg-elevated)",
            }}
            aria-hidden="true"
          >
            <FontAwesomeIcon
              icon={resolveTopicIcon(topic.icon)}
              style={{
                width: "1.1rem",
                height: "1.1rem",
                color: topic.color ?? "var(--accent-amber)",
              }}
            />
          </div>
          <div>
            <h1
              className="text-2xl font-semibold"
              style={{
                fontFamily: "var(--font-display, 'Lora', serif)",
                color: "var(--text-primary)",
              }}
            >
              {topic.title}
            </h1>
            {topic.description && (
              <p
                className="text-sm mt-0.5"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                {topic.description}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span
              className="text-sm"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {completedCount}/{topic.tasks.length} tasks completed
            </span>
            <span
              className="text-sm font-semibold"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color:
                  progressPercent === 100
                    ? "var(--accent-green)"
                    : accentColor,
              }}
            >
              {progressPercent}%
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor:
                  progressPercent === 100
                    ? "var(--accent-green)"
                    : accentColor,
              }}
            />
          </div>
        </div>
      </div>

      {/* Task list for this topic */}
      <TopicDetailView
        topicId={id}
        topicTitle={topic.title}
        initialTasks={serializedTasks}
        topicColor={topic.color ?? null}
      />
    </div>
  );
}
