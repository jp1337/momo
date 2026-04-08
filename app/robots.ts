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

export default function robots(): MetadataRoute.Robots {
  const base = clientEnv.NEXT_PUBLIC_APP_URL;

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/impressum", "/datenschutz"],
        disallow: [
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
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
