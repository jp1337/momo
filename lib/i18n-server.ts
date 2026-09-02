/**
 * Translations for server code that runs without a request.
 *
 * `getTranslations` from `next-intl/server` resolves the locale through
 * `next/headers` and only works inside a request scope. Cron jobs (morning
 * briefing, achievement pushes) and the DSGVO data export have no request —
 * they know the user's locale from the `users.locale` column instead.
 *
 * Messages are loaded with the same dynamic import that `i18n/request.ts`
 * uses, so no `messages/*.json` ends up statically bundled.
 */

import { createTranslator } from "next-intl";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/i18n/locales";

/**
 * Builds a translator for one namespace in the given locale.
 *
 * @param locale    - Locale code, e.g. from `users.locale`. Unknown or null
 *                    values fall back to {@link DEFAULT_LOCALE}.
 * @param namespace - Message namespace, e.g. `"achievements"`.
 * @returns A `t(key)` function over that namespace
 */
export async function getServerTranslations(
  locale: string | null | undefined,
  namespace: string
) {
  const resolved: Locale = (LOCALES as readonly string[]).includes(locale ?? "")
    ? (locale as Locale)
    : DEFAULT_LOCALE;

  const messages = (await import(`../messages/${resolved}.json`)).default;

  return createTranslator({ locale: resolved, messages, namespace });
}
