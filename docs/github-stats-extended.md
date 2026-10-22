# GitHub Stats Extended: supported scope

The application locally adapts the five card families from [GitHub Stats Extended](https://github.com/stats-organization/github-stats-extended): statistics, languages, repository, Gist, and WakaTime. It also retains five built-in cards. SVGs are generated on this server; the hosted Extended service is not used, and the original project's unmaintained package or service is not included. The adaptation's provenance is retained from the active successor.

The adaptation is pinned to revision `0506c4c0e0acab7be096be48d0d59d50852d811f`. The adapted files, modifications, and MIT notices are recorded in [third-party notices](../THIRD_PARTY_NOTICES.md). The adaptation does not receive updates automatically. Before updating from the source, review its maintenance, code, licenses, and behavior changes.

## Cards and data

| Family     | Available in this application                                                                                                                       | Conditions and limits                                                                                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Statistics | Selection and ordering of 18 counters, filters, and an optional ranking.                                                                            | Public data with explicit scope; a missing or partial value is not presented as a complete zero.                                                                                          |
| Languages  | Five layouts; 1–20 languages; hiding; bytes or percentages; weighting by bytes and repository count.                                                | Sample of up to 300 public, non-fork repositories, 20 languages per repository, and 100 in aggregate; truncation is reported.                                                             |
| Repository | Up to 12 repeatable cards by `owner/name`, with description, stars, forks, and language.                                                            | Public metadata only. May show five public contribution counters for a user explicitly selected for that repository.                                                                      |
| Gist       | Up to 12 cards by ID with description, files, comments, stars, forks, and available language.                                                       | Requires `public: true` and a consistent identity; a secret Gist accessible by ID is still excluded. Embedded REST content is discarded; `raw_url` is not queried, exposed, or persisted. |
| WakaTime   | A public user independent of the GitHub user; languages from the last seven days by time or percentage, normal/compact layout, and an optional bar. | Uses the fixed public statistics endpoint. Both activity and languages must be visible; no WakaTime keys are requested.                                                                   |

Family and resource selection is explicit. Everything starts disabled. Options and destinations are stored in the project; remote snapshots remain in service or form memory and are not added to the document. Manual contributions remain available without a username or credentials.

### The 18 counters

| Persisted ID                       | Content                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `stars`                            | Stars on the user's own public repositories that were analyzed.                                              |
| `commits`                          | Commits in the selected period, a chosen UTC year, or the public historical search, depending on the option. |
| `pullRequests`                     | Public PRs created within the historical period available to the search.                                     |
| `issues`                           | Public issues created within the historical period available to the search.                                  |
| `reviews`                          | Reviews in the contributions period.                                                                         |
| `repositoriesContributedTo`        | Public repositories with contributions in the period.                                                        |
| `allTimeContributions`             | Public contributions in the queried history.                                                                 |
| `allTimeRepositoriesContributedTo` | Distinct public repositories with contributions in the queried history.                                      |
| `discussionsStarted`               | Public discussions started.                                                                                  |
| `discussionsAnswered`              | Public discussions with an answer selected by the user.                                                      |
| `mergedPullRequests`               | Public PRs merged.                                                                                           |
| `mergedPullRequestPercentage`      | Percentage of queried public PRs that were merged.                                                           |
| `authoredPullRequests`             | Public PRs created.                                                                                          |
| `commentedPullRequests`            | Public PRs commented on, excluding those authored by the user.                                               |
| `reviewedPullRequests`             | Public PRs reviewed, excluding those authored by the user.                                                   |
| `authoredIssues`                   | Public issues created.                                                                                       |
| `commentedIssues`                  | Public issues commented on, excluding those authored by the user.                                            |
| `followers`                        | Current followers.                                                                                           |

Each metric has a `period`, `lifetime`, or `snapshot` scope, a nullable value, and a `partial` flag. The UI displays scopes and warnings. Historical collections for `allTimeContributions` and `allTimeRepositoriesContributedTo` query at most ten available years and do not promise a full account lifetime for older accounts; historical public searches for PRs/issues/commits have their own search scope. Discussions are limited to three pages of 100 per connection. Each query has a budget of 15 requests and 15 seconds of network time; limits and partial failures remain visible.

Filters support up to 20 repositories, owners, or excluded names, and the `OWNER`, `ORGANIZATION_MEMBER`, and `COLLABORATOR` roles. Filters operate on public data whose identity can be verified. Exclusions by name affect stars and languages; they are not applied to historical PR, issue, or commit searches. If a role or combination cannot be resolved reliably, partial unavailability is reported. Repository contribution counters exclude the user's own repositories unless inclusion is selected.

Extended and resource requests share a per-process scheduler: up to four active queries, 60 starts per minute, and a FIFO queue of up to 32 waiting requests, with a maximum 45-second queue wait. Identical requests are deduplicated while waiting as well; credentials and cooldown are revalidated when a request starts. The 15-second network budget applies to a query that has started. Basic activity uses its separate legacy boundary; these limits are not distributed protection.

The Extended cache retains metric coverage and the language sample for 30 minutes. When the editor searches, it preloads the 18 counters for the current period and filters, even if no cards are selected. Removing, reordering, or adding already-queried counters reuses that data. Changing the theme, colors, ranking icon, layout, language count, or weighting does not require new data either. Prefetch includes historical counters within their existing limits, without querying every year or combination. Different filters and periods retain the isolation required by each field; null values, partial results, and age are preserved and reported. After a transient failure, a selection with complete earlier coverage can use it for up to 24 hours, without turning an unknown counter into zero. See [ADR 0030](decisions/0030-all-profile-counters-prefetch.md).

The editor offers **Search data** below the username, before any cards are selected. The first search loads shared profile data; afterward, selections and options reuse the browser cache and query only missing coverage, batching rapid changes. Typing a username that has not been searched, mounting, or restoring a project does not trigger a query. Preview SVGs render locally; the Markdown changes with each edit and retains dynamic public URLs. The PAT still shares its quota among visitors. See [ADR 0027](decisions/0027-browser-activity-data-cache.md), [ADR 0029](decisions/0029-account-first-activity-search.md), and [API and hosting](github-api-and-hosting.md).

Prepared public data is temporarily stored in each browser's IndexedDB, separately from the profile, so it can also be reused after a reload without HTTP requests. It retains identity, filters, and the original timestamp; it does not store tokens or network permissions. If data is missing or expired, Search lets the user query again; if storage fails, the editor uses RAM and reports that state. See [ADR 0031](decisions/0031-browser-persistent-activity-cache.md).

Languages use `bytes ^ sizeWeight × repositoryCount ^ countWeight`, with weights from 0 to 2 and at least one positive weight. By default, only bytes are weighted. A weighted percentage describes that formula; it is not necessarily the percentage of bytes and does not measure knowledge. Hiding languages changes the card selection without changing which repositories were queried.

### Optional ranking

`showRank` starts disabled. When selected, it applies Extended's MIT-licensed formula to commits, PRs, issues, reviews, stars, and followers. It can show a letter, the formula's percentage index, or a local branch symbol for the `github` option. The index is not a percentile of a measured user population, and the letter does not assess skill, experience, or work quality. The ranking is hidden if any of its six inputs is missing or partial. Repository count is not an additional input.

### Public WakaTime data

The WakaTime account is not inferred from the GitHub username. The app queries `https://api.wakatime.com/api/v1/users/{username}/stats/last_7_days` without a GitHub token or user credentials. The response must report `is_coding_activity_visible` and `is_language_usage_visible` as true, along with updated data. If the provider does not supply explicit dates, the card says “last seven days” without inventing a start or end date. Projects, teams, machines, and private activity are not queried.

## Customization

Cards share light/dark themes, three palettes, three built-in layouts, and compact/wide sizing. The extension adds 79 named Extended themes; six-digit hexadecimal colors for title/text/icons/border/background; a gradient with an angle from 0 to 360 and 2–10 colors; radius from 0 to 30; width from 700 to 1200; line spacing from 22 to 50; a custom title up to 100 UTF-16 code units; optional title/border hiding; icons; bold text; and short/long numbers with precision from 0 to 2. Values are validated as data; CSS and URLs are not accepted. Row, icon, and number-format options apply where the Extended layout includes those elements; the five built-in cards keep their own compositions and data formats.

Repository-specific options allow showing the owner, 1–3 description lines, and public counters for PRs created/commented on/reviewed and issues created/commented on. Selecting counters requires an explicitly supplied contribution username. WakaTime options include 1–20 languages, hidden languages, time/percentage, a bar, and normal/compact layouts.

## Deliberate differences and exclusions

| Source capability                                                     | Local decision                                                                                                                           |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Private data through OAuth or credentials with broader permissions    | Excluded. The server accepts a verifiable classic PAT with no scopes or only `public_repo`, and uses public filters.                     |
| Broader historical data or larger samples                             | Local budgets are bounded and coverage is declared; numeric results are not guaranteed to match another instance.                        |
| All source languages                                                  | The interface and SVGs support English and Spanish.                                                                                      |
| Source URL parameters                                                 | Strict local contracts are used. There is no direct compatibility with the source URLs or all of their parameters.                       |
| Automatic theme based on the viewer and colors by mode                | Each URL uses an explicit theme. Adaptive CSS is not embedded.                                                                           |
| Ring or bar colors as separate parameters                             | The adaptation uses validated colors from shared appearance settings; it does not expose every graphic token from the source.            |
| Source's minimum widths and exact layout                              | Local width is 700–1200 with an accessible, custom composition; exact visual replication is not promised.                                |
| GitHub icon for ranking                                               | A passive local branch symbol is used; no remote brand asset is loaded.                                                                  |
| Animations, free-form CSS, `foreignObject`, or external SVG resources | Excluded; SVGs are passive and escaped.                                                                                                  |
| Extended service deployment, GitHub Actions, caching, and operations  | These are source-service operational options, not features incorporated into the editor. This application has its own routes and caches. |

This matrix describes features available within the product's contracts. It does not claim complete parity with the Extended service. Official family references are [statistics](https://github-stats-extended.vercel.app/frontend/docs/cards/stats/), [languages](https://github-stats-extended.vercel.app/frontend/docs/cards/top-languages/), [repository](https://github-stats-extended.vercel.app/frontend/docs/cards/repo-pin/), [Gist](https://github-stats-extended.vercel.app/frontend/docs/cards/gist-pin/), and [WakaTime](https://github-stats-extended.vercel.app/frontend/docs/cards/wakatime/).

## Export and open source

Profile cards use `/cards/github/{username}/extended-{stats|languages}.svg`; resources use `/cards/extended/{repository|gist|wakatime}.svg`. Queries contain public identifiers, language, and validated options, never tokens or the full draft. The README and preview use the same URLs; only the preview resolves them locally. Export requires your own public HTTPS origin: an explicit `APP_URL` or the stable domain resolved exclusively in Vercel Production according to [ADR 0036](decisions/0036-production-card-origin.md). Without a valid origin, local review remains available, while copying and downloading are disabled whenever cards are selected.

Original code is licensed under [MIT](../LICENSE), with `Copyright (c) 2026 Juan Nicolas Herrera`. Adaptations retain their authors' notices and original licenses. See the [open-source guide](open-source.md) for attribution, contributions, the dependency inventory, and distribution preparation. The generator's license does not change ownership of personal content or marks included in a README.
