/**
 * Dashboard skeleton — shown during server-side data fetch.
 */
export default function DashboardLoading() {
  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto flex flex-col gap-8 lg:gap-12 animate-pulse">
      {/* Greeting skeleton */}
      <div className="flex flex-col gap-2 pt-2">
        <div
          className="h-8 w-56 rounded-lg"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        />
        <div
          className="h-4 w-72 rounded"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        />
      </div>

      {/* Energy check-in card skeleton */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="h-5 w-40 rounded"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        />
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-14 rounded-xl"
              style={{ backgroundColor: "var(--bg-elevated)" }}
            />
          ))}
        </div>
      </div>

      {/* Daily Quest card skeleton */}
      <div
        className="rounded-2xl p-6 sm:p-8 flex flex-col gap-5"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="h-3 w-24 rounded"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        />
        <div className="flex flex-col gap-3">
          <div
            className="h-10 rounded"
            style={{ backgroundColor: "var(--bg-elevated)", width: "80%" }}
          />
          <div
            className="h-10 rounded"
            style={{ backgroundColor: "var(--bg-elevated)", width: "55%" }}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <div
            className="h-11 flex-1 rounded-xl"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          />
          <div
            className="h-11 w-32 rounded-xl"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          />
        </div>
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-4 flex flex-col gap-2"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="h-3 w-16 rounded"
              style={{ backgroundColor: "var(--bg-elevated)" }}
            />
            <div
              className="h-8 w-12 rounded"
              style={{ backgroundColor: "var(--bg-elevated)" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
