/**
 * Datenschutzerklärung — DSGVO-konforme Datenschutzerklärung für Momo.
 *
 * Struktur angelehnt an das e-recht24-Muster, angepasst auf die tatsächliche
 * Datenverarbeitung von Momo:
 *   - Kein Tracking, keine Werbung, keine Drittdienste außer OAuth-Providern
 *   - Technisch notwendige Cookies (Session, Locale)
 *   - Hetzner-Hosting (konfigurierbar)
 *   - Web Push Notifications (optional, nutzergesteuert)
 *
 * Betreiberangaben werden aus Umgebungsvariablen geladen:
 *   NEXT_PUBLIC_IMPRINT_NAME    — Name des Verantwortlichen
 *   NEXT_PUBLIC_IMPRINT_ADDRESS — Adresse des Verantwortlichen
 *   NEXT_PUBLIC_IMPRINT_EMAIL   — Datenschutz-Kontakt
 *   NEXT_PUBLIC_IMPRINT_PHONE   — Telefon (optional)
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description:
    "DSGVO-konforme Datenschutzerklärung für die öffentliche Momo-Instanz: welche Daten verarbeitet werden und warum.",
  alternates: {
    canonical: "/datenschutz",
  },
  // Same no-crawl / no-archive stance as /impressum — the page repeats
  // the operator's real name, postal address and contact email for
  // DSGVO compliance and should not be mirrored by search engines or
  // archive.org. See the matching block in impressum/page.tsx for the
  // full rationale behind each directive.
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
    },
  },
};

// Force dynamic so env vars are read at request time, not baked in at build.
export const dynamic = "force-dynamic";

export default function DatenschutzPage() {
  const name = process.env.NEXT_PUBLIC_IMPRINT_NAME ?? "[Betreibername nicht konfiguriert]";
  const email = process.env.NEXT_PUBLIC_IMPRINT_EMAIL ?? "[E-Mail nicht konfiguriert]";
  const address = process.env.NEXT_PUBLIC_IMPRINT_ADDRESS ?? "[Adresse nicht konfiguriert]";
  const phone = process.env.NEXT_PUBLIC_IMPRINT_PHONE;

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
        className="flex flex-col gap-10 text-sm leading-relaxed"
        style={{ color: "var(--text-primary)", fontFamily: "var(--font-ui)" }}
      >

        {/* ── 1. Datenschutz auf einen Blick ─────────────────────────────── */}
        <Section title="1. Datenschutz auf einen Blick">
          <Subheading>Allgemeine Hinweise</Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Die folgenden Hinweise geben einen einfachen Überblick darüber,
            was mit Ihren personenbezogenen Daten passiert, wenn Sie diese
            Anwendung nutzen. Personenbezogene Daten sind alle Daten, mit
            denen Sie persönlich identifiziert werden können. Ausführliche
            Informationen zum Thema Datenschutz entnehmen Sie unserer unter
            diesem Text aufgeführten Datenschutzerklärung.
          </p>

          <Subheading>Datenerfassung in dieser Anwendung</Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--text-primary)" }}>
              Wer ist verantwortlich für die Datenerfassung?
            </strong>
            <br />
            Die Datenverarbeitung in dieser Anwendung erfolgt durch den
            Betreiber. Dessen Kontaktdaten können Sie dem Abschnitt
            {`„Hinweis zur verantwortlichen Stelle"`} in dieser
            Datenschutzerklärung entnehmen.
          </p>
          <p style={{ color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--text-primary)" }}>
              Wie erfassen wir Ihre Daten?
            </strong>
            <br />
            Ihre Daten werden erhoben, wenn Sie sich über einen
            OAuth-Anbieter (GitHub, Discord, Google oder einen eigenen
            OIDC-Provider) anmelden. Dabei übermittelt der Anbieter Name,
            E-Mail-Adresse und Profilbild an diese Anwendung. Weitere Daten
            (Aufgaben, Themen, Wunschlisten-Einträge) geben Sie selbst ein.
            Technische Daten (z. B. IP-Adresse, Browsertyp) werden beim
            Serveraufruf automatisch erfasst.
          </p>
          <p style={{ color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--text-primary)" }}>
              Wofür nutzen wir Ihre Daten?
            </strong>
            <br />
            Die Daten werden ausschließlich zur Bereitstellung der
            Anwendungsfunktionen verwendet. Es findet kein Nutzer-Tracking,
            keine Verhaltensanalyse und keine Weitergabe zu Werbezwecken
            statt.
          </p>
          <p style={{ color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--text-primary)" }}>
              Welche Rechte haben Sie bezüglich Ihrer Daten?
            </strong>
            <br />
            Sie haben jederzeit das Recht, unentgeltlich Auskunft über
            Herkunft, Empfänger und Zweck Ihrer gespeicherten
            personenbezogenen Daten zu erhalten. Sie haben außerdem ein
            Recht auf Berichtigung oder Löschung dieser Daten. Wenn Sie
            eine Einwilligung zur Datenverarbeitung erteilt haben, können
            Sie diese Einwilligung jederzeit für die Zukunft widerrufen.
            Außerdem haben Sie das Recht, unter bestimmten Umständen die
            Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu
            verlangen. Des Weiteren steht Ihnen ein Beschwerderecht bei der
            zuständigen Aufsichtsbehörde zu. Hierzu sowie zu weiteren
            Fragen zum Thema Datenschutz können Sie sich jederzeit an uns
            wenden.
          </p>
        </Section>

        {/* ── 2. Hosting ─────────────────────────────────────────────────── */}
        <Section title="2. Hosting">
          <p style={{ color: "var(--text-muted)" }}>
            Wir hosten die Inhalte dieser Anwendung auf eigenen Servern
            bzw. bei einem Hosting-Anbieter. Personenbezogene Daten, die in
            dieser Anwendung erfasst werden, werden auf den Servern des
            Hosters gespeichert. Hierbei kann es sich v. a. um
            IP-Adressen, Kontaktanfragen, Meta- und Kommunikationsdaten,
            Vertragsdaten, Kontaktdaten, Namen, Websitezugriffe und
            sonstige Daten, die über eine Website generiert werden, handeln.
          </p>
          <p style={{ color: "var(--text-muted)" }}>
            Die Verwendung des Hosters erfolgt zum Zwecke der
            Vertragserfüllung gegenüber unseren potenziellen und
            bestehenden Nutzern (Art. 6 Abs. 1 lit. b DSGVO) und im
            Interesse einer sicheren, schnellen und effizienten
            Bereitstellung unseres Online-Angebots durch einen
            professionellen Anbieter (Art. 6 Abs. 1 lit. f DSGVO).
          </p>
          <p style={{ color: "var(--text-muted)" }}>
            Sofern eine entsprechende Einwilligung abgefragt wurde, erfolgt
            die Verarbeitung ausschließlich auf Grundlage von Art. 6 Abs. 1
            lit. a DSGVO und § 25 Abs. 1 TDDDG; die Einwilligung ist
            jederzeit widerrufbar.
          </p>
          <p style={{ color: "var(--text-muted)" }}>
            Unser Hoster wird Ihre Daten nur insoweit verarbeiten, wie dies
            zur Erfüllung seiner Leistungspflichten erforderlich ist und
            unsere Weisungen in Bezug auf diese Daten befolgen. Wir haben
            einen Vertrag über Auftragsverarbeitung (AVV) mit unserem
            Hosting-Anbieter geschlossen.
          </p>
        </Section>

        {/* ── 3. Allgemeine Hinweise und Pflichtinformationen ────────────── */}
        <Section title="3. Allgemeine Hinweise und Pflicht­informationen">
          <Subheading>Datenschutz</Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Die Betreiber dieser Anwendung nehmen den Schutz Ihrer
            persönlichen Daten sehr ernst. Wir behandeln Ihre
            personenbezogenen Daten vertraulich und entsprechend den
            gesetzlichen Datenschutzvorschriften sowie dieser
            Datenschutzerklärung.
          </p>
          <p style={{ color: "var(--text-muted)" }}>
            Wir weisen darauf hin, dass die Datenübertragung im Internet
            (z. B. bei der Kommunikation per E-Mail) Sicherheitslücken
            aufweisen kann. Ein lückenloser Schutz der Daten vor dem
            Zugriff durch Dritte ist nicht möglich.
          </p>

          <Subheading>Hinweis zur verantwortlichen Stelle</Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Die verantwortliche Stelle für die Datenverarbeitung in dieser
            Anwendung ist:
          </p>
          <address
            className="not-italic mt-1 flex flex-col gap-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{name}</span>
            {address.split("\n").map((line, i) => (
              <span key={i}>{line}</span>
            ))}
            {phone && <span>Telefon: {phone}</span>}
            <span>
              E-Mail:{" "}
              <a href={`mailto:${email}`} style={{ color: "var(--accent-amber)" }}>
                {email}
              </a>
            </span>
          </address>
          <p style={{ color: "var(--text-muted)" }}>
            Verantwortliche Stelle ist die natürliche oder juristische
            Person, die allein oder gemeinsam mit anderen über die Zwecke
            und Mittel der Verarbeitung von personenbezogenen Daten
            (z. B. Namen, E-Mail-Adressen o. Ä.) entscheidet.
          </p>

          <Subheading>Speicherdauer</Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Soweit innerhalb dieser Datenschutzerklärung keine speziellere
            Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen
            Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt.
            Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine
            Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten
            gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe
            für die Speicherung Ihrer personenbezogenen Daten haben; im
            letztgenannten Fall erfolgt die Löschung nach Fortfall dieser
            Gründe.
          </p>

          <Subheading>
            Allgemeine Hinweise zu den Rechtsgrundlagen der
            Datenverarbeitung
          </Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Sofern Sie in die Datenverarbeitung eingewilligt haben,
            verarbeiten wir Ihre personenbezogenen Daten auf Grundlage von
            Art. 6 Abs. 1 lit. a DSGVO. Sind Ihre Daten zur
            Vertragserfüllung oder zur Durchführung vorvertraglicher
            Maßnahmen erforderlich, verarbeiten wir Ihre Daten auf
            Grundlage des Art. 6 Abs. 1 lit. b DSGVO. Des Weiteren
            verarbeiten wir Ihre Daten, sofern diese zur Erfüllung einer
            rechtlichen Verpflichtung erforderlich sind, auf Grundlage von
            Art. 6 Abs. 1 lit. c DSGVO. Die Datenverarbeitung kann ferner
            auf Grundlage unseres berechtigten Interesses nach Art. 6
            Abs. 1 lit. f DSGVO erfolgen.
          </p>

          <Subheading>
            Widerruf Ihrer Einwilligung zur Datenverarbeitung
          </Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Viele Datenverarbeitungsvorgänge sind nur mit Ihrer
            ausdrücklichen Einwilligung möglich. Sie können eine bereits
            erteilte Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit
            der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom
            Widerruf unberührt.
          </p>

          <Subheading>
            Widerspruchsrecht gegen die Datenerhebung in besonderen Fällen
            sowie gegen Direktwerbung (Art. 21 DSGVO)
          </Subheading>
          <p
            className="uppercase text-xs leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Wenn die Datenverarbeitung auf Grundlage von Art. 6 Abs. 1
            lit. e oder f DSGVO erfolgt, haben Sie jederzeit das Recht,
            aus Gründen, die sich aus Ihrer besonderen Situation ergeben,
            gegen die Verarbeitung Ihrer personenbezogenen Daten
            Widerspruch einzulegen; dies gilt auch für ein auf diese
            Bestimmungen gestütztes Profiling. Die jeweilige
            Rechtsgrundlage, auf der eine Verarbeitung beruht, entnehmen
            Sie dieser Datenschutzerklärung. Wenn Sie Widerspruch einlegen,
            werden wir Ihre betroffenen personenbezogenen Daten nicht mehr
            verarbeiten, es sei denn, wir können zwingende schutzwürdige
            Gründe für die Verarbeitung nachweisen, die Ihre Interessen,
            Rechte und Freiheiten überwiegen oder die Verarbeitung dient
            der Geltendmachung, Ausübung oder Verteidigung von
            Rechtsansprüchen (Widerspruch nach Art. 21 Abs. 1 DSGVO).
          </p>

          <Subheading>
            Beschwerde­recht bei der zuständigen Aufsichts­behörde
          </Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Im Falle von Verstößen gegen die DSGVO steht den Betroffenen
            ein Beschwerderecht bei einer Aufsichtsbehörde, insbesondere
            in dem Mitgliedstaat ihres gewöhnlichen Aufenthalts, ihres
            Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes zu.
            Das Beschwerderecht besteht unbeschadet anderweitiger
            verwaltungsrechtlicher oder gerichtlicher Rechtsbehelfe.
          </p>

          <Subheading>Recht auf Daten­übertrag­barkeit</Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Sie haben das Recht, Daten, die wir auf Grundlage Ihrer
            Einwilligung oder in Erfüllung eines Vertrags automatisiert
            verarbeiten, an sich oder an einen Dritten in einem gängigen,
            maschinenlesbaren Format aushändigen zu lassen. Der Export
            aller Ihrer gespeicherten Daten ist jederzeit möglich unter:{" "}
            <a href="/settings" style={{ color: "var(--accent-amber)" }}>
              Einstellungen → Daten exportieren
            </a>
            .
          </p>

          <Subheading>Auskunft, Berichtigung und Löschung</Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen
            jederzeit das Recht auf unentgeltliche Auskunft über Ihre
            gespeicherten personenbezogenen Daten, deren Herkunft und
            Empfänger und den Zweck der Datenverarbeitung und ggf. ein
            Recht auf Berichtigung oder Löschung dieser Daten. Die Löschung
            Ihres Kontos und aller damit verbundenen Daten ist jederzeit
            möglich unter:{" "}
            <a href="/settings" style={{ color: "var(--accent-amber)" }}>
              Einstellungen → Konto löschen
            </a>
            . Hierzu sowie zu weiteren Fragen zum Thema personenbezogene
            Daten können Sie sich jederzeit an uns wenden.
          </p>

          <Subheading>
            Recht auf Einschränkung der Verarbeitung
          </Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer
            personenbezogenen Daten zu verlangen. Hierzu können Sie sich
            jederzeit an uns wenden. Das Recht auf Einschränkung der
            Verarbeitung besteht in folgenden Fällen:
          </p>
          <ul
            className="list-disc list-inside flex flex-col gap-1 mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            <li>
              Wenn Sie die Richtigkeit Ihrer bei uns gespeicherten
              personenbezogenen Daten bestreiten, benötigen wir in der
              Regel Zeit, um dies zu überprüfen. Für die Dauer der Prüfung
              haben Sie das Recht, die Einschränkung der Verarbeitung
              Ihrer personenbezogenen Daten zu verlangen.
            </li>
            <li>
              Wenn die Verarbeitung Ihrer personenbezogenen Daten
              unrechtmäßig geschah/geschieht, können Sie statt der
              Löschung die Einschränkung der Datenverarbeitung verlangen.
            </li>
            <li>
              Wenn wir Ihre personenbezogenen Daten nicht mehr benötigen,
              Sie sie jedoch zur Ausübung, Verteidigung oder
              Geltendmachung von Rechtsansprüchen benötigen, haben Sie das
              Recht, statt der Löschung die Einschränkung der Verarbeitung
              Ihrer personenbezogenen Daten zu verlangen.
            </li>
            <li>
              Wenn Sie einen Widerspruch nach Art. 21 Abs. 1 DSGVO
              eingelegt haben, muss eine Abwägung zwischen Ihren und
              unseren Interessen vorgenommen werden. Solange noch nicht
              feststeht, wessen Interessen überwiegen, haben Sie das
              Recht, die Einschränkung der Verarbeitung Ihrer
              personenbezogenen Daten zu verlangen.
            </li>
          </ul>

          <Subheading>SSL- bzw. TLS-Verschlüsselung</Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Diese Anwendung nutzt aus Sicherheitsgründen und zum Schutz
            der Übertragung vertraulicher Inhalte eine SSL- bzw.
            TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen
            Sie daran, dass die Adresszeile des Browsers von {`„http://"`} auf
            {`„https://"`} wechselt und an dem Schloss-Symbol in Ihrer
            Browserzeile. Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert
            ist, können die Daten, die Sie an uns übermitteln, nicht von
            Dritten mitgelesen werden.
          </p>

          <Subheading>Widerspruch gegen Werbe-E-Mails</Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Der Nutzung von im Rahmen der Impressumspflicht
            veröffentlichten Kontaktdaten zur Übersendung von nicht
            ausdrücklich angeforderter Werbung und
            Informationsmaterialien wird hiermit widersprochen. Die
            Betreiber behalten sich ausdrücklich rechtliche Schritte im
            Falle der unverlangten Zusendung von Werbeinformationen, etwa
            durch Spam-E-Mails, vor.
          </p>
        </Section>

        {/* ── 4. Datenerfassung in dieser Anwendung ──────────────────────── */}
        <Section title="4. Datenerfassung in dieser Anwendung">
          <Subheading>Cookies</Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Diese Anwendung verwendet ausschließlich technisch notwendige
            Cookies. Ein Cookie-Banner oder eine gesonderte Einwilligung
            sind daher nicht erforderlich (§ 25 Abs. 2 TDDDG).
          </p>
          <p style={{ color: "var(--text-muted)" }}>
            Cookies, die zur Durchführung des elektronischen
            Kommunikationsvorgangs oder zur Bereitstellung bestimmter, von
            Ihnen gewünschter Funktionen erforderlich sind (notwendige
            Cookies), werden auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO
            gespeichert. Der Betreiber hat ein berechtigtes Interesse an
            der Speicherung von notwendigen Cookies zur technisch
            fehlerfreien und optimierten Bereitstellung seiner Dienste.
          </p>
          <table
            className="w-full mt-3 text-xs border-collapse"
            style={{ color: "var(--text-muted)" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th
                  className="text-left py-2 pr-4 font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Cookie
                </th>
                <th
                  className="text-left py-2 pr-4 font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Zweck
                </th>
                <th
                  className="text-left py-2 font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Speicherdauer
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="py-2 pr-4 font-mono">
                  next-auth.session-token
                </td>
                <td className="py-2 pr-4">
                  Authentifizierung (Login-Session) — technisch notwendig
                </td>
                <td className="py-2">30 Tage (oder bis Logout)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono">locale</td>
                <td className="py-2 pr-4">
                  Sprachpräferenz der Benutzeroberfläche — funktional
                </td>
                <td className="py-2">1 Jahr</td>
              </tr>
            </tbody>
          </table>

          <Subheading>Server-Log-Dateien</Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Der Provider dieser Anwendung erhebt und speichert automatisch
            Informationen in so genannten Server-Log-Dateien, die Ihr
            Browser automatisch übermittelt. Dies sind:
          </p>
          <ul
            className="list-disc list-inside mt-1 flex flex-col gap-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            <li>Browsertyp und Browserversion</li>
            <li>Verwendetes Betriebssystem</li>
            <li>Referrer URL</li>
            <li>Hostname des zugreifenden Rechners</li>
            <li>Uhrzeit der Serveranfrage</li>
            <li>IP-Adresse</li>
          </ul>
          <p style={{ color: "var(--text-muted)" }}>
            Eine Zusammenführung dieser Daten mit anderen Datenquellen
            wird nicht vorgenommen. Die Erfassung dieser Daten erfolgt auf
            Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Der Betreiber hat
            ein berechtigtes Interesse an der technisch fehlerfreien
            Darstellung und der Optimierung seiner Anwendung — hierzu
            müssen die Server-Log-Dateien erfasst werden.
          </p>

          <Subheading>Welche Daten wir verarbeiten</Subheading>
          <p style={{ color: "var(--text-muted)" }}>
            Beim Betrieb von Momo werden folgende personenbezogene Daten
            verarbeitet:
          </p>
          <ul
            className="list-disc list-inside mt-1 flex flex-col gap-1"
            style={{ color: "var(--text-muted)" }}
          >
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                Profildaten:
              </strong>{" "}
              Name, E-Mail-Adresse und Profilbild, die beim OAuth-Login vom
              jeweiligen Anbieter übertragen werden.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                Aufgaben und Themen:
              </strong>{" "}
              Von Ihnen erstellte Aufgaben, Themen und zugehörige
              Einstellungen.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                Wunschliste:
              </strong>{" "}
              Von Ihnen eingetragene Wunschlisten-Artikel inkl. Preise.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                Gamification-Daten:
              </strong>{" "}
              Münzstand, Level, Streak-Zähler und freigeschaltete
              Achievements.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                Push-Benachrichtigungen:
              </strong>{" "}
              Bei aktivierten Push-Benachrichtigungen wird ein
              Geräte-Endpunkt (Push-Subscription) gespeichert. Dies
              erfolgt ausschließlich auf Grundlage Ihrer ausdrücklichen
              Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Die Einwilligung
              ist jederzeit widerrufbar unter Einstellungen →
              Benachrichtigungen deaktivieren.
            </li>
          </ul>
          <p className="mt-2" style={{ color: "var(--text-muted)" }}>
            Wir erheben keine Standortdaten, keine Gerätekennungen zu
            Werbezwecken und führen kein Nutzer-Tracking durch.
          </p>
        </Section>

        {/* ── 5. OAuth-Anbieter ──────────────────────────────────────────── */}
        <Section title="5. Login-Dienste (OAuth-Anbieter)">
          <p style={{ color: "var(--text-muted)" }}>
            Die Anmeldung erfolgt ausschließlich über externe
            OAuth-Anbieter. Beim Login-Vorgang werden Daten (Name,
            E-Mail-Adresse, Profilbild) von deren Servern an diese
            Anwendung übertragen. Die Nutzung dieser Dienste erfolgt auf
            Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
            und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
            sicherem, passwortlosem Login). Für die Datenverarbeitung durch
            die jeweiligen Anbieter gelten deren eigene
            Datenschutzerklärungen:
          </p>
          <ul
            className="list-disc list-inside mt-2 flex flex-col gap-1"
            style={{ color: "var(--text-muted)" }}
          >
            <li>
              GitHub:{" "}
              <a
                href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent-amber)" }}
              >
                GitHub Privacy Statement
              </a>
            </li>
            <li>
              Discord:{" "}
              <a
                href="https://discord.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent-amber)" }}
              >
                Discord Privacy Policy
              </a>
            </li>
            <li>
              Google:{" "}
              <a
                href="https://policies.google.com/privacy?hl=de"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent-amber)" }}
              >
                Google Datenschutzerklärung
              </a>
            </li>
          </ul>
          <p className="mt-2" style={{ color: "var(--text-muted)" }}>
            Sofern ein eigener OIDC-Anbieter konfiguriert ist, gilt dessen
            jeweilige Datenschutzerklärung.
          </p>
        </Section>

        {/* ── 6. Fonts ───────────────────────────────────────────────────── */}
        <Section title="6. Schriftarten und Icons (lokales Hosting)">
          <p style={{ color: "var(--text-muted)" }}>
            Diese Anwendung nutzt Google Fonts und Font Awesome. Beide
            Schriftarten und Icons sind{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              lokal auf dem Server installiert
            </strong>
            . Eine Verbindung zu externen Servern (Google, Fonticons Inc.)
            findet dabei nicht statt, sodass keine personenbezogenen Daten
            übertragen werden.
          </p>
        </Section>

        {/* ── 7. Betroffenenrechte (Zusammenfassung) ─────────────────────── */}
        <Section title="7. Ihre Rechte im Überblick (Art. 15–22 DSGVO)">
          <p style={{ color: "var(--text-muted)" }}>
            Sie haben folgende Rechte bezüglich Ihrer personenbezogenen
            Daten:
          </p>
          <ul
            className="list-disc list-inside mt-2 flex flex-col gap-1"
            style={{ color: "var(--text-muted)" }}
          >
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                Auskunft (Art. 15):
              </strong>{" "}
              Auskunft über Ihre gespeicherten Daten.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                Berichtigung (Art. 16):
              </strong>{" "}
              Berichtigung unrichtiger Daten.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                Löschung (Art. 17):
              </strong>{" "}
              Jederzeit möglich unter{" "}
              <a href="/settings" style={{ color: "var(--accent-amber)" }}>
                Einstellungen → Konto löschen
              </a>
              .
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                Einschränkung der Verarbeitung (Art. 18):
              </strong>{" "}
              Unter bestimmten Voraussetzungen.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                Datenübertragbarkeit (Art. 20):
              </strong>{" "}
              Export aller Daten als JSON-Datei unter{" "}
              <a href="/settings" style={{ color: "var(--accent-amber)" }}>
                Einstellungen → Daten exportieren
              </a>
              .
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                Widerspruch (Art. 21):
              </strong>{" "}
              Widerspruch gegen die Verarbeitung Ihrer Daten.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                Beschwerde (Art. 77):
              </strong>{" "}
              Beschwerde bei einer Datenschutz-Aufsichtsbehörde, z. B.
              beim{" "}
              <a
                href="https://www.bfdi.bund.de"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent-amber)" }}
              >
                Bundesbeauftragten für den Datenschutz und die
                Informationsfreiheit (BfDI)
              </a>
              .
            </li>
          </ul>
          <p className="mt-2" style={{ color: "var(--text-muted)" }}>
            Zur Ausübung Ihrer Rechte wenden Sie sich an:{" "}
            <a href={`mailto:${email}`} style={{ color: "var(--accent-amber)" }}>
              {email}
            </a>
          </p>
        </Section>

      </div>
    </article>
  );
}

/** Consistent section wrapper with numbered heading */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
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

/** Bold subheading within a section */
function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-semibold mt-2"
      style={{ color: "var(--text-primary)", fontFamily: "var(--font-ui)" }}
    >
      {children}
    </p>
  );
}
