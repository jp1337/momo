/**
 * Custom 404 Not Found page.
 *
 * Shown when a user navigates to a route that doesn't exist.
 * Matches Momo's "warme Dämmerung" aesthetic with Lora headings,
 * amber accent colour, and a gentle floating animation.
 *
 * This is a Server Component — no interactivity needed.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("errors");
  return { title: t("not_found_title") };
}

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <div className="error-page">
      {/* Floating error code */}
      <span className="error-code error-float" aria-hidden="true">
        404
      </span>

      {/* Decorative divider */}
      <div className="error-divider" />

      {/* Headline */}
      <h1 className="error-heading">
        {t("not_found_heading")}
      </h1>

      {/* Subtext */}
      <p className="error-subtext">
        {t("not_found_text_1")}
        <br />
        {t("not_found_text_2")}
      </p>

      {/* CTA */}
      <Link href="/" className="error-cta">
        {t("back_to_app")}
      </Link>
    </div>
  );
}
