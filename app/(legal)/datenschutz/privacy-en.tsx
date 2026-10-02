/**
 * English privacy policy body for /datenschutz — a translation of
 * privacy-de.tsx, same sections in the same order. Change both together.
 */

import { Section, Subheading, type PrivacyProps } from "../legal-parts";

/**
 * Renders the English privacy policy.
 *
 * @param props - Operator details from the NEXT_PUBLIC_IMPRINT_* env vars
 * @returns The policy sections
 */
export function PrivacyEn({ name, email, address, phone }: PrivacyProps) {
  return (
    <>
      <p className="text-[var(--text-muted)]">
        This is a translation provided for your convenience. In case of
        doubt, the{" "}
        <a href="/datenschutz?lang=de" hrefLang="de">
          German version
        </a>{" "}
        prevails.
      </p>

      {/* ── 1. Privacy at a glance ─────────────────────────────────────── */}
      <Section title="1. Privacy at a glance">
        <Subheading>General information</Subheading>
        <p className="text-[var(--text-muted)]">
          The following gives a simple overview of what happens to your
          personal data when you use this application. Personal data is any
          data that can identify you personally. Detailed information
          follows in the privacy policy below.
        </p>

        <Subheading>Data collection in this application</Subheading>
        <p className="text-[var(--text-muted)]">
          <strong className="text-[var(--text-primary)]">Who is responsible for data collection?</strong>
          <br />
          Data in this application is processed by the operator, whose
          contact details are listed under &ldquo;Controller&rdquo; below.
        </p>
        <p className="text-[var(--text-muted)]">
          <strong className="text-[var(--text-primary)]">How do we collect your data?</strong>
          <br />
          Your data is collected when you sign in through an OAuth provider
          (GitHub, Discord, Google or a custom OIDC provider). The provider
          transfers your name, email address and profile picture to this
          application. Further data (tasks, topics, wishlist items) you enter
          yourself. Technical data (e.g. IP address, browser type) is
          recorded automatically when you access the server.
        </p>
        <p className="text-[var(--text-muted)]">
          <strong className="text-[var(--text-primary)]">What do we use your data for?</strong>
          <br />
          Solely to provide the application&apos;s features. There is no
          user tracking, no behavioural analysis and no sharing for
          advertising purposes.
        </p>
        <p className="text-[var(--text-muted)]">
          <strong className="text-[var(--text-primary)]">What rights do you have?</strong>
          <br />
          You may at any time, free of charge, obtain information about the
          origin, recipients and purpose of your stored personal data. You
          also have the right to have it corrected or erased, to withdraw
          any consent for the future, to request restriction of processing
          under certain circumstances, and to lodge a complaint with the
          competent supervisory authority. Contact us at any time about this
          or any other privacy question.
        </p>
      </Section>

      {/* ── 2. Hosting ─────────────────────────────────────────────────── */}
      <Section title="2. Hosting">
        <p className="text-[var(--text-muted)]">
          This application runs on a server in Germany operated by Hetzner
          Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Germany (
          <a
            href="https://www.hetzner.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Hetzner privacy policy
          </a>
          ). Personal data collected in this application is stored on that
          server. This may include IP addresses, contact requests, meta and
          communication data, contract data, contact details, names, page
          accesses and other data generated through a website.
        </p>
        <p className="text-[var(--text-muted)]">
          The hoster is used to fulfil our contract with existing and
          prospective users (Art. 6(1)(b) GDPR) and in our legitimate
          interest in a secure, fast and efficient provision of our service
          by a professional provider (Art. 6(1)(f) GDPR).
        </p>
        <p className="text-[var(--text-muted)]">
          Where consent has been requested, processing is based solely on
          Art. 6(1)(a) GDPR and § 25(1) TDDDG; consent can be withdrawn at
          any time.
        </p>
        <p className="text-[var(--text-muted)]">
          Our hoster processes your data only as far as necessary to fulfil
          its obligations and follows our instructions regarding this data.
          We have concluded a data processing agreement (Art. 28 GDPR) with
          our hosting provider.
        </p>
      </Section>

      {/* ── 3. General information and mandatory disclosures ───────────── */}
      <Section title="3. General information and mandatory disclosures">
        <Subheading>Data protection</Subheading>
        <p className="text-[var(--text-muted)]">
          The operators of this application take the protection of your
          personal data very seriously. We treat your personal data
          confidentially and in accordance with the statutory data
          protection regulations and this privacy policy.
        </p>
        <p className="text-[var(--text-muted)]">
          Please note that data transmitted over the internet (e.g. by
          email) can have security gaps. Complete protection of data against
          access by third parties is not possible.
        </p>

        <Subheading>Controller</Subheading>
        <p className="text-[var(--text-muted)]">The controller responsible for data processing in this application is:</p>
        <address className="not-italic mt-1 flex flex-col gap-1 text-[var(--text-muted)]">
          <span className="text-[var(--text-primary)] font-medium">{name}</span>
          {address.split("\n").map((line, i) => (
            <span key={i}>{line}</span>
          ))}
          {phone && <span>Phone: {phone}</span>}
          <span>
            Email:{" "}
            <a href={`mailto:${email}`}>
              {email}
            </a>
          </span>
        </address>
        <p className="text-[var(--text-muted)]">
          The controller is the natural or legal person who, alone or
          jointly with others, decides on the purposes and means of
          processing personal data (e.g. names, email addresses).
        </p>

        <Subheading>Storage period</Subheading>
        <p className="text-[var(--text-muted)]">
          Unless a more specific storage period is stated in this privacy
          policy, your personal data remains with us until the purpose for
          processing it no longer applies. If you make a justified request
          for erasure or withdraw your consent, your data will be deleted
          unless we have other legally permissible reasons for storing it;
          in that case it is deleted once those reasons cease to apply.
        </p>

        <Subheading>Legal bases of processing</Subheading>
        <p className="text-[var(--text-muted)]">
          If you have consented to processing, we process your personal data
          on the basis of Art. 6(1)(a) GDPR. If your data is required to
          perform a contract or pre-contractual measures, we process it on
          the basis of Art. 6(1)(b) GDPR. Where processing is necessary to
          comply with a legal obligation, it is based on Art. 6(1)(c) GDPR.
          Processing may also be based on our legitimate interest under
          Art. 6(1)(f) GDPR.
        </p>

        <Subheading>Withdrawal of your consent</Subheading>
        <p className="text-[var(--text-muted)]">
          Many processing operations are only possible with your express
          consent. You can withdraw consent you have given at any time. The
          lawfulness of processing carried out before the withdrawal remains
          unaffected.
        </p>

        <Subheading>
          Right to object to data collection in special cases and to direct
          marketing (Art. 21 GDPR)
        </Subheading>
        <p className="uppercase text-xs leading-relaxed text-[var(--text-muted)]">
          If processing is based on Art. 6(1)(e) or (f) GDPR, you have the
          right to object at any time, on grounds relating to your
          particular situation, to the processing of your personal data;
          this also applies to profiling based on these provisions. The
          legal basis of each processing operation is stated in this privacy
          policy. If you object, we will no longer process the personal data
          concerned unless we can demonstrate compelling legitimate grounds
          for the processing which override your interests, rights and
          freedoms, or the processing serves the establishment, exercise or
          defence of legal claims (objection under Art. 21(1) GDPR).
        </p>

        <Subheading>Right to lodge a complaint with a supervisory authority</Subheading>
        <p className="text-[var(--text-muted)]">
          In the event of a breach of the GDPR, data subjects have the right
          to lodge a complaint with a supervisory authority, in particular in
          the Member State of their habitual residence, place of work or the
          place of the alleged infringement. This right is without prejudice
          to any other administrative or judicial remedies.
        </p>

        <Subheading>Right to data portability</Subheading>
        <p className="text-[var(--text-muted)]">
          You have the right to receive data that we process automatically
          on the basis of your consent or to perform a contract, in a
          common, machine-readable format, for yourself or a third party.
          You can export all your stored data at any time under{" "}
          <a href="/settings">
            Settings → Export data
          </a>
          .
        </p>

        <Subheading>Access, rectification and erasure</Subheading>
        <p className="text-[var(--text-muted)]">
          Within the applicable legal provisions you have the right at any
          time to free information about your stored personal data, its
          origin and recipients and the purpose of processing, and where
          applicable a right to rectification or erasure. You can delete
          your account and all associated data at any time under{" "}
          <a href="/settings">
            Settings → Delete account
          </a>
          . Contact us at any time about this or other questions concerning
          personal data.
        </p>

        <Subheading>Right to restriction of processing</Subheading>
        <p className="text-[var(--text-muted)]">
          You have the right to request restriction of the processing of
          your personal data. You can contact us about this at any time. The
          right to restriction applies in the following cases:
        </p>
        <ul className="list-disc list-inside flex flex-col gap-1 mt-1 text-[var(--text-muted)]">
          <li>
            If you dispute the accuracy of the personal data we hold, we
            usually need time to verify it. For the duration of the check
            you may request restriction of processing.
          </li>
          <li>
            If the processing of your personal data was or is unlawful, you
            may request restriction instead of erasure.
          </li>
          <li>
            If we no longer need your personal data but you need it to
            exercise, defend or establish legal claims, you may request
            restriction instead of erasure.
          </li>
          <li>
            If you have lodged an objection under Art. 21(1) GDPR, your
            interests and ours must be weighed. As long as it has not been
            determined whose interests prevail, you may request restriction
            of processing.
          </li>
        </ul>

        <Subheading>SSL/TLS encryption</Subheading>
        <p className="text-[var(--text-muted)]">
          For security reasons and to protect the transmission of
          confidential content, this application uses SSL/TLS encryption.
          You can recognise an encrypted connection by the browser&apos;s
          address bar changing from &ldquo;http://&rdquo; to
          &ldquo;https://&rdquo; and by the lock icon. With SSL/TLS
          encryption active, the data you send us cannot be read by third
          parties.
        </p>

        <Subheading>Objection to advertising emails</Subheading>
        <p className="text-[var(--text-muted)]">
          We hereby object to the use of the contact details published under
          our legal notice obligation for sending unsolicited advertising
          and information material. The operators expressly reserve the
          right to take legal action in the event of unsolicited
          advertising, such as spam emails.
        </p>
      </Section>

      {/* ── 4. Data collection in this application ─────────────────────── */}
      <Section title="4. Data collection in this application">
        <Subheading>Cookies</Subheading>
        <p className="text-[var(--text-muted)]">
          This application uses only technically necessary cookies. A cookie
          banner or separate consent is therefore not required (§ 25(2)
          TDDDG).
        </p>
        <p className="text-[var(--text-muted)]">
          Cookies required to carry out the electronic communication or to
          provide functions you have requested (necessary cookies) are
          stored on the basis of Art. 6(1)(b) GDPR. The operator has a
          legitimate interest in storing necessary cookies for the
          technically error-free and optimised provision of its services.
        </p>
        <table className="w-full mt-3 text-xs border-collapse text-[var(--text-muted)]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 pr-4 font-medium text-[var(--text-primary)]">
                Cookie
              </th>
              <th className="text-left py-2 pr-4 font-medium text-[var(--text-primary)]">
                Purpose
              </th>
              <th className="text-left py-2 font-medium text-[var(--text-primary)]">
                Storage period
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--border)]">
              <td className="py-2 pr-4 font-mono">next-auth.session-token</td>
              <td className="py-2 pr-4">Authentication (login session) — technically necessary</td>
              <td className="py-2">30 days (or until logout)</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-mono">locale</td>
              <td className="py-2 pr-4">Interface language preference — functional</td>
              <td className="py-2">1 year</td>
            </tr>
          </tbody>
        </table>

        <Subheading>Server log files</Subheading>
        <p className="text-[var(--text-muted)]">The web server records every request to this application in server log files:</p>
        <ul className="list-disc list-inside mt-1 flex flex-col gap-1 text-[var(--text-muted)]">
          <li>Time of the request</li>
          <li>Requested host name, method, path including query parameters, and protocol</li>
          <li>HTTP status code, amount of data transferred and response times</li>
          <li>Referrer URL</li>
          <li>User agent (browser type, version and operating system)</li>
          <li>
            IP address, truncated only: the first two blocks for IPv4 (/16),
            the first 48 bits for IPv6 (/48). The full IP address is not
            stored.
          </li>
        </ul>
        <p className="text-[var(--text-muted)]">
          On the server, the log files are rotated daily and deleted after
          15 days at the latest. They are also transferred, encrypted, to a
          central log store that the operator runs on their own hardware in
          Germany (no service provider), where they are deleted after one
          year at the latest. This store serves solely to investigate
          security incidents; it is not analysed routinely, only when an
          incident calls for it.
        </p>
        <p className="text-[var(--text-muted)]">
          This data is not combined with other data sources. It is collected
          on the basis of Art. 6(1)(f) GDPR: the operator has a legitimate
          interest in the technically error-free presentation, optimisation
          and security of the application, including the investigation of
          attacks, which requires server log files.
        </p>

        <Subheading>What data we process</Subheading>
        <p className="text-[var(--text-muted)]">Running Momo involves processing the following personal data:</p>
        <ul className="list-disc list-inside mt-1 flex flex-col gap-1 text-[var(--text-muted)]">
          <li>
            <strong className="text-[var(--text-primary)]">Profile data:</strong> name, email address
            and profile picture transferred by the respective provider at
            OAuth login.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Tasks and topics:</strong> the tasks,
            topics and related settings you create.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Wishlist:</strong> the wishlist items you
            enter, including prices.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Gamification data:</strong> coin balance,
            level, streak counters and unlocked achievements.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Session data:</strong> for every signed-in
            session, the IP address and user agent are stored so that you can
            see and sign out your devices under Settings → Security and are
            warned when a new device signs in (Art. 6(1)(f) GDPR). They are
            deleted with the session: on logout, on revocation, or at the
            latest one day after the session expires (30 days).
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Push notifications:</strong> if you enable
            push notifications, a device endpoint (push subscription) is
            stored. This happens solely on the basis of your express consent
            (Art. 6(1)(a) GDPR), which you can withdraw at any time under
            Settings → disable notifications.
          </li>
        </ul>
        <p className="mt-2 text-[var(--text-muted)]">
          We do not collect location data or advertising device identifiers,
          and we do not track users.
        </p>
      </Section>

      {/* ── 5. Login services (OAuth providers) ────────────────────────── */}
      <Section title="5. Login services (OAuth providers)">
        <p className="text-[var(--text-muted)]">
          Sign-in works exclusively through external OAuth providers. During
          login, data (name, email address, profile picture) is transferred
          from their servers to this application. These services are used on
          the basis of Art. 6(1)(b) GDPR (performance of contract) and
          Art. 6(1)(f) GDPR (legitimate interest in secure, passwordless
          login). Processing by the providers is governed by their own
          privacy policies:
        </p>
        <ul className="list-disc list-inside mt-2 flex flex-col gap-1 text-[var(--text-muted)]">
          <li>
            GitHub:{" "}
            <a
              href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Privacy Statement
            </a>
          </li>
          <li>
            Discord:{" "}
            <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer">
              Discord Privacy Policy
            </a>
          </li>
          <li>
            Google:{" "}
            <a
              href="https://policies.google.com/privacy?hl=en"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Privacy Policy
            </a>
          </li>
        </ul>
        <p className="mt-2 text-[var(--text-muted)]">
          If a custom OIDC provider is configured, its own privacy policy
          applies.
        </p>
      </Section>

      {/* ── 6. Fonts ───────────────────────────────────────────────────── */}
      <Section title="6. Fonts and icons (hosted locally)">
        <p className="text-[var(--text-muted)]">
          This application uses Google Fonts and Font Awesome. Both are{" "}
          <strong className="text-[var(--text-primary)]">installed locally on the server</strong>.
          No connection to external servers (Google, Fonticons Inc.) is
          made, so no personal data is transferred.
        </p>
      </Section>

      {/* ── 7. Your rights at a glance ─────────────────────────────────── */}
      <Section title="7. Your rights at a glance (Art. 15–22 GDPR)">
        <p className="text-[var(--text-muted)]">You have the following rights regarding your personal data:</p>
        <ul className="list-disc list-inside mt-2 flex flex-col gap-1 text-[var(--text-muted)]">
          <li>
            <strong className="text-[var(--text-primary)]">Access (Art. 15):</strong> information
            about your stored data.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Rectification (Art. 16):</strong>{" "}
            correction of inaccurate data.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Erasure (Art. 17):</strong> possible at any
            time under{" "}
            <a href="/settings">
              Settings → Delete account
            </a>
            .
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Restriction of processing (Art. 18):</strong>{" "}
            under certain conditions.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Data portability (Art. 20):</strong> export
            of all data as a JSON file under{" "}
            <a href="/settings">
              Settings → Export data
            </a>
            .
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Objection (Art. 21):</strong> objection to
            the processing of your data.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Complaint (Art. 77):</strong> complaint to
            a data protection supervisory authority, e.g. the German{" "}
            <a href="https://www.bfdi.bund.de" target="_blank" rel="noopener noreferrer">
              Federal Commissioner for Data Protection and Freedom of
              Information (BfDI)
            </a>
            .
          </li>
        </ul>
        <p className="mt-2 text-[var(--text-muted)]">
          To exercise your rights, contact:{" "}
          <a href={`mailto:${email}`}>
            {email}
          </a>
        </p>
      </Section>
    </>
  );
}
