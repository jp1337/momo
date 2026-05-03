/**
 * Topics page skeleton — shown during server-side data fetch.
 */
export default function TopicsLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div
          className="h-8 w-32 rounded-lg"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        />
        <div
          className="h-9 w-28 rounded-lg"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        />
      </div>

      {/* Topic card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 flex flex-col gap-4"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
              opacity: 1 - i * 0.08,
            }}
          >
            {/* Icon + title row */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0"
                style={{ backgroundColor: "var(--bg-elevated)" }}
              />
              <div
                className="h-5 rounded flex-1"
                style={{ backgroundColor: "var(--bg-elevated)", maxWidth: "70%" }}
              />
            </div>
            {/* Progress bar */}
            <div
              className="h-2 rounded-full"
              style={{ backgroundColor: "var(--bg-elevated)" }}
            />
            <div
              className="h-3 w-20 rounded"
              style={{ backgroundColor: "var(--bg-elevated)" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
