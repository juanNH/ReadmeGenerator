# ADR 0030: Prepare All Counters in the Current Scope

- Status: Accepted. [ADR 0031](0031-browser-persistent-activity-cache.md) adds temporary retention in browser IndexedDB.
- Date: 2026-10-20.
- Product: GitHub Profile Generator.
- Extends [ADR 0029](0029-account-first-activity-search.md) and replaces its prefetch of only six default counters.

## Context

Searching before choosing cards prepared common data, but selecting merged pull requests, followers, or other counters still requested more coverage. The user clarified that the initial search should prepare every counter and that choosing them afterward should be local. They also asked to distinguish caches and consider consumption at thousands of users.

## Decision

Search prepares the basic snapshot and all 18 Extended counters, along with languages. The current statistics and language options are loaded into the session even when no cards have been selected yet: period, year, inclusion of owned repositories, and filters are preserved. A seed includes every ID to request coverage; it does not modify the document, selection, ranking, or persisted defaults.

Selecting, removing, or reordering counters and customizing their appearance uses the prepared data, with no additional HTTP JSON or SVG requests. Queried zeros, nulls, and partial values retain their meaning and do not trigger retries when a checkbox changes. Errors allow an explicit retry. Changing the user, period, or filters defines a different scope; after the account is activated, missing coverage for that scope can be requested while batching changes over 300 ms.

Preparing all counters does not mean querying every year, possible filter, or unknown resource. Time, request, history, pagination, and memory limits remain in place. Repositories, Gists, and WakaTime still require applied destinations and selected cards. Private data is not queried.

## Cost and Caching

Two editor JSON requests are not equivalent to two GitHub calls: the server groups queries, paginates, and retrieves different families. Prefetching every metric may use more time and quota during the initial search than requesting only the six defaults. This choice prioritizes later customization without network round trips, as explicitly requested.

The tab retains ephemeral data per editor; the server shares its RAM only within each process. Extended and resource JSON responses continue to use `no-store`; public SVGs retain headers for shared caching. No distributed cache is added, and this does not demonstrate capacity for large-scale traffic. The token remains exclusively on the server and its quota is shared. The [API and hosting guide](../github-api-and-hosting.md) explains these differences.

## Alternatives Considered

- Keep six counters and load the others when selected: lowers initial cost but does not meet the requested interaction.
- Prefetch every combination of years and filters: has unbounded space and consumption without a concrete data need.
- Add a shared-cache service now: an infrastructure decision remains pending and could introduce accounts and costs outside this scope.

## Verification

Check that all 18 requested metrics are loaded even with no cards selected, current filters are preserved, later selection makes no requests, new scopes request missing coverage, errors do not loop, and privacy is maintained. Record results in [Development](../development.md).
