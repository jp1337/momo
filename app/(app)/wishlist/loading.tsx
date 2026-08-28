/**
 * Wishlist page skeleton — shown during server-side data fetch.
 *
 * Follows the list, not the card grid it used to show: `WishlistRow`
 * replaced the card in Task 5, and this skeleton showed tiles nobody
 * renders anymore. No `List`/`Row` import — the skeleton has no content,
 * it has placeholders, and feeding the real primitives empty props would
 * be more code for the same picture.
 */
export default function WishlistLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[var(--measure)] animate-pulse flex-col gap-8">
      <div className="h-8 w-48 rounded-[var(--radius-sm)] bg-[var(--raised)]" />
      <ul className="m-0 list-none p-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 border-t border-t-[var(--hairline)] py-3 first:border-t-0"
          >
            <span className="h-4 w-2/3 rounded-[var(--radius-sm)] bg-[var(--raised)]" />
            <span className="h-4 w-16 rounded-[var(--radius-sm)] bg-[var(--raised)]" />
          </li>
        ))}
      </ul>
    </div>
  );
}
