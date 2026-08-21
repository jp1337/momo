/**
 * Layout for the (docs) route group — public, unauthenticated pages.
 *
 * Deliberately a transparent passthrough: no styling, no metadata. It used
 * to hardcode Swagger UI's own light-mode background and ink here to keep
 * its styling unaffected by the app's dark/light theme — but that reset
 * applied to EVERY route in this group, not just /api-docs. /design-system
 * inherited it too, which meant the page documenting "no hardcoded colour,
 * only tokens" was itself skinned by two hardcoded colors and rendered
 * unreadable in dark mode (pale ink on a background stuck permanently
 * bright). That reset now lives in `api-docs/layout.tsx`, scoped to the one
 * route that actually needs it.
 */

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
