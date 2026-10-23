# ADR 0010: Optional activity and first-party GitHub cards

- Status: accepted for implementation; actual enablement depends on deployment configuration.
- Date: 2026-10-19.
- Product: GitHub Profile Generator.

## Context

The editor has five sections and serves people with little public activity. Calendar, summary, languages, and highlighted contributions were requested without making them profile requirements. `ProfileDocument` v1 already represents the username and cards in `metrics` and manual contributions in `contributions`; its nine IDs must be retained without migration.

GitHub data depends on the time period, credential permissions, and limits. A broad token can expose private information that this product must not publish. An image referenced from a README needs a public server: localhost allows review but cannot host images GitHub can access.

## Decision

### One section, independent choices

Use **Activity and contributions** in the `contributions` slot, with effective inclusion `visibility.contributions || visibility.metrics`. The `metrics` slot never generates an independent section and retains its internal position. Draft recovery does not normalize flags. Hiding through navigation turns both flags off; showing again includes contributions and enables metrics if cards remain selected. Each source respects its flag during generation.

Manual contributions work without a username. The GitHub block is collapsible, with cards disabled initially and queries initiated by a button. The form does not query while typing, opening, or recovering; already-selected images may load activity when displayed. Suggestions are added only after selection and remain editable as manual contributions. No default ranking, streaks, or skill inferences.

### Pure model and temporary snapshot

Retain v1 and the draft key. Persist only `metrics.username/cards` and selected contribution entries. The validated snapshot of the username, date, period, calendar, counts, languages, and suggestions is a separate, temporary remote-data contract. The client validates data, cancels requests, and discards responses for a different user; it distinguishes real zeroes from errors and can show the last valid result with a notice.

`core/activity` contains normalization, contracts, and pure SVG rendering. `server/github` queries GraphQL through a fixed endpoint, validates data, and limits resources. JSON and SVG routes only coordinate these responsibilities. There is no new SDK or dependency on an external chart service.

### Verifiable public data

Configure a dedicated classic PAT on the server only through `GITHUB_TOKEN`, outside Git and `NEXT_PUBLIC_`. Require `x-oauth-scopes` to be present, empty, or exactly `public_repo` in every response. Prefer only `public_repo` for GraphQL queries on public repositories according to GitHub documentation; reject additional scopes, including `repo` and `read:user`, and unverifiable permissions such as fine-grained tokens. The client only executes reads, although this scope allows other public operations. The allowlist is a deliberate policy for the current client, not support for all authentication mechanisms.

Reject private profiles and filter to public repositories owned by the user that are not forks, plus eligible public contribution highlights. Allow only anonymous private contribution counts that the person has publicly shared, without details. Language data is bytes from analyzed repositories, not knowledge or activity during the calendar period. Limit processing to 300 repositories, 20 languages per repository, and 100 aggregated languages, with a partial-sample indicator.

**Update on 2026-10-20:** the initial rejection rule was implemented by requiring `userViewType: PUBLIC`, but that field represents a view and does not identify a private profile setting. [ADR 0022](0022-token-owner-public-activity.md) also allows the authenticated owner's `PRIVATE` view, validated with `isViewer` and the requested username, while retaining scope verification and public-data filters. The preceding paragraph preserves the context of this initial decision.

### Cache and hosting

Limit queries to 15 s and responses to 2 MiB. The process cache allows 512 snapshots and 512 failures, with 30-minute freshness and the last valid result retained for up to 24 hours during transient failures; it deduplicates queries and limits concurrency to four distinct queries and 60 per minute. Respect quotas and Retry-After; do not serve stale data when data is missing or configuration is invalid. Limits are per process and do not promise distributed protection.

Cards are first-party passive SVGs with escaped text, validated colors, accessible titles/descriptions, and explicit UTC dates. They contain no scripts, external resources, links, or `foreignObject`. Responses include a restrictive CSP, `nosniff`, activity status, and caching. An unavailable image explains the failure without inventing zeroes.

`APP_URL` identifies the application's public HTTPS origin and is never inferred from the Host. The editor route uses `await connection()` to read it at runtime: changing it requires restarting the service, not rebuilding; other pages retain static generation. `generateReadme(document, { activityCardBaseUrl? })` generates the product's only Markdown. Without a valid public origin, it uses local paths for review and returns success with `exportIssues: activity_not_configured`; consumers must block copy/download. Unchecking cards allows manual content to export. The product has no in-product token configuration flow.

Origin resolution is expanded in [ADR 0036](0036-production-card-origin.md): only Vercel Production may use its stable domain when `APP_URL` is empty. Explicit configuration retains priority, and the generator contract stays pure.

## Alternatives considered

| Alternative                                    | Reason for rejection in this delivery                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| A sixth metrics section                        | Splits one topic and complicates composition and navigation.              |
| A new v2 contract                              | v1 fields already represent the choices; migration adds no value.         |
| External public card service                   | Adds operational dependency and another provider's data policy.           |
| REST Events to reconstruct the annual calendar | Its window and limit do not represent a complete calendar year.           |
| Ask each person for a token                    | Adds friction and exposes operational decisions in the profile flow.      |
| Allow a token with broad permissions           | Changes data visibility and could publish private information.            |
| Store snapshots in the draft                   | Duplicates derived information and retains data that should be refreshed. |

## Consequences and limits

Manual profiles remain available without services. Enabling live queries requires an accepted credential; exporting charts also requires public hosting. This decision does not confirm authenticated calls, public deployment, future availability, or CI results: executed evidence is recorded in [development](../development.md).

README cards refresh according to cache state and depend on this application. Multiple instances require shared operational controls if usage warrants them. The data never measures skill. AI remains outside this integration, and the three retired modules do not return.

## Sources

- [GitHub GraphQL: Users](https://docs.github.com/en/graphql/reference/users#contributionscollection): calendar, period, counts, and contribution visibility.
- [GitHub GraphQL: Repositories](https://docs.github.com/en/graphql/reference/repos#languageedge): languages measured by code bytes.
- [GitHub scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps): public access without scopes and permission headers.
- [GraphQL authentication](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql): `public_repo` scope documented for public repositories with a classic PAT.
- [GraphQL limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api): quotas, errors, and retries.
- [Contribution reference](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference): calendar criteria and limits.
- Installed Next.js guides: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` and `08-caching.md`. Dynamic GET and explicit caching, without enabling Cache Components.

This decision adds activity within the five-section scope of [ADR 0008](0008-focused-profile.md) and retains the closed image policy of [ADR 0009](0009-profile-icons.md).
