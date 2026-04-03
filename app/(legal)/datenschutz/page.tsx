/**
 * Datenschutzerklärung — Privacy Policy
 *
 * DSGVO-konforme Datenschutzerklärung für Momo.
 * Deckt alle verarbeiteten Daten ab: OAuth-Login, Nutzerdaten, Cookies.
 *
 * Betreiberangaben werden aus Umgebungsvariablen geladen:
 *   NEXT_PUBLIC_IMPRINT_NAME  — Name des Verantwortlichen
 *   NEXT_PUBLIC_IMPRINT_EMAIL — Datenschutz-Kontakt
 *
 * Hinweis: Dieser Text ist ein Boilerplate für eine OAuth-only App ohne
 * Tracking oder Werbung. Der Betreiber ist für die rechtliche Richtigkeit
 * verantwortlich und sollte den Text bei Bedarf durch einen Anwalt prüfen
 * lassen (z.B. über E-Recht24 oder ähnliche Dienste).
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
};

export default function DatenschutzPage() {
  const name = process.env.NEXT_PUBLIC_IMPRINT_NAME ?? "[Betreibername nicht konfiguriert]";
  const email = process.env.NEXT_PUBLIC_IMPRINT_EMAIL ?? "[E-Mail nicht konfiguriert]";
  const address = process.env.NEXT_PUBLIC_IMPRINT_ADDRESS ?? "[Adresse nicht konfiguriert]";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "diese Anwendung";

  const isConfigured =
    !!process.env.NEXT_PUBLIC_IMPRINT_NAME &&
    !!process.env.NEXT_PUBLIC_IMPRINT_EMAIL;

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
        Datenschutzerklärung
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
          ⚠ Betreiberangaben nicht vollständig konfiguriert — bitte{" "}
          <code>NEXT_PUBLIC_IMPRINT_NAME</code> und{" "}
          <code>NEXT_PUBLIC_IMPRINT_EMAIL</code> in der{" "}
          <code>.env</code>-Datei setzen.
        </div>
      )}

      <div
        className="flex flex-col gap-8 text-sm leading-relaxed"
        style={{ color: "var(--text-primary)", fontFamily: "var(--font-ui)" }}
      >
        {/* 1. Verantwortlicher */}
        <Section title="1. Verantwortlicher">
          <p>
            Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO)
            ist:
          </p>
          <address
            className="not-italic mt-2"
            style={{ color: "var(--text-muted)", whiteSpace: "pre-line" }}
          >
            {name}{"\n"}
            {address}{"\n"}
            E-Mail:{" "}
            <a
              href={`mailto:${email}`}
              style={{ color: "var(--accent-amber)" }}
            >
              {email}
            </a>
          </address>
        </Section>

        {/* 2. Erhobene Daten */}
        <Section title="2. Welche Daten wir verarbeiten">
          <p>Beim Betrieb von {appUrl} werden folgende personenbezogene Daten verarbeitet:</p>
          <ul className="list-disc list-inside mt-2 flex flex-col gap-1" style={{ color: "var(--text-muted)" }}>
            <li><strong>Profildaten:</strong> Name, E-Mail-Adresse und Profilbild, die beim OAuth-Login vom jeweiligen Anbieter (GitHub, Discord, Google oder OIDC) übertragen werden.</li>
            <li><strong>Aufgaben und Themen:</strong> Von dir erstellte Aufgaben, Themen und zugehörige Notizen.</li>
            <li><strong>Wunschliste:</strong> Von dir eingetragene Wunschlisten-Artikel inkl. Preise und URLs.</li>
            <li><strong>Gamification-Daten:</strong> Münzstand, Level, Streak-Zähler und freigeschaltete Achievements.</li>
            <li><strong>Benachrichtigungseinstellungen:</strong> Aktivierungsstatus und Uhrzeit für tägliche Erinnerungen.</li>
          </ul>
          <p className="mt-2" style={{ color: "var(--text-muted)" }}>
            Wir erheben keine Standortdaten, keine Gerätekennungen zu Werbezwecken
            und führen kein Nutzer-Tracking durch.
          </p>
        </Section>

        {/* 3. Rechtsgrundlage */}
        <Section title="3. Zweck und Rechtsgrundlage der Verarbeitung">
          <p style={{ color: "var(--text-muted)" }}>
            Die Verarbeitung deiner Daten erfolgt auf Grundlage von{" "}
            <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> (Vertragserfüllung),
            da sie zur Bereitstellung der Funktionen der Anwendung erforderlich
            ist. Ohne diese Daten ist eine Nutzung der App nicht möglich.
          </p>
        </Section>

        {/* 4. OAuth-Anbieter */}
        <Section title="4. OAuth-Anbieter (Drittdienste beim Login)">
          <p style={{ color: "var(--text-muted)" }}>
            Die Anmeldung erfolgt ausschließlich über externe OAuth-Anbieter.
            Beim Login-Vorgang werden Daten (Name, E-Mail, Profilbild) von deren
            Servern an diese Anwendung übertragen. Für die Datenverarbeitung
            durch diese Anbieter gelten deren eigene Datenschutzerklärungen:
          </p>
          <ul className="list-disc list-inside mt-2 flex flex-col gap-1" style={{ color: "var(--text-muted)" }}>
            <li>
              GitHub:{" "}
              <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-amber)" }}>
                GitHub Privacy Statement
              </a>
            </li>
            <li>
              Discord:{" "}
              <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-amber)" }}>
                Discord Privacy Policy
              </a>
            </li>
            <li>
              Google:{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-amber)" }}>
                Google Privacy Policy
              </a>
            </li>
          </ul>
        </Section>

        {/* 5. Cookies */}
        <Section title="5. Cookies">
          <p style={{ color: "var(--text-muted)" }}>
            Diese Anwendung verwendet ausschließlich technisch notwendige
            Cookies. Ein Cookie-Banner oder eine Einwilligung sind daher nicht
            erforderlich (ePrivacy-Richtlinie Art. 5 Abs. 3).
          </p>
          <table className="w-full mt-3 text-xs border-collapse" style={{ color: "var(--text-muted)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left py-2 pr-4 font-medium" style={{ color: "var(--text-primary)" }}>Cookie</th>
                <th className="text-left py-2 pr-4 font-medium" style={{ color: "var(--text-primary)" }}>Zweck</th>
                <th className="text-left py-2 font-medium" style={{ color: "var(--text-primary)" }}>Speicherdauer</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="py-2 pr-4 font-mono">next-auth.session-token</td>
                <td className="py-2 pr-4">Authentifizierung (Login-Session) — technisch notwendig</td>
                <td className="py-2">30 Tage (oder bis Logout)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono">locale</td>
                <td className="py-2 pr-4">Sprachpräferenz der Benutzeroberfläche — funktional</td>
                <td className="py-2">1 Jahr</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2" style={{ color: "var(--text-muted)" }}>
            Keine Tracking-, Analyse- oder Werbe-Cookies.
          </p>
        </Section>

        {/* 6. Datenspeicherung */}
        <Section title="6. Datenspeicherung und Löschung">
          <p style={{ color: "var(--text-muted)" }}>
            Deine Daten werden auf dem Server des Betreibers ({appUrl}) in
            einer PostgreSQL-Datenbank gespeichert. Die Daten werden für die
            Dauer deiner Nutzung der Anwendung gespeichert.
          </p>
          <p className="mt-2" style={{ color: "var(--text-muted)" }}>
            Du kannst dein Konto und alle damit verbundenen Daten jederzeit
            dauerhaft löschen unter:{" "}
            <a href="/settings" style={{ color: "var(--accent-amber)" }}>
              Einstellungen → Konto löschen
            </a>
            . Die Löschung ist sofort und unwiderruflich.
          </p>
        </Section>

        {/* 7. Weitergabe */}
        <Section title="7. Weitergabe an Dritte">
          <p style={{ color: "var(--text-muted)" }}>
            Deine Daten werden nicht an Dritte verkauft oder zu Werbezwecken
            weitergegeben. Eine Übermittlung erfolgt ausschließlich an die
            OAuth-Anbieter im Rahmen des Login-Prozesses (siehe Abschnitt 4).
          </p>
        </Section>

        {/* 8. Betroffenenrechte */}
        <Section title="8. Deine Rechte (Art. 15–22 DSGVO)">
          <p>Du hast folgende Rechte bezüglich deiner personenbezogenen Daten:</p>
          <ul className="list-disc list-inside mt-2 flex flex-col gap-1" style={{ color: "var(--text-muted)" }}>
            <li><strong>Auskunft (Art. 15):</strong> Du kannst jederzeit Auskunft über deine gespeicherten Daten verlangen.</li>
            <li><strong>Berichtigung (Art. 16):</strong> Du kannst die Berichtigung unrichtiger Daten verlangen.</li>
            <li><strong>Löschung (Art. 17):</strong> Über die App jederzeit möglich — Einstellungen → Konto löschen.</li>
            <li><strong>Datenübertragbarkeit (Art. 20):</strong> Export aller deiner Daten als JSON-Datei — Einstellungen → Daten exportieren.</li>
            <li><strong>Widerspruch (Art. 21):</strong> Du kannst der Verarbeitung deiner Daten widersprechen.</li>
            <li>
              <strong>Beschwerde (Art. 77):</strong> Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren,
              z. B. beim{" "}
              <a href="https://www.bfdi.bund.de" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-amber)" }}>
                Bundesbeauftragten für den Datenschutz und die Informationsfreiheit (BfDI)
              </a>
              .
            </li>
          </ul>
          <p className="mt-2" style={{ color: "var(--text-muted)" }}>
            Zur Ausübung deiner Rechte wende dich an:{" "}
            <a href={`mailto:${email}`} style={{ color: "var(--accent-amber)" }}>
              {email}
            </a>
          </p>
        </Section>

        {/* 9. Aktualität */}
        <Section title="9. Aktualität dieser Datenschutzerklärung">
          <p style={{ color: "var(--text-muted)" }}>
            Diese Datenschutzerklärung ist aktuell gültig. Bei wesentlichen
            Änderungen der Anwendung oder der Rechtslage wird sie entsprechend
            aktualisiert.
          </p>
        </Section>
      </div>
    </article>
  );
}

/** Helper component for consistent section headings */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
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
        {title}
      </h2>
      {children}
    </section>
  );
}
