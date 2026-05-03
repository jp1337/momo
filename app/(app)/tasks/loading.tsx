/**
 * Tasks page skeleton — shown during server-side data fetch.
 */
export default function TasksLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div
            className="h-8 w-32 rounded-lg"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          />
          <div
            className="h-4 w-48 rounded"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          />
        </div>
        <div
          className="h-9 w-28 rounded-lg"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        />
      </div>

      {/* Task rows skeleton */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            opacity: 1 - i * 0.1,
          }}
        >
          <div
            className="w-5 h-5 rounded-md flex-shrink-0"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          />
          <div className="flex-1 flex flex-col gap-2">
            <div
              className="h-4 rounded"
              style={{
                backgroundColor: "var(--bg-elevated)",
                width: `${55 + Math.sin(i) * 25}%`,
              }}
            />
            <div
              className="h-3 w-24 rounded"
              style={{ backgroundColor: "var(--bg-elevated)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
