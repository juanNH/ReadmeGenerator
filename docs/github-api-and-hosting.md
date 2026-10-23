# GitHub API, credentials, and hosting

This guide explains how the public integration uses data and what to consider before hosting it on Vercel. External conditions were checked against official sources on October 20, 2026; check them again before publishing or changing plans.

## When the app makes requests

Having someone in the editor does not mean GitHub is queried continuously. The actions they take, the data they are missing, and the available caches all matter.

| Action                                                      | Remote data usage                                                                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Enter a username or configure cards before selecting Search | The document changes locally; no requests are triggered.                                                                               |
| View sample thumbnails                                      | These are local examples, with no personal statistics and no requests to GitHub or WakaTime.                                           |
| Select Search data below the username                       | Loads basic data, all 18 counters, and languages for the current scope through two JSON requests; adds any missing selected resources. |
| Select or remove counters after a search                    | The 18 counters already queried are rendered locally, with no additional HTTP SVG or JSON requests.                                    |
| Change the year, filters, or a resource target              | Different data may be needed; changes are grouped for 300 ms and missing coverage is queried.                                          |
| View a published README with cards                          | Its SVG URLs may request data again when no reusable response or cached data is available.                                             |

In a published README, each image may cause an HTTP request to this application; that is not necessarily a request to GitHub. In the editor, cards are rendered from validated, temporary public-data snapshots: the five built-in cards share one source, and Extended groups compatible statistics and languages. A complex source may require several external calls for pagination or different metrics. WakaTime queries its own public service and does not use the GitHub PAT quota.

Preloading all 18 counters may increase the initial search duration and usage compared with preloading only six. Two browser JSON requests do not mean two GitHub calls or two GitHub points. The app respects each service's budget and partial-data behavior; it does not promise an unlimited history. See [ADR 0030](decisions/0030-all-profile-counters-prefetch.md).

The browser cache keeps coverage and age by user, filters, and period in IndexedDB, separate from the profile. After a reload or when returning to the editor, it restores available data without HTTP requests or permission to query automatically. Fresh coverage is reused directly; missing or expired data waits for an explicit Search action in the restored session. A user with no data needs an initial search. Preview SVGs use internal, revocable Blob URLs; their links and the Markdown keep the public URLs. Unmounting preserves the store; replacing or clearing the profile purges it and invalidates earlier work. If storage fails, the app uses RAM and reports that. Profile images follow a separate policy. See [ADR 0031](decisions/0031-browser-persistent-activity-cache.md).

The button prevents accidental queries while someone configures a profile. Card endpoints remain public so GitHub can load README images; anyone can also request them directly. This UI control reduces work, but it is not a global usage limit.

## What using your key means

`GITHUB_TOKEN` contains the deployment owner's PAT and is used only on the server. Visitors provide a public username; they do not need to sign in or enter their own token. All authenticated queries from that instance use the account quota associated with the owner's PAT.

The implementation accepts a dedicated classic PAT whose permissions can be verified as empty or limited to `public_repo`; it queries public information only and rejects broader permissions or credentials it cannot verify. This is an application restriction; it does not mean GitHub recommends classic tokens for every integration. See [local setup](development.md) and the [public activity decision](decisions/0010-github-activity.md).

The token must never appear in client-side code, a `NEXT_PUBLIC_` variable, the README, a URL, the project JSON, or a commit. Configure `GITHUB_TOKEN` as a server-only environment secret before enabling authenticated GitHub queries. It grants authentication capabilities and must be protected like a password; use an expiration date and revoke it if exposed. [GitHub: managing and securing personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

The project's `GITHUB_TOKEN` variable name does not make it the automatic GitHub Actions token; they are separate mechanisms.

## GitHub quotas

| API, with a PAT from a standard account | Typical primary limit   | Unit                               |
| --------------------------------------- | ----------------------- | ---------------------------------- |
| REST                                    | 5,000 per hour per user | HTTP requests to the REST API.     |
| GraphQL                                 | 5,000 per hour per user | Points; cost depends on the query. |

REST and GraphQL have separate primary budgets. Creating more PATs for the same account does not create separate personal quotas. Some REST endpoints, such as search, have stricter limits. Secondary limits also apply to concurrency, bursts, and consumed resources; they may be reached before the hourly limit. Respect `Retry-After` and the reset time reported by GitHub. [GitHub: REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

A GraphQL call does not always cost one point. Connections and the amount of data affect query cost; expensive queries can exhaust limits or return partial results. The `x-ratelimit-*` headers show the relevant budget. Quotas and formulas may change. [GitHub: GraphQL rate and query limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api).

**Hypothetical example:** if 1,000 different users each caused three new REST requests within one hour, that would be 3,000 REST requests. This is an illustrative calculation, not a measurement of this application or an estimate of GraphQL points. Actual cost depends on cards, filters, pagination, cache behavior, and other applications using the same account.

## What the application reuses

| Layer        | Where it lives                               | What it shares                                                                                                             |
| ------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Browser data | RAM and temporary IndexedDB for that browser | Customization and reloads with available data; it does not serve other visitors or sync across devices.                    |
| Server data  | RAM in each process                          | Compatible queries handled by that same process; it is not shared with other instances.                                    |
| CDN          | Vercel's network after deployment            | Cacheable public responses for the same URL, especially SVGs; current Extended and resource JSON responses use `no-store`. |

Local development does not use Vercel's CDN. Browser caching does not add to the token quota or avoid the first queries from other users. The same public card may benefit from a CDN; different profiles or filters use different keys and may need new work.

IndexedDB keeps structured data with asynchronous operations, scoped to its origin. Entries are considered fresh for 30 minutes after a query, and older entries may be displayed for up to 24 hours; cleanup runs when data is accessed or saved. A completed transaction confirms the save. The cache may disappear if site data is cleared or the browser evicts it; when blocked, out of quota, or unavailable, the editor continues in RAM. The app does not request special persistent-storage permission. Sources: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) and [browser storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

- **Extended data:** coverage by metric or language sample, fresh for 30 minutes. Changing colors, order, or layout reuses compatible data; a missing value may need a network request. Each field keeps its own age.
- **Matching in-flight requests:** share work within the same process. Compatible requests check again for missing data before querying.
- **SVG responses:** ready cards send `max-age=300` for browsers and `s-maxage=1800` for shared caches. Earlier responses may be reused on errors through `stale-if-error=86400`. Earlier responses have shorter deadlines. Extended JSON and resource responses use `no-store`; the basic API keeps public headers and its form queries with `cache: "no-store"`.
- **Transient failures:** the server may return complete earlier coverage for up to 24 hours, marked as stale. A missing value is not changed to zero; a nonexistent identity or invalid credential does not enable this fallback.

Extended limits its combined data and failure entries to 512. This is a memory limit per service and process, not capacity for 512 users across the whole site. There are separate caches for basic activity and resources. See [ADR 0025](decisions/0025-activity-data-cache-and-preview-batching.md).

Extended and resources share up to four active queries per process, 60 starts per minute, and a queue of 32 with a maximum wait of 45 seconds. Extended also limits each request to 60 seconds total, including waits, and up to 15 seconds of network time within the remaining duration. These numbers limit local operations; they do not represent available GitHub calls. Basic activity keeps its own limit of four queries and 60 starts per minute.

A CDN can serve the same SVG without running the server again. Vercel supports these directives, but retention is best effort and may vary by region or eviction; verify behavior in a deployment using `x-vercel-cache`. [Vercel: CDN cache](https://vercel.com/docs/caching/cdn-cache), [cache-control headers](https://vercel.com/docs/caching/cache-control-headers).

The unavailable-state SVG may also return HTTP 200 and does not by itself activate CDN `stale-if-error`. The service has its own policy for earlier data, so card states must be checked in addition to HTTP status.

## Getting started with Vercel Hobby

The [step-by-step guide](vercel-deployment.md) describes `vercel.json`, the `main` and `dev` branches and their Vercel environments, variables, and anonymous card checks. The current implementation uses a classic PAT, with no login or GitHub App.

Hobby may be a starting point for this personal project while its use remains non-commercial. Publishing the repository under MIT does not, by itself, determine whether a deployment complies with those conditions. Hobby has quotas; when exceeded, the affected resource generally becomes unavailable until the period specified by Vercel has elapsed, usually up to 30 days. [Vercel: Hobby terms](https://vercel.com/docs/plans/hobby).

The published monthly Hobby quotas when this guide was reviewed are:

| Resource                       | Included usage |
| ------------------------------ | -------------- |
| Active function CPU with Fluid | 4 hours.       |
| Provisioned memory with Fluid  | 360 GB-hours.  |
| Function invocations           | 1,000,000.     |
| CDN requests                   | 1,000,000.     |
| Fast Data Transfer             | 100 GB.        |
| Fast Origin Transfer           | 10 GB.         |

Sources: [Fluid function usage](https://vercel.com/docs/functions/usage-and-pricing) and [Hobby quotas](https://vercel.com/docs/plans/hobby). Waiting for an external API does not consume active CPU during that wait, but memory continues to count while the instance handles requests. An invocation counts even if it fails.

With Fluid, the published Hobby maximum duration is 300 seconds and memory is 2 GB with one vCPU. Before deployment, verify the effective route configuration and duration; chained operations may take longer than one Extended query. [Vercel: function limits](https://vercel.com/docs/functions/limitations).

Vercel may reuse instances and run multiple requests in one process; it also creates other instances and scales their number with traffic. This behavior and the `Map` objects used by this project mean **the current cache and limits are not shared across all processes or persisted**. A new instance may repeat a query already handled by another one. [Vercel: function lifecycle](https://vercel.com/docs/functions), [Fluid and global state](https://vercel.com/docs/fluid-compute).

## If thousands of people show up

Thousands of visitors reading local content or an SVG already served by a CDN create a different load from thousands of people querying different profiles at the same time. This implementation does not guarantee a number of concurrent users, and no load test demonstrates that capacity on Hobby.

The recommendation is to start free with controlled traffic and measure cache hits, external queries by family, latency, GitHub limits, and Vercel usage. Before promoting large-scale use, evaluate shared data caching, global limits and deduplication, endpoint protection, observability, and an operating budget. These decisions may require additional infrastructure or services, which are not configured yet.

GitHub App can be evaluated at that stage based on the authorization model. An installation token may have an installation-specific quota and bounded scaling; a user token remains subject to its personal budget. An App does not remove GitHub or Vercel limits. [GitHub: installation and user quotas](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), [GraphQL App quotas](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api).

Choosing cards from samples and searching explicitly helps start with lower usage. Production readiness should be decided from those measurements, without assuming a free host offers unlimited capacity.

## Initial observation procedure

For each review, record the date and time zone, dashboard range, environment, and deployed commit. Separate editor requests (`/api/github/*`) from public images (`/cards/*`); README reader traffic may come through GitHub/Camo and does not represent a search initiated in the editor.

| Evidence                       | What to record                                                                                                                                                                                                       | Interpretation limits                                                                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vercel Usage/Functions         | Invocations, active CPU, and provisioned memory for the selected range, where available for the plan and compute type ([Vercel Functions usage and pricing](https://vercel.com/docs/functions/usage-and-pricing)).   | This is aggregate project usage; do not attribute it to a card without route-level data to support that conclusion.                                                                                          |
| Vercel Usage/CDN               | CDN requests (Edge Requests) and Fast Data Transfer for the selected range ([CDN pricing and usage](https://vercel.com/docs/manage-cdn-usage)).                                                                      | An aggregate total does not identify readers, profiles, or origin.                                                                                                                                           |
| Vercel Observability/Functions | Per-route invocations, errors, and duration; latency when available for the plan ([Observability Insights](https://vercel.com/docs/observability/insights), [Observability](https://vercel.com/docs/observability)). | Route-level metrics describe a function route, not whether an individual card caused a GitHub API call.                                                                                                      |
| Card response                  | Route template with usernames redacted, non-sensitive options, time, HTTP status, and `X-Vercel-Cache` and `X-Activity-State` when present.                                                                          | `X-Vercel-Cache` reports only CDN state. A `HIT` describes one URL in one request and region; it does not show whether GitHub was called or runtime data was reused, or demonstrate hits for other variants. |
| GitHub                         | GraphQL quota before and after a controlled operation, safely using the same account as the deployment PAT.                                                                                                          | The account quota may include other applications and activity; it is not a site-specific counter.                                                                                                            |
| Controlled walkthrough         | One explicit editor search and two consecutive requests to the same public card; record each result and timestamp.                                                                                                   | Do not run artificial concurrency or repeat this with many users or variants.                                                                                                                                |

For a controlled walkthrough, choose an appropriate public profile and a card with no private data, confirm that the deployed site is the expected production site, and check the GitHub budget before starting. Treat the first image request as a cold-cache observation only if the header confirms it; then repeat the exact same URL to observe reuse. If headers or dashboards do not support attributing an observation, record the field as “unavailable” instead of inferring it.

The current implementation does not keep a persistent counter by route or provider. Application caches and limits are per process; aggregate Vercel usage or the GitHub account quota cannot determine how many GitHub calls a specific card caused. Do not save PATs, authorization headers, profile responses, or URLs containing other people's data in screenshots or reports. Initial measurements should establish a baseline before numeric alerts are defined; no operational thresholds have been measured yet.

If GitHub starts rate-limiting requests, respect `Retry-After` and the indicated reset time, avoid repeated searches, and check whether earlier data remains available within its retention window. An unavailable card must remain unavailable, not be replaced with zeros. If the server credential is revoked or removed, GitHub queries will no longer be configured; manual README creation without activity cards remains available. WakaTime is an independent source and must be reviewed separately. If the PAT is exposed, revoke and replace it through the server's secure configuration; never copy it to the client, README, or a report.
