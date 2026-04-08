# SEO

How Momo presents itself to search engines and social link previews.

## Goal

Make the public Momo instance discoverable on Google, Bing & friends, and
make shared links look polished on Twitter / Mastodon / Slack — without
exposing any of the authenticated app surface to crawlers.

The hosted demo lives at `momotask.app`; the same setup works for any
selfhosted instance as long as `NEXT_PUBLIC_APP_URL` is configured.

## Canonical domain

Everything SEO-related is built around `NEXT_PUBLIC_APP_URL`. It must be
set to the **public HTTPS origin** in production (no trailing slash, no
path):

```env
NEXT_PUBLIC_APP_URL=https://momotask.app
```

The value is consumed by:

- `app/layout.tsx` → `metadata.metadataBase` (resolves all relative
  metadata URLs to absolute ones, including `og:image` and the
  canonical link)
- `app/robots.ts` → `Sitemap:` and `Host:` lines in `/robots.txt`
  (forced dynamic — always reads runtime env)
- `app/sitemap.ts` → every `<loc>` entry
  (forced dynamic — always reads runtime env)
- `app/page.tsx` → JSON-LD `url`, `logo` and `image` fields
- `lib/webauthn.ts` → derives the Passkey Relying Party ID
- `app/api/calendar/[token]/route.ts` → absolute URL in the iCal feed

### ⚠️ Build-time vs runtime — the `NEXT_PUBLIC_*` gotcha

Next.js **inlines every `NEXT_PUBLIC_*` variable into the client bundle and
into any statically pre-rendered HTML at `next build` time**. Setting the
variable later via `docker run -e NEXT_PUBLIC_APP_URL=...` has no effect on
already-baked artefacts such as Open Graph meta tags, JSON-LD, canonical
link tags, or the metadata of static pages. Those freeze whatever value
was present during the build.

What this means in practice:

| Surface | Respects runtime env? | Why |
|---|---|---|
| `/sitemap.xml` (`app/sitemap.ts`) | ✅ Yes | Marked `export const dynamic = "force-dynamic"` as a safety net |
| `/robots.txt` (`app/robots.ts`) | ✅ Yes | Same safety net |
| `/api/calendar/<token>.ics` | ✅ Yes | API route, always runtime-dynamic |
| WebAuthn RP ID | ✅ Yes | Derived at request time in `lib/webauthn.ts` |
| `<link rel="canonical">` on pre-rendered pages | ❌ No | Frozen at build time |
| `<meta property="og:*">` tags | ❌ No | Frozen at build time |
| JSON-LD payload on the landing page | ⚠️ Sometimes | Dynamic only because `auth()` + `getTranslations()` make the landing page dynamic; other statically generated pages freeze it |

**Conclusion:** to get SEO right, `NEXT_PUBLIC_APP_URL` must be set at
**build time**, not just at runtime. The container image needs to be
rebuilt whenever the public URL changes.

### Baking the URL into the Docker image

The Dockerfile accepts `NEXT_PUBLIC_APP_URL` as an `ARG` in the build
stage. Pass it explicitly when building:

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://momotask.app \
  -t momo .
```

With Docker Compose, set `NEXT_PUBLIC_APP_URL` in your `.env` file (or
shell) before running `docker compose build` or `docker compose up
--build`. The value is forwarded automatically via `build.args` in
`docker-compose.yml`.

For Kubernetes users: the stock `ghcr.io/jp1337/momo` image published by
the GitHub Actions workflow bakes in `https://momotask.app` by default.
If you run a different public domain, rebuild the image with your own
build-arg and push it to your own registry — the runtime env in the K8s
Secret cannot patch the baked-in HTML.

If you change the canonical domain, rebuild the image — no other code
needs to be touched.

## Indexable routes

| Route          | Indexed | Notes                                                                     |
| -------------- | :-----: | ------------------------------------------------------------------------- |
| `/`            | ✅      | Landing page. Carries the JSON-LD `SoftwareApplication` schema.           |
| `/impressum`   | ❌      | **Intentionally excluded** — carries the operator's real name and postal address. Marked `noindex, nofollow, noarchive, nosnippet, noimageindex` on the page level, disallowed in `robots.txt`, and not listed in `sitemap.xml`. The page itself remains reachable (required by § 5 DDG) but no search engine or the Internet Archive should mirror it. |
| `/datenschutz` | ❌      | Same no-index / no-archive stance as `/impressum` — the DSGVO page repeats the same private contact data. |
| `/login`       | ❌      | `noindex` — login pages have no SEO value and pollute SERPs.              |
| `/login/2fa`   | ❌      | Disallowed via `robots.txt`.                                              |
| `/api-docs`    | ❌      | `noindex` (set on `(docs)/layout.tsx`) + disallowed via `robots.txt`.     |
| `/setup/2fa`   | ❌      | Operator hard-lock page; never useful in SERPs.                           |
| `/dashboard`, `/tasks`, `/topics`, `/wishlist`, `/quick`, `/focus`, `/review`, `/stats`, `/admin`, `/settings`, `/api-keys` | ❌ | All authenticated app routes — disallowed via `robots.txt`. Crawlers also can't reach them anyway because the layout enforces auth. |
| `/api/*`       | ❌      | Disallowed via `robots.txt`.                                              |

`robots.txt` is generated at request time by `app/robots.ts`, `sitemap.xml`
by `app/sitemap.ts`. Both use the typed `MetadataRoute` API from Next.js
— no static files in `public/`.

## Open Graph & Twitter Cards

The root metadata in `app/layout.tsx` declares:

- `openGraph.siteName`, `locale: "de_DE"`, `type: "website"`
- `openGraph.images[0]` → `/og-image.png` (1200×630, expected to live in
  `public/og-image.png`)
- `twitter.card: "summary_large_image"` with the same image

`public/og-image.png` is a 1200×630 PNG with the Momo feather mark and
the "Steal your time back" tagline. It ships as part of the repo and is
generated from `app/icon.svg` via a one-off script so rebuilding it is
reproducible.

## Structured data (JSON-LD)

The landing page (`app/page.tsx`) embeds a single
`SoftwareApplication` schema as `<script type="application/ld+json">`.
Fields included:

- `name`, `description`, `url`
- `applicationCategory: "ProductivityApplication"`
- `operatingSystem: "Web"`
- `inLanguage: ["de", "en", "fr"]`
- `offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }`
- `author` (jp1337 → GitHub profile)

The payload is built by `buildSoftwareAppJsonLd()` in `app/page.tsx`. To
add `aggregateRating`, `screenshot`, or other fields, extend that function.

## i18n & hreflang

Momo's i18n (next-intl) is **cookie-based without URL prefixes** — every
locale serves the same URL. That means hreflang alternates would all point
at the same `<loc>`, which carries no information. The sitemap therefore
contains **one entry per route**, not three.

If routing ever migrates to URL-prefixed locales (`/de/...`, `/en/...`),
both `app/sitemap.ts` and `app/layout.tsx` need to gain `alternates.languages`
hreflang entries.

## Verifying locally

```bash
npm run dev

# robots.txt: should disallow /api/, /dashboard, …
curl -s http://localhost:3000/robots.txt

# sitemap.xml: should list / + 3 public pages
curl -s http://localhost:3000/sitemap.xml

# OG / Twitter / JSON-LD on the landing page
curl -s http://localhost:3000/ | grep -E '(og:|twitter:|application/ld\+json)'

# /login should carry noindex
curl -s http://localhost:3000/login | grep -i 'noindex'
```

For an external schema check, run the resulting HTML through the
[Google Rich Results Test](https://search.google.com/test/rich-results).

## Possible follow-ups

- **OG image asset** — design and commit `public/og-image.png` (1200×630).
- **Search Console verification** — add a `<meta name="google-site-verification">`
  driven by an env var, e.g. `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
- **Dynamic OG images** — `@vercel/og` per-route OG generation if static
  becomes too limiting.
- **BreadcrumbList schema** — for `/api-docs`, `/impressum`, `/datenschutz`.
- **`alternates.languages`** — required if/when next-intl adopts URL-prefix
  routing.
