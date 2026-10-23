# ADR 0038: Production Indexing and Localized Canonical URLs

- Status: Accepted.
- Date: 2026-10-22.

## Context

The localized layout disabled indexing in every environment. The app now has public home, About, and Privacy pages in English and Spanish. It also has an editor, internal tools, API routes, and SVG cards that must not appear in search results or the sitemap. The domain must come from validated public configuration, not the `Host` header or a temporary Preview URL.

By default, `next-intl` generates language links in the response `Link` header. The project also needs canonical links in the initial HTML and consistent localized sitemap entries.

## Decision

- On Vercel, allow indexing only when `VERCEL_ENV` is exactly `production` and a valid public HTTPS origin is available. On self-hosted servers, require `PUBLIC_SITE_INDEXING_ENABLED=true` together with `NODE_ENV=production`. Preview and development remain `noindex`, even when `APP_URL` contains a valid origin.
- Resolve the public origin from `APP_URL` or from `VERCEL_PROJECT_PRODUCTION_URL` exclusively on Vercel Production, using the validation policy in [ADR 0036](0036-production-card-origin.md). Never build canonical URLs from the request.
- Disable `next-intl` automatic alternates and generate explicit `canonical` and `hreflang` values for the localized home, About, and Privacy routes. Each language is canonical to itself.
- Include those three routes in both languages in the sitemap. Exclude the editor, design system, unknown routes, APIs, and cards.
- Keep `Allow: /` in `robots.txt` so search engines can read `noindex` directives. Exclude the editor and 404 pages from indexing through metadata; add `X-Robots-Tag: noindex, nofollow` to APIs and cards.
- The root route keeps its language redirect; `/en` and `/es` are its canonical destinations.

## Alternatives Considered

- Keep `next-intl` automatic alternates and omit per-route canonicals: rejected because this does not define each page's canonical URL and may split metadata between response headers and HTML tags.
- Canonicalize every page to English: rejected because it would exclude Spanish pages.
- Include every route for automatic discovery: rejected because it could expose internal routes, APIs, or cards as indexable content.
- Block Preview in `robots.txt`: rejected because this would prevent search engines from reading those pages' `noindex` directives; `robots.txt` does not control access.
- Infer the origin from `Host`, `VERCEL_URL`, or branch aliases: rejected because these can produce request-controlled or temporary canonical URLs.

## Consequences

Production HTML must contain absolute canonical and alternate URLs for each public page; the sitemap must list exactly the six localized public URLs. Preview and development generate neither canonical URLs nor a sitemap, and their pages remain `noindex`. Search Console access and social network checks remain separate external verifications.

See also [Vercel Deployment](../vercel-deployment.md) and [Stable Card Origin](0036-production-card-origin.md).
