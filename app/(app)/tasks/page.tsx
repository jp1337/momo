/**
 * Tasks page — placeholder for Phase 2.
 * Will display the full task list with create/edit/complete functionality.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks",
};

/**
 * Tasks list page.
 * Task CRUD will be implemented in Phase 2.
 */
export default function TasksPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1
        className="text-3xl font-semibold mb-2"
        style={{
          fontFamily: "var(--font-display, 'Lora', serif)",
          color: "var(--text-primary)",
        }}
      >
        Tasks
      </h1>
      <p
        className="text-base mb-8"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        All your tasks in one place.
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
          Task management is coming in Phase 2.
        </p>
      </div>
    </div>
  );
}
