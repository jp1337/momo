/**
 * Impressum — required for publicly accessible websites under § 5 TMG (Germany).
 *
 * Operator information is read from environment variables. If required variables
 * are not set, a configuration warning is displayed instead.
 *
 * Required env vars:
 *   NEXT_PUBLIC_IMPRINT_NAME     — Full legal name of the operator
 *   NEXT_PUBLIC_IMPRINT_ADDRESS  — Street address, postcode, city (newline-separated)
 *   NEXT_PUBLIC_IMPRINT_EMAIL    — Contact email address
 *
 * Optional env vars:
 *   NEXT_PUBLIC_IMPRINT_PHONE            — Phone number
 *   NEXT_PUBLIC_IMPRINT_FAX              — Fax number
 *   NEXT_PUBLIC_IMPRINT_COMPANY_REGISTER — e.g. "HRB 12345, Amtsgericht München"
 *   NEXT_PUBLIC_IMPRINT_VAT_ID           — Umsatzsteuer-ID, e.g. "DE123456789"
 *   NEXT_PUBLIC_IMPRINT_REPRESENTATIVES  — Managing directors / Geschäftsführer
 *   NEXT_PUBLIC_IMPRINT_RESPONSIBLE      — Redaktionell verantwortlich (name + address)
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Impressum",
};

// Force dynamic so env vars are read at request time, not baked in at build.
export const dynamic = "force-dynamic";

export default function ImpressumPage() {
  const name = process.env.NEXT_PUBLIC_IMPRINT_NAME;
  const address = process.env.NEXT_PUBLIC_IMPRINT_ADDRESS;
  const email = process.env.NEXT_PUBLIC_IMPRINT_EMAIL;
  const phone = process.env.NEXT_PUBLIC_IMPRINT_PHONE;
  const fax = process.env.NEXT_PUBLIC_IMPRINT_FAX;
  const companyRegister = process.env.NEXT_PUBLIC_IMPRINT_COMPANY_REGISTER;
  const vatId = process.env.NEXT_PUBLIC_IMPRINT_VAT_ID;
  const representatives = process.env.NEXT_PUBLIC_IMPRINT_REPRESENTATIVES;
  const responsible = process.env.NEXT_PUBLIC_IMPRINT_RESPONSIBLE;

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
          className="flex flex-col gap-8 text-sm leading-relaxed"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-ui)" }}
        >
          {/* Angaben gemäß § 5 TMG */}
          <section className="flex flex-col gap-3">
            <h2
              className="text-base font-semibold"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--text-primary)",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "0.5rem",
              }}
            >
              Angaben gemäß § 5 TMG
            </h2>
            <address className="not-italic flex flex-col gap-0.5" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{name}</span>
              {address.split("\n").map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </address>
            {representatives && (
              <p style={{ color: "var(--text-muted)" }}>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Vertreten durch:</span>{" "}
                {representatives}
              </p>
            )}
          </section>

          {/* Kontakt */}
          <section className="flex flex-col gap-3">
            <h2
              className="text-base font-semibold"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--text-primary)",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "0.5rem",
              }}
            >
              Kontakt
            </h2>
            <div className="flex flex-col gap-1" style={{ color: "var(--text-muted)" }}>
              {phone && <p>Telefon: {phone}</p>}
              {fax && <p>Telefax: {fax}</p>}
              <p>
                E-Mail:{" "}
                <a
                  href={`mailto:${email}`}
                  style={{ color: "var(--accent-amber)" }}
                >
                  {email}
                </a>
              </p>
            </div>
          </section>

          {/* Handelsregister (optional) */}
          {companyRegister && (
            <section className="flex flex-col gap-3">
              <h2
                className="text-base font-semibold"
                style={{
                  fontFamily: "var(--font-ui)",
                  color: "var(--text-primary)",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "0.5rem",
                }}
              >
                Handelsregister
              </h2>
              <p style={{ color: "var(--text-muted)" }}>{companyRegister}</p>
            </section>
          )}

          {/* Umsatzsteuer-ID (optional) */}
          {vatId && (
            <section className="flex flex-col gap-3">
              <h2
                className="text-base font-semibold"
                style={{
                  fontFamily: "var(--font-ui)",
                  color: "var(--text-primary)",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "0.5rem",
                }}
              >
                Umsatzsteuer-ID
              </h2>
              <p style={{ color: "var(--text-muted)" }}>
                Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:{" "}
                {vatId}
              </p>
            </section>
          )}

          {/* Redaktionell verantwortlich (optional) */}
          {responsible && (
            <section className="flex flex-col gap-3">
              <h2
                className="text-base font-semibold"
                style={{
                  fontFamily: "var(--font-ui)",
                  color: "var(--text-primary)",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "0.5rem",
                }}
              >
                Redaktionell verantwortlich
              </h2>
              <address className="not-italic" style={{ color: "var(--text-muted)", whiteSpace: "pre-line" }}>
                {responsible}
              </address>
            </section>
          )}

          {/* Verbraucherschlichtung — mandatory § 36 VSBG */}
          <section className="flex flex-col gap-3">
            <h2
              className="text-base font-semibold"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--text-primary)",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "0.5rem",
              }}
            >
              Verbraucher&shy;streit&shy;beilegung / Universal&shy;schlichtungs&shy;stelle
            </h2>
            <p style={{ color: "var(--text-muted)" }}>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
              vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          {/* Hinweis zur Software */}
          <section className="flex flex-col gap-3">
            <h2
              className="text-base font-semibold"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--text-primary)",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "0.5rem",
              }}
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
        </div>
      )}
    </article>
  );
}
