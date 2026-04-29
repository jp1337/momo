"use client";

/**
 * LanguageSwitcher — language selection buttons shown on the settings page.
 *
 * Uses Radix UI ToggleGroup (single-select) — gives roving tabindex (one Tab
 * stop per group, arrow keys to move between items) and ARIA radiogroup
 * semantics. Calls POST /api/locale to persist the locale cookie, then
 * refreshes the router so server components re-render with the new locale.
 */

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { LOCALES } from "@/i18n/locales";
import type { Locale } from "@/i18n/locales";

interface LanguageSwitcherProps {
  currentLocale: string;
}

const LOCALE_FLAGS: Record<string, string> = {
  de: "🇩🇪",
  en: "🇬🇧",
  fr: "🇫🇷",
  es: "🇪🇸",
  nl: "🇳🇱",
};

const LOCALE_LABELS: Record<string, string> = {
  de: "Deutsch",
  en: "English",
  fr: "Français",
  es: "Español",
  nl: "Nederlands",
};

/**
 * Renders a button for each supported locale.
 * The active locale button is highlighted.
 */
export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter();
  const t = useTranslations("language");

  const setLocale = async (value: string) => {
    if (!value || value === currentLocale) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: value }),
    });
    router.refresh();
  };

  return (
    <ToggleGroup.Root
      type="single"
      value={currentLocale}
      onValueChange={setLocale}
      aria-label={t("label")}
      className="flex gap-2 flex-wrap"
    >
      {LOCALES.map((locale) => (
        <ToggleGroup.Item
          key={locale}
          value={locale}
          aria-label={t(locale as Locale)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 outline-none focus-visible:ring-2"
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
        >
          <span>{LOCALE_FLAGS[locale] ?? locale.toUpperCase()}</span>
          <span>{LOCALE_LABELS[locale] ?? locale.toUpperCase()}</span>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
