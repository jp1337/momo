/**
 * Layout for API documentation pages.
 * No authentication required and no app shell (Navbar/Sidebar) is rendered —
 * Swagger UI provides its own full-page chrome.
 */

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
