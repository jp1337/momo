/**
 * Translations for server code that runs without a request.
 *
 * Cron jobs (morning briefing, achievement pushes) and the DSGVO data export
 * run without a request scope. They know the user's locale from the
 * `users.locale` column — not from a cookie or a header.
 *
 * **Do not replace this with `getTranslations({ locale })` from
 * `next-intl/server`.** It looks like it would work, and it does not:
 * next-intl's `getConfig` invokes the `i18n/request.ts` callback *even when a
 * locale override is passed*, and that callback (`i18n/request.ts:31`) takes
 * no parameters and calls `await cookies()` unconditionally. So the explicit
 * locale is ignored and `next/headers` runs anyway — which throws outside a
 * request in a real Next.js runtime, not just under vitest.
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
