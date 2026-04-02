/**
 * next-intl request configuration.
 *
 * Determines the active locale for each incoming request using:
 *  1. `locale` cookie (set by the language switcher in settings)
 *  2. Accept-Language request header (browser preference)
 *  3. Default locale: "de"
 *
 * Adding a new language: drop a new messages/XX.json file and add "XX" to LOCALES.
 */

import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "./locales";
export type { Locale } from "./locales";
export { LOCALES, DEFAULT_LOCALE } from "./locales";

/**
 * Extracts the best-matching locale from an Accept-Language header value.
 * Returns the default locale if no match is found.
 */
function detectFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  for (const part of acceptLanguage.split(",")) {
    const code = part.split(";")[0].trim().toLowerCase().slice(0, 2) as Locale;
    if ((LOCALES as readonly string[]).includes(code)) return code;
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();

  const cookieLocale = cookieStore.get("locale")?.value as Locale | undefined;
  const locale: Locale =
    cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)
      ? cookieLocale
      : detectFromHeader(headersList.get("accept-language"));

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
