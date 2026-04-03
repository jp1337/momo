/**
 * Impressum — required for publicly accessible websites under § 5 TMG (Germany).
 *
 * Operator information is read from environment variables. If the variables
 * are not set, a configuration warning is displayed instead.
 *
 * Required env vars:
 *   NEXT_PUBLIC_IMPRINT_NAME     — Full legal name of the operator
 *   NEXT_PUBLIC_IMPRINT_ADDRESS  — Street address, postcode, city
 *   NEXT_PUBLIC_IMPRINT_EMAIL    — Contact email address
 *   NEXT_PUBLIC_IMPRINT_PHONE    — Phone number (optional but recommended)
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Impressum",
};

export default function ImpressumPage() {
  const name = process.env.NEXT_PUBLIC_IMPRINT_NAME;
  const address = process.env.NEXT_PUBLIC_IMPRINT_ADDRESS;
  const email = process.env.NEXT_PUBLIC_IMPRINT_EMAIL;
  const phone = process.env.NEXT_PUBLIC_IMPRINT_PHONE;

  const isConfigured = !!name && !!address && !!email;

  return (
    <article className="flex flex-col gap-8">
      {/* Back link */}
      <Link
        href="/login"
        className="text-sm self-start"
        style={{ color: "var(--accent-amber)", fontFamily: "var(--font-ui)" }}
      >
        ← Zurück
      </Link>

      <h1
        className="text-3xl font-semibold"
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--text-primary)",
        }}
      >
        Impressum
      </h1>

      {!isConfigured && (
        <div
          className="rounded-lg p-4 text-sm"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--accent-amber)",
            color: "var(--accent-amber)",
            fontFamily: "var(--font-ui)",
          }}
        >
          ⚠ Impressum nicht konfiguriert — bitte{" "}
          <code>NEXT_PUBLIC_IMPRINT_NAME</code>,{" "}
          <code>NEXT_PUBLIC_IMPRINT_ADDRESS</code> und{" "}
          <code>NEXT_PUBLIC_IMPRINT_EMAIL</code> in der{" "}
          <code>.env</code>-Datei setzen.
        </div>
      )}

      {isConfigured && (
        <div
          className="flex flex-col gap-6 text-sm leading-relaxed"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-ui)" }}
        >
          <section className="flex flex-col gap-2">
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
            >
              Angaben gemäß § 5 TMG
            </h2>
            <p style={{ whiteSpace: "pre-line" }}>{name}</p>
            <p style={{ whiteSpace: "pre-line" }}>{address}</p>
          </section>

          <section className="flex flex-col gap-2">
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
            >
              Kontakt
            </h2>
            {phone && <p>Telefon: {phone}</p>}
            <p>
              E-Mail:{" "}
              <a
                href={`mailto:${email}`}
                style={{ color: "var(--accent-amber)" }}
              >
                {email}
              </a>
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
            >
              Hinweis zur Software
            </h2>
            <p style={{ color: "var(--text-muted)" }}>
              Diese Anwendung basiert auf der Open-Source-Software{" "}
              <a
                href="https://github.com/jp1337/momo"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent-amber)" }}
              >
                Momo
              </a>
              , die unter der MIT-Lizenz veröffentlicht ist. Der Betrieb und
              Inhalt dieser Instanz liegt in der Verantwortung des oben
              genannten Betreibers.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
            >
              Haftungsausschluss
            </h2>
            <p style={{ color: "var(--text-muted)" }}>
              <strong>Haftung für Inhalte:</strong> Die Inhalte unserer Seiten
              wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
              Vollständigkeit und Aktualität der Inhalte können wir jedoch keine
              Gewähr übernehmen.
            </p>
          </section>
        </div>
      )}
    </article>
  );
}
