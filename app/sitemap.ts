/**
 * /sitemap.xml — typed Next.js Metadata Route.
 *
 * Lists every public, indexable route. Authenticated app routes, the API
 * surface and the API docs are intentionally omitted (they are also blocked
 * via robots.ts). next-intl runs cookie-based without URL prefixes, so each
 * route is a single canonical URL — no per-locale fan-out and no hreflang
 * alternates are needed.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

import type { MetadataRoute } from "next";
import { clientEnv } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = clientEnv.NEXT_PUBLIC_APP_URL;
  const lastModified = new Date();

  return [
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${base}/login`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${base}/impressum`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/datenschutz`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
