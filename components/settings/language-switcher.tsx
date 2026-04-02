"use client";

/**
 * LanguageSwitcher — language selection buttons shown on the settings page.
 *
 * Calls POST /api/locale to persist the locale cookie, then
 * refreshes the router so server components re-render with the new locale.
 */

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LOCALES } from "@/i18n/locales";
import type { Locale } from "@/i18n/locales";

interface LanguageSwitcherProps {
  currentLocale: string;
}

const LOCALE_FLAGS: Record<string, string> = {
  de: "🇩🇪",
  en: "🇬🇧",
  fr: "🇫🇷",
};

/**
 * Renders a button for each supported locale.
 * The active locale button is highlighted.
 */
export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter();
  const t = useTranslations("language");

  const setLocale = async (locale: Locale) => {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    router.refresh();
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          onClick={() => setLocale(locale)}
          disabled={locale === currentLocale}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            backgroundColor:
              locale === currentLocale
                ? "var(--accent-amber)"
                : "var(--bg-elevated)",
            color:
              locale === currentLocale
                ? "var(--bg-primary)"
                : "var(--text-muted)",
            border: `1px solid ${locale === currentLocale ? "var(--accent-amber)" : "var(--border)"}`,
            cursor: locale === currentLocale ? "default" : "pointer",
          }}
          aria-pressed={locale === currentLocale}
          aria-label={t(locale)}
        >
          <span>{LOCALE_FLAGS[locale] ?? locale.toUpperCase()}</span>
          <span>{t(locale)}</span>
        </button>
      ))}
    </div>
  );
}
