# ADR 0031: Persist Public Activity Data in the Browser

- Status: Accepted for implementation.
- Date: 2026-10-20.
- Product: GitHub Profile Generator.
- Extends [ADR 0030](0030-all-profile-counters-prefetch.md) and replaces the editor's memory-only cache from [ADR 0027](0027-browser-activity-data-cache.md).

## Context

Search now prepares all 18 counters, but the data was lost on reload because it lived only in RAM. The request was to retain each person's first complete load in the browser and reuse it when adding components, without requiring persistent backend storage.

## Decision

Store the public-data cache in the browser's native IndexedDB, using a versioned format separate from `ProfileDocument`, draft localStorage, project files, and Markdown. Preserve identity, filters, period, and original timestamp; store only validated, bounded entries. Do not store tokens, credentials, query authorization, errors, pending requests, SVGs, or Blob URLs.

Freshness remains 30 minutes from the original query; older data may be shown as such for up to 24 hours. Recovery does not refresh timestamps. Expired entries are cleaned up on access or save; the browser is not expected to run tasks while the app is closed. Entry count and size remain bounded, and the cache is disposable.

Reuse requires a matching scope and UTC day. Crossing that date or an implicit year boundary may leave a request pending until Search; retaining earlier rows does not authorize mixing periods or querying automatically.

Restore asynchronously on mount without HTTP. Covered data can be shown and customized directly. Restoring data does not authorize new requests: missing or expired data waits for Search in a session that has not searched yet. Search waits for the initial read to avoid duplicating an existing load. Typing a username, opening forms, or recovering a draft does not query GitHub.

Batch asynchronous writes and confirm “saved” only after the transaction completes. Until then, indicate that data is being saved. Unmounting or reloading cancels in-flight work and retains the cache. Deleting, starting, importing, replacing, or restoring the profile purges the cache and its activation, invalidating previous reads, writes, and responses. The extra effect cycle in Strict Mode must not purge the cache or leave the session unusable.

If IndexedDB fails, is blocked, or reaches its quota, continue with RAM and explain that the data will remain available only while the editor is open. The draft and its protection mechanisms do not depend on saving this cache.

## Alternatives Considered

- RAM only: reuses data during editing but does not meet the reload request.
- localStorage: suitable for small data; its synchronous API and string storage are less appropriate for potentially large snapshots.
- sessionStorage: synchronous and limited to the tab; it does not provide IndexedDB's asynchronous operations.
- Remote cache service: introduces infrastructure outside the requested scope.

IndexedDB can store structured data with asynchronous, origin-scoped operations. Retention also depends on the browser, quotas, and site-data eviction. Do not request persistent-storage permission or show additional notices. Sources: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [transaction complete](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event), and [quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

## Consequences

Each browser/device keeps its own copy; it is not synced across people or origins. Later visits may reuse data without application requests while it remains available. The first load or a new scope still goes through the server to protect the token; this does not remove quotas or guarantee support for thousands of new searches.

## Verification

Check reload with fresh data and zero HTTP requests, expiration without automatic queries, identity/scope, invalid cache, limits, blocked storage/quota, Strict Mode, and reset during reads/writes. Keep snapshots out of the profile and its backups. Results are recorded in [Development](../development.md).
