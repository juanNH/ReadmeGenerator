# ADR 0025: Reusing activity data and batching changes

- Status: accepted for implementation.
- Date: 2026-10-20.
- Product: GitHub Profile Generator.
- Extends [ADR 0024](0024-extended-public-suite-and-mit.md).

## Context

Changing the selected counters generated another card URL and another Extended cache entry for the full combination. Queries were repeated even when the data was already available. Rapid clicks could start requests for intermediate configurations that would never be used.

Optimization of queries, caching, and preview was authorized, with tests. GitHub App and production infrastructure will be evaluated later; Vercel Hobby is considered as a possible host.

## Decision

### Coverage by data field and dependencies

Keep the explicit cache in `src/server/github` without enabling Cache Components or introducing services or dependencies. Separate the fields a card needs from its visual options. Counter selection and order, the ranking icon, and language presentation or weighting do not identify new data.

Store explicit coverage per metric or language sample, isolated by user, credential generation, UTC day, and effective filters. Keys include only the dependencies of that field: commit period, inclusion of the user’s own repositories, or repository filters as applicable. Equivalent filters are normalized as sets. In statistics, an absent role filter means no affiliation filter; for languages and stars it means the default set of the user’s own repositories.

Query only missing or expired coverage. Reuse additional fields already returned in the same response without requesting historical data or all 18 metrics in advance. Ranking needs six inputs, and the merged-PR percentage needs total and merged PRs. A queried null or partial value counts as covered; it is not confused with a field that has never been queried and is not replaced with zero.

Coordinate compatible requests already in flight and check for missing data again before querying. Each Extended request keeps a total 60-second budget while waiting on other queries, entering the queue, and accessing the network; network access itself remains limited to 15 seconds and uses the remaining budget. The queue may wait less than its usual maximum of 45 seconds. Keep revalidation when work starts, up to 32 follow-up requests per user, and isolation from prior generations. Identity or configuration failures invalidate the corresponding coverage and do not enable stale results; an invalid credential also invalidates other in-flight queries from that generation.

Each data field retains its own timestamp: adding a new counter does not make older data fresh again. The combined snapshot reports the oldest timestamp used and does not mix time-based metrics from different UTC intervals. Recalculate the plan and missing fields when the query starts because data can expire or the year can change while waiting in the queue. The implicit commit year is shown according to its time interval, not derived from the aggregate timestamp of an older counter. Keep 30-minute freshness, previous results for up to 24 hours only on transient failures, and a maximum of 512 combined data and failure entries per service.

### Preview after a short pause

The Markdown URL and document change immediately. For a card that is already mounted, the preview waits 400 ms after the last change before requesting the new image. The first load and an explicit retry are immediate. Returning to an already loaded image does not require another download.

Keep a valid image for the same identity and show an update notice. Discard late responses and cancel the timer when the card unmounts or is hidden. Changing the user, family, or destination preserves the existing identity separation. Debouncing does not persist images, snapshots, or state in the document.

### Future hosting

The in-memory cache and scheduler remain per process. A new or parallel instance may need to query again; this improvement does not create a shared cache or global quota. The PAT quota remains shared by everyone using that server. SVGs keep their public cache headers for browsers and CDNs.

Vercel Hobby allows personal, non-commercial use and has quotas. Review those terms, Fluid configuration, and the total timeout for each route before deployment. The queue may wait up to 45 seconds before the 15-second network budget; repository cards with contributions may chain two operations. Do not assume an old function’s default duration is sufficient. This decision does not configure or publish a deployment.

## Alternatives considered

- Prefetch all 18 metrics and all historical data: increases initial cost and requests data that may never be used.
- Keep a cache per option combination: multiplies entries and repeats data when counters are added or removed.
- Delay the document or Markdown: makes copying, saving, and preview show different configurations.
- Add a database, remote cache, or GitHub App: requires operational decisions outside this change.
- Migrate to framework caches: does not guarantee shared storage with the current configuration and expands the change without solving incremental coverage by itself.

## Consequences

Editing appearance or reusing loaded counters avoids additional GitHub queries while the coverage is fresh. A new counter may require a network request and remains subject to latency, quotas, and public limits. Batching clicks avoids intermediate images; requests already started keep the server budgets.

The persisted v2 contract, accepted URLs, public filters, license, and export requirements remain unchanged. Tests must measure requests and verify coverage, age, failures, credentials, rapid changes, and late responses. Results actually obtained are recorded in [development](../development.md).

## Official sources

- [Vercel Hobby](https://vercel.com/docs/plans/hobby): terms and quotas, reviewed October 20, 2026.
- [Function limits](https://vercel.com/docs/functions/limitations): with Fluid, Hobby allows up to 300 seconds; without Fluid, the default is 10 and the configurable maximum is 60.
- [CDN cache](https://vercel.com/docs/caching/cdn-cache) and [cache-control headers](https://vercel.com/docs/caching/cache-control-headers).
- Documentation for the installed Next.js version in `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md` and `04-functions/unstable_cache.md`.
