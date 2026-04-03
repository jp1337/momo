/**
 * Layout for API documentation pages.
 * No authentication required and no app shell (Navbar/Sidebar) is rendered —
 * Swagger UI provides its own full-page chrome.
 *
 * The style reset overrides globals.css rules that cascade from the app theme
 * (background-color, color, link color) so Swagger UI renders with its own
 * default styles unaffected by the app's dark/light mode.
 */

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#fff",
        color: "#3b4151",
      }}
    >
      {children}
    </div>
  );
}
