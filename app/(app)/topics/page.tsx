/**
 * Topics page — placeholder for Phase 2.
 * Will display user-defined project buckets with task grouping.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Topics",
};

/**
 * Topics list page.
 * Topic management will be implemented in Phase 2.
 */
export default function TopicsPage() {
  return (
    <div className="max-w-4xl mx-auto">
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
        className="text-base mb-8"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        Group your tasks into projects and topics.
      </p>

      <div
        className="rounded-2xl p-8 text-center"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
            color: "var(--text-muted)",
          }}
        >
          Topic management is coming in Phase 2.
        </p>
      </div>
    </div>
  );
}
