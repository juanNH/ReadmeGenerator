# ADR 0029: Search for the Account Before Choosing Cards

- Status: Accepted. [ADR 0030](0030-all-profile-counters-prefetch.md) extends prefetching to all 18 counters in the current scope.
- Date: 2026-10-20.
- Product: GitHub Profile Generator.
- Extends [ADR 0027](0027-browser-activity-data-cache.md) and replaces its requirement to search again for each new coverage scope.

## Context

Searching at the end of the form required choosing cards first and returning to that button to load new counters. The requested flow was to enter a user, search, and then choose components using the information already loaded.

## Decision

Place “Search data” immediately below the username. The action works without selected cards: it loads the basic snapshot and default Extended statistics and languages in parallel through two grouped JSON requests. It does not prefetch historical data, specific filters, or unknown destinations. It also supports selected resources with valid destinations even when there is no GitHub user.

Searching explicitly activates that account for the editor session. Choosing cards or changing their options afterward reuses available data and requests only missing or expired coverage, batching changes over 300 ms. Valid applied and selected resources can load after that first search. Errors remain visible and do not trigger continuous automatic retries.

Mounting, recovering, opening, or typing a user that has not been searched does not make requests. Switching to another identity requires Search; a previous response cannot be shown as data for the new account. Replacing, importing, restoring, or deleting the profile clears the cache and activation. ADR 0027's validation, concurrency and memory limits, and partial-data handling remain in place. Snapshots remain outside the document and persistent storage.

Search shows progress and errors even when no cards are selected. The preview continues to render allowed SVGs locally. The optional search for highlighted contributions retains its separate action.

Show the public-origin notice beside export actions, with text that distinguishes local search from publishing. The lack of a public origin continues to block card export; excluding cards preserves their configuration and allows the rest to be exported.

## Alternatives Considered

- Keep selection-first: requires configuring cards before retrieving information and was rejected during flow review.
- Prefetch all historical data and resources: adds cost and wait time for options that may not be selected.
- Search while typing the username: does not preserve the requested explicit action and can query incomplete identities.

## Verification

Check Search without cards, button placement, zero network traffic before the action, reuse after selection, batched missing data, errors without loops, account switching, applied resources, and reset. Preserve the export block and keyboard/mobile flows. Executed results are recorded in [Development](../development.md).
