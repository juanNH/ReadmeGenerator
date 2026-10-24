# ADR 0043: Explicit Public Card Checks Before Export

- Status: accepted.
- Date: 2026-10-23.
- Complements [ADR 0036](0036-production-card-origin.md) and [ADR 0041](0041-activity-contribution-order-and-readable-cards.md).

## Context

The editor renders cards from browser snapshots into temporary Blob images. An HTTPS origin that passes syntax validation may still require a hosting session, return HTML, lack newly generated options, or have no available provider data. A protected Vercel deployment redirects anonymous images to SSO, and a deployment older than the two-column contract rejects `columns=2`. A working local preview proves neither public availability nor deployment compatibility.

## Decision

Keep the pure generator and its configured-origin requirement. Before copying or downloading a README with cards, offer **Check public cards** as an explicit action. Do not query while mounting, restoring a draft, changing options or displaying the preview. Without cards, export remains immediate. A successful result unlocks export for five minutes for the exact ordered image URLs. Changing those URLs, removing cards, reloading, or expiration invalidates the result without a new request. Ordinary text edits do not change card availability. Verification is temporary UI state, outside the profile, Markdown, backups and data caches.

Use `POST /api/cards/export-check` with `{ sources: string[] }`. The server parses canonical card URLs only against its configured public origin. It never accepts another host, a redirect destination, a non-card path or arbitrary fetch options. The result is a small validated union in `core/activity/export-check`, with no response bodies, credentials or infrastructure headers.

The server sends anonymous `HEAD` requests with `credentials: omit`, `redirect: manual` and `cache: no-store`. It forwards no incoming cookies, authorization or headers. HTTP 200, an SVG MIME type and `X-Activity-State: ready | stale` are required. Redirects or 401/403 indicate protected access; 400/404 indicate incompatible routes/options; an unavailable image, invalid response, network failure, timeout or busy process has a separate result. Stale images are reported as cached data.

Bounds per process are 32 input URLs, 12,000 characters per URL, 512 KiB of JSON, five seconds to read the body, four simultaneous outbound requests, one concurrent check, 12 checks and 60 outbound requests per minute. Requests have 15-second timeouts and a 30-second overall check budget. Duplicate sources are checked once. Failure or client cancellation stops pending work; no automatic retries or unbounded queues are added. These are process limits, not distributed quotas.

The editor explains failure, offers a manual retry, opens an exported image in another tab, and lets the person exclude cards while keeping settings. It does not download a knowingly failed set. The separate verification action also keeps clipboard writes inside a later user click, avoiding lost clipboard activation after a network wait.

## Alternatives and Consequences

- Checking only origin syntax misses protected and incompatible deployments. Silently dropping exported options would change the selected output.
- Following redirects could accept a login page or contact another host. Loading the image with visitor cookies would test their session instead of anonymous access.
- Automatic checks on each edit add traffic and contradict the explicit-query flow. Hosting static snapshots would require a new upload and publication flow.
- Checks can time out on a cold or slow service; the UI reports an incomplete check and allows manual retry. Existing server/CDN caches still apply. HEAD headers do not certify future availability, the SVG body, GitHub Camo or rendering in every reader.
- Operators must publish a compatible version at a stable public origin. This check changes neither deployment protection nor hosting configuration. Previously downloaded READMEs retain their old URLs and need regenerating after configuration is corrected.

The command-line card checker also accepts the bounded `columns=1|2` option emitted by the current generator.
