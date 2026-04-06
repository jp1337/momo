"use client";

/**
 * Global error boundary page.
 *
 * Rendered by Next.js when an unhandled runtime error occurs in the React tree.
 * Must be a Client Component (required by Next.js error boundary API).
 *
 * Props:
 *  - error: the caught Error object (message visible in development)
 *  - reset: function to retry rendering the segment that failed
 */

import Link from "next/link";
import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to console in development; in production a proper error tracker
    // (e.g. Sentry) would be wired here.
    console.error("[Momo] Uncaught error:", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="error-page">
      {/* Floating error code */}
      <span className="error-code error-float" aria-hidden="true">
        500
      </span>

      {/* Decorative divider */}
      <div className="error-divider" />

      {/* Headline */}
      <h1 className="error-heading">
        Etwas ist schiefgelaufen
      </h1>

      {/* Subtext */}
      <p className="error-subtext">
        Das ist kein Problem von dir — der Fehler liegt auf unserer Seite.
        <br />
        Du kannst es gleich nochmal versuchen oder einfach zurückgehen.
      </p>

      {/* Development: show raw error message */}
      {isDev && error?.message && (
        <pre className="error-dev-message">
          {error.message}
          {error.digest ? `\n[digest: ${error.digest}]` : ""}
        </pre>
      )}

      {/* Actions */}
      <div className="error-actions">
        <button
          type="button"
          onClick={reset}
          className="error-cta"
        >
          Neu laden
        </button>
        <Link href="/" className="error-cta error-cta--ghost">
          Zurück zur App
        </Link>
      </div>
    </div>
  );
}
