/**
 * Layout for public legal pages (Impressum, Datenschutzerklärung).
 * No authentication required — these pages must be accessible to everyone.
 */

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="max-w-3xl mx-auto px-6 py-12">{children}</div>
    </div>
  );
}
