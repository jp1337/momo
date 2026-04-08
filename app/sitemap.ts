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

/**
 * Force dynamic rendering on every request so the sitemap always reflects
 * the *runtime* value of `NEXT_PUBLIC_APP_URL`. Without this, Next.js would
 * statically pre-render the sitemap at build time and freeze whatever
 * `NEXT_PUBLIC_APP_URL` was set to during `next build` — which in the
 * default Dockerfile is `http://localhost:3000`. Self-hosters would then
 * have to rebuild the image every time they change their public URL, and
 * any mismatch between build-arg and runtime env would silently point
 * Googlebot at the wrong domain.
 */
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  const lastModified = new Date();

  // Note: /impressum and /datenschutz are intentionally NOT listed.
  // They carry the operator's real name and postal address — they must
  // be reachable for § 5 DDG / DSGVO compliance, but neither search
  // engines nor the Internet Archive should mirror them. They are also
  // marked `noindex, nofollow, noarchive` on the page level and
  // disallowed in robots.ts.
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
  ];
}
