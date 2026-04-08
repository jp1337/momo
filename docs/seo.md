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
  metadata URLs to absolute ones)
- `app/robots.ts` → `Sitemap:` and `Host:` lines in `/robots.txt`
- `app/sitemap.ts` → every `<loc>` entry
- `app/page.tsx` → JSON-LD `url` field

If you change the canonical domain, no other code needs to be touched.

## Indexable routes

| Route          | Indexed | Notes                                                                     |
| -------------- | :-----: | ------------------------------------------------------------------------- |
| `/`            | ✅      | Landing page. Carries the JSON-LD `SoftwareApplication` schema.           |
| `/impressum`   | ✅      | Required by § 5 DDG. Has its own canonical URL.                           |
| `/datenschutz` | ✅      | DSGVO privacy policy. Has its own canonical URL.                          |
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

> ⚠️ **`public/og-image.png` is not committed yet.** Until the asset is
> created, link previews will fall back to the generic Momo icon. Drop a
> 1200×630 PNG with the Momo wordmark + Lora italic tagline at
> `public/og-image.png` and OG/Twitter cards light up automatically.

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
