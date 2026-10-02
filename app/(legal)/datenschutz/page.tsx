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
 * Zwei Fassungen (Art. 12 DSGVO: Sprache der Zielgruppe): privacy-de.tsx und
 * privacy-en.tsx. Gewählt wird per `?lang=de|en`, sonst nach UI-Sprache —
 * Deutsch für `de`, Englisch für alle anderen Locales.
 *
 * Betreiberangaben werden aus Umgebungsvariablen geladen:
 *   NEXT_PUBLIC_IMPRINT_NAME    — Name des Verantwortlichen
 *   NEXT_PUBLIC_IMPRINT_ADDRESS — Adresse des Verantwortlichen
 *   NEXT_PUBLIC_IMPRINT_EMAIL   — Datenschutz-Kontakt
 *   NEXT_PUBLIC_IMPRINT_PHONE   — Telefon (optional)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { PrivacyDe } from "./privacy-de";
import { PrivacyEn } from "./privacy-en";

type SearchParams = Promise<{ lang?: string }>;

/** `?lang=de|en` wins; otherwise German for the `de` UI locale, English for all others. */
async function resolveLang(searchParams: SearchParams): Promise<"de" | "en"> {
  const { lang } = await searchParams;
  if (lang === "de" || lang === "en") return lang;
  return (await getLocale()) === "de" ? "de" : "en";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const lang = await resolveLang(searchParams);
  return { ...metadata, title: COPY[lang].title, description: COPY[lang].description };
}

const metadata: Metadata = {
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

const COPY = {
  de: {
    back: "← Zurück",
    title: "Datenschutzerklärung",
    description:
      "DSGVO-konforme Datenschutzerklärung für die öffentliche Momo-Instanz: welche Daten verarbeitet werden und warum.",
    other: { href: "/datenschutz?lang=en", hrefLang: "en", label: "English version" },
  },
  en: {
    back: "← Back",
    title: "Privacy Policy",
    description:
      "GDPR privacy policy for the public Momo instance: what data is processed and why.",
    other: { href: "/datenschutz?lang=de", hrefLang: "de", label: "Deutsche Fassung" },
  },
} as const;

export default async function DatenschutzPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const lang = await resolveLang(searchParams);
  const copy = COPY[lang];

  const name = process.env.NEXT_PUBLIC_IMPRINT_NAME ?? "[Betreibername nicht konfiguriert]";
  const email = process.env.NEXT_PUBLIC_IMPRINT_EMAIL ?? "[E-Mail nicht konfiguriert]";
  const address = process.env.NEXT_PUBLIC_IMPRINT_ADDRESS ?? "[Adresse nicht konfiguriert]";
  const phone = process.env.NEXT_PUBLIC_IMPRINT_PHONE;

  const isConfigured =
    !!process.env.NEXT_PUBLIC_IMPRINT_NAME &&
    !!process.env.NEXT_PUBLIC_IMPRINT_EMAIL;

  const Policy = lang === "de" ? PrivacyDe : PrivacyEn;

  return (
    <article lang={lang} className="flex flex-col gap-8">
      <div className="flex justify-between gap-4 text-sm font-[family-name:var(--font-ui)]">
        <Link href="/login" className="text-[var(--accent-amber)]!">
          {copy.back}
        </Link>
        <Link
          href={copy.other.href}
          hrefLang={copy.other.hrefLang}
          lang={copy.other.hrefLang}
          className="text-[var(--text-muted)]"
        >
          {copy.other.label}
        </Link>
      </div>

      <h1
        className="text-3xl font-semibold"
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--text-primary)",
        }}
      >
        {copy.title}
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

      <div className="flex flex-col gap-10 text-sm leading-relaxed text-[var(--text-primary)] font-[family-name:var(--font-ui)]">
        <Policy name={name} email={email} address={address} phone={phone} />
      </div>
    </article>
  );
}
