/**
 * Custom 404 Not Found page.
 *
 * Shown when a user navigates to a route that doesn't exist.
 * Matches Momo's "warme Dämmerung" aesthetic with Lora headings,
 * amber accent colour, and a gentle floating animation.
 *
 * This is a Server Component — no interactivity needed.
 */

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seite nicht gefunden",
};

export default function NotFound() {
  return (
    <div className="error-page">
      {/* Floating error code */}
      <span className="error-code error-float" aria-hidden="true">
        404
      </span>

      {/* Decorative divider */}
      <div className="error-divider" />

      {/* Headline */}
      <h1 className="error-heading">
        Diese Seite existiert (noch) nicht
      </h1>

      {/* Subtext */}
      <p className="error-subtext">
        Manchmal kommt man an Orte, die noch nicht fertig sind. Das kennen wir.
        <br />
        Vielleicht war die Adresse falsch — oder die Seite wartet noch auf ihren Moment.
      </p>

      {/* CTA */}
      <Link href="/" className="error-cta">
        Zurück zur App
      </Link>
    </div>
  );
}
