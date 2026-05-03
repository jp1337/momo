/**
 * Wishlist page skeleton — shown during server-side data fetch.
 */
export default function WishlistLoading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      {/* Budget bar skeleton */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-3"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div
            className="h-4 w-28 rounded"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          />
          <div
            className="h-4 w-20 rounded"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          />
        </div>
        <div
          className="h-2.5 rounded-full"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        />
      </div>

      {/* Header + add button */}
      <div className="flex items-center justify-between">
        <div
          className="h-8 w-36 rounded-lg"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        />
        <div
          className="h-9 w-28 rounded-lg"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        />
      </div>

      {/* Wishlist card grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 flex flex-col gap-4"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
              opacity: 1 - i * 0.1,
            }}
          >
            {/* Title row */}
            <div
              className="h-5 rounded"
              style={{ backgroundColor: "var(--bg-elevated)", width: "65%" }}
            />
            {/* Price */}
            <div
              className="h-7 w-24 rounded"
              style={{ backgroundColor: "var(--bg-elevated)" }}
            />
            {/* Coin ring placeholder */}
            <div
              className="h-10 rounded-xl"
              style={{ backgroundColor: "var(--bg-elevated)" }}
            />
            {/* Badge row */}
            <div className="flex gap-2">
              <div
                className="h-5 w-16 rounded-full"
                style={{ backgroundColor: "var(--bg-elevated)" }}
              />
              <div
                className="h-5 w-20 rounded-full"
                style={{ backgroundColor: "var(--bg-elevated)" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
