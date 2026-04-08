/**
 * /robots.txt — typed Next.js Metadata Route.
 *
 * Tells search engines which paths are crawlable. Only the public marketing
 * surface is allowed; the authenticated app shell, the auth flows beyond
 * /login, the API surface, and operator-only routes are explicitly
 * disallowed.
 *
 * The sitemap URL is built from `NEXT_PUBLIC_APP_URL` so that selfhosters
 * automatically get the correct absolute URL in their robots.txt.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */

import type { MetadataRoute } from "next";
import { clientEnv } from "@/lib/env";

/**
 * Force dynamic rendering so the sitemap URL and host always reflect the
 * *runtime* value of `NEXT_PUBLIC_APP_URL` — see the matching comment in
 * `app/sitemap.ts` for the full rationale.
 */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");

  // Routes that apply to every non-archive crawler.
  // `/impressum` and `/datenschutz` are in the disallow list because they
  // expose the operator's real name + postal address — the pages must be
  // reachable for § 5 DDG / DSGVO, but search engines must not index them.
  // Belt and braces: each page also carries `noindex, nofollow, noarchive`
  // metadata (see app/(legal)/*/page.tsx).
  const disallowAll = [
    "/impressum",
    "/datenschutz",
    "/dashboard",
    "/tasks",
    "/topics",
    "/wishlist",
    "/quick",
    "/focus",
    "/review",
    "/stats",
    "/admin",
    "/settings",
    "/api-keys",
    "/api-docs",
    "/setup/",
    "/login/2fa",
    "/api/",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login"],
        disallow: disallowAll,
      },
      // Explicit opt-out for archive.org crawlers. The Internet Archive
      // officially stopped honouring robots.txt in 2017, but they still
      // respect `noarchive` and explicit deny rules for `ia_archiver` /
      // `archive.org_bot` as an additional signal on top of the per-page
      // `noarchive` meta tag. We list them here as a best-effort layer —
      // the page-level meta tag is the primary defence.
      {
        userAgent: ["ia_archiver", "archive.org_bot", "Wayback Machine"],
        disallow: "/",
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
