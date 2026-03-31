/**
 * Topics list page — Phase 2.
 *
 * Server component that fetches topics for the current user with task counts.
 * Renders a grid of TopicCards with create/edit/delete capabilities.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserTopics } from "@/lib/topics";
import { TopicsGrid } from "@/components/topics/topics-grid";

export const metadata: Metadata = {
  title: "Topics — Momo",
};

/**
 * Topics list page.
 * Fetches all topics with task counts for the authenticated user.
 */
export default async function TopicsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const topics = await getUserTopics(session.user.id);

  const serializedTopics = topics.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    color: t.color ?? null,
    icon: t.icon ?? null,
    priority: t.priority,
    taskCount: t.taskCount,
    completedCount: t.completedCount,
  }));

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-semibold mb-2"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-primary)",
          }}
        >
          Topics
        </h1>
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {topics.length === 0
            ? "No topics yet — group your tasks into projects."
            : `${topics.length} topic${topics.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <TopicsGrid initialTopics={serializedTopics} />
    </div>
  );
}
