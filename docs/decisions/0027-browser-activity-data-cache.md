# ADR 0027: Fetch Public Data by Coverage and Render Cards in the Browser

- Status: Accepted. The search flow is extended in [ADR 0029](0029-account-first-activity-search.md), which allows searching before choosing cards and automatically fetching missing data afterward.
- Date: 2026-10-20.
- Product: GitHub Profile Generator.
- Extends [ADR 0025](0025-activity-data-cache-and-preview-batching.md) and replaces the editor URL approval from [ADR 0026](0026-explicit-card-loading-and-local-samples.md).

## Context

Choosing from samples avoids requests while configuring, but each new appearance still requires an HTTP SVG. Prefetching JSON and then requesting that SVG does not guarantee reuse in a deployment with multiple instances. The requested flow was a centralized search, temporary browser caching, loading animation, and requests only for missing information.

## Decision

`useActivityData` coordinates an in-memory cache for the mounted editor instance. “Search and show cards” requests the existing JSON endpoints for the union of needed data, with up to three sources in flight at once. The five built-in cards share the basic snapshot; Extended groups compatible statistics and languages; each resource and its contributions retain independent identities and dependencies. GitHub and WakaTime access stays on the server with its existing limits.

The cache validates envelopes, snapshots, and identity. Extended records coverage from the requested plan: a queried null or partial value is a result, while a field that was not requested remains missing. Data keys share pure rules with the server and distinguish user, filters, and effective periods; they exclude appearance, order, language, and local language transformations. Adding a counter requests only missing coverage. The first search, new data, and expired data require explicit action; changing a covered option updates the preview immediately.

Freshness is 30 minutes from the original data timestamp, with temporal invalidation at UTC boundaries where applicable. Older results retain their age and status; adding fields does not make them fresh again. The cache limits entry count and memory; it is not persisted in `ProfileDocument`, browser storage, project files, or Markdown. Replacing, importing, restoring, deleting, or starting a draft cancels in-flight work and clears data. A late response cannot restore it.

Each card shows an animated sample while its information is missing and an error with retry when appropriate. Independent successes can appear without waiting for the rest. Animation respects the reduced-motion preference; states and names use the interface language. Zero, absence, and partial data retain distinct meanings.

### Local preview and public output

The preview recognizes the same exact URLs from `ReadmeResult.activityCards?` and uses the pure SVG renderers from `core`, shared with the public routes. A temporary Blob URL wraps only the internally generated SVG in an image element; no markup is inserted into the DOM. Each URL is revoked when changed or unmounted. User-written SVG, Blob images in the document, and broader HTML are not allowed.

URLs, Markdown, card links, and export errors remain those produced by the generator. Public SVGs remain dynamic and fetch data according to their cache. Browser caching improves editing in that tab; it is not a distributed cache, does not multiply the PAT quota, and does not eliminate infrastructure needs for large-scale traffic.

## Alternatives Considered

- Prefetch every metric: historical data, searches, and external destinations add cost and wait time even when unused.
- Prefetch JSON and continue requesting SVGs: keeps network round trips and can repeat data across server instances.
- Save snapshots in the profile or localStorage: mixes ephemeral data with user-authored content and complicates recovery of expired data.
- Cache only by user: mixes filters, periods, and resources with different scopes.
- Treat every null as coverage: hides fields that were never requested.
- Render a separate README for the preview: diverges from copy/download output; keep the same Markdown and resolve only the allowed cards differently.

## Verification

Check that there are no requests before Search, that basic and Extended requests are grouped, only missing data is requested, customization makes no HTTP SVG/JSON requests, original freshness is retained, filter/year keys are distinct, queried nulls count as coverage, memory limits apply, cancellation/reset works, partial errors and retries behave as expected. Compare output from the same renderers and confirm that credentials are never exposed and snapshots are not saved. Executed results are recorded in [Development](../development.md).
