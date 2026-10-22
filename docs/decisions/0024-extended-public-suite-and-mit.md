# ADR 0024: Extended public suite and MIT distribution

- Status: accepted for implementation.
- Date: 2026-10-20.
- Product: GitHub Profile Generator.
- Extends [ADR 0023](0023-customizable-activity-cards.md).

## Context

The first two GitHub Stats Extended adaptations used only the basic snapshot. The request was to include Extended features that can be used while respecting public data and open-source terms. An optional ranking and the MIT license for original code with `Copyright (c) 2026 Juan Nicolas Herrera` were expressly authorized.

The product continues to serve people with different levels of public activity. An activity formula does not demonstrate skill and must be an informed choice. The license for original code does not replace licenses for third-party materials or require publishing a derivative.

## Decision

### Five Extended families and ten card selections

Keep the seven existing selections and add `extended-repository`, `extended-gist`, and `extended-wakatime`. Repository and Gist selections can generate up to twelve cards of each type from public identifiers; WakaTime uses a public username independent from the GitHub username. All remain disabled by default. Manual contributions remain available without an account or configuration.

Extended statistics provide 18 counters, filters for repositories/owners/roles/exclusions, inclusion of the user’s own repositories in the corresponding counters, and commits for the selected period, a chosen UTC year, or public historical search. Historical data is limited to ten available years, and partial results are declared. Languages provides five designs, 1 to 20 entries, hiding options, bytes/percentage, and weighting by bytes and repository count.

Extended snapshots are kept separate from `ActivitySnapshot`: a visual composition does not make the basic snapshot a source for metrics it does not contain. Each Extended metric declares a nullable value, scope, and partiality. Unavailable data is not replaced with zero, and a truncated sample is not presented as a complete total.

### Additive configuration in v2

`metrics` keeps `username/cards`, extends `appearance?`, and accepts `extended?` with optional strict `stats`, `languages`, `repositories`, `gists`, `wakatimeUsername`, and `resourceOptions`. Remote responses are not persisted. Recovery adds no defaults; v1 keeps its closed schema, and older v2 readers may reject new fields while preserving the original.

Appearance supports the prior presets, 79 named themes, validated hexadecimal colors, bounded gradients, radius, width, line spacing, title and visibility, icons, bold text, and number formatting. These are constrained values without CSS, JavaScript, hosts, or arbitrary graphic resources. Resetting appearance preserves the other options and content.

### Explicit ranking

`showRank` is opt-in. The adapted MIT formula receives only commits, PRs, issues, reviews, stars, and followers. The UI and SVG explain that it does not measure skill or represent an observed population percentile. It is hidden if any required input is null or partial. The letter, formula’s percentile index, and icon are presentation options for the same operation; no scores are added to the profile.

### Public queries and independent resources

`src/server/github` remains `server-only`, with fixed endpoints, identity validation, scope and response checks, a 15-second network timeout, bounded sizes, and bounded caches. Extended has a budget of 15 requests, up to 300 repositories, 20 languages per repository, 100 aggregated results, ten historical years, and 300 results per discussion connection. Name-based exclusions affect stars/languages but do not apply to historical PR, issue, or commit searches. Partial and missing states remain explicit. Public historical totals subtract anonymous private counts from the calendar; the original cards keep their prior policy of explaining anonymously shared public counts.

Extended and resource requests share a per-process scheduler with four active queries, 60 launches per minute, and a FIFO queue of 32 waits for up to 45 seconds. It also deduplicates queued requests and revalidates credentials/cooldown before starting network access. Basic activity retains its independent boundary; aggregate or distributed operational protection is still required depending on the deployment.

The GitHub policy still accepts only a verifiable classic PAT with `x-oauth-scopes` empty or set to `public_repo`, and rejects `repo`, `read:user`, fine-grained tokens, and private OAuth. Repositories and Gists must demonstrate public visibility and a consistent identity; a secret Gist is not public just because its ID grants access. The Gist REST response can include file contents: these are discarded when building the snapshot, and `raw_url` is not queried, exposed, or persisted. Repository cards can query five public counters for a user explicitly selected for that resource.

WakaTime queries only its public endpoint for the last seven days and does not send the GitHub token. The provider must declare activity and languages visible and the data current; projects, machines, and keys are not requested. The range may not contain explicit dates and is presented as the last seven days without fabricating dates.

Profile and resource routes share their exact construction and validation with the preview, without duplicate or unknown parameters. SVGs are local, passive, escaped, and have no `foreignObject`, animation, or external resources. `APP_URL` remains the application’s own public HTTPS origin and is never derived from the Host header. Without it, local review of the same Markdown is available, but exporting cards is blocked.

### MIT, provenance, and maintenance

Apply MIT to original code with the authorized copyright holder. Keep the license text in `LICENSE` and declare MIT in the package. Extended adaptations preserve their copyright, permission notice, and revision `0506c4c0e0acab7be096be48d0d59d50852d811f`; fonts, icons, and dependencies retain their original terms. Original contributions are received under MIT without an additional assignment of ownership.

Keep complete notices, provenance for copied files, and a reproducible inventory of installed dependencies. `licenses:generate` and `licenses:check` make missing or outdated notices visible; they do not certify legal compatibility or artifacts or platforms that were not inspected. The specific distribution requires review of its components and terms, including additional terms for libraries or binaries. See the [open-source guide](../open-source.md).

Only incorporate projects whose active maintenance is confirmed in official sources. The original project announced as unmaintained is excluded; Extended is evaluated through its own repository. Local adaptations require reviewing upstream changes and are not updated automatically.

## Alternatives considered

- Use Extended’s hosted service directly: makes data policy, availability, and parameters depend on an external instance. Queries and SVGs remain local.
- Adopt its entire backend or private OAuth: expands permissions, credentials, and operations beyond the authorized public scope.
- Enable ranking by default: turns an expressive choice into an implicit evaluation. It remains opt-in and explained.
- Keep only the two initial designs: does not cover the requested usable resources and options. The expansion preserves existing drafts and cards.
- Apply MIT indiscriminately to every file: cannot replace third-party rights or terms. Their provenance and licenses are preserved.

## Consequences and limits

The suite increases the possible number of queries and requires complete budgets, cache keys, and option validation. Data may differ from another instance because of public filters, time windows, and declared limits. The [compatibility matrix](../github-stats-extended.md) records capabilities and exclusions: English/Spanish, local widths, explicit themes, passive SVG, and no universal compatibility with the source’s URLs.

MIT permits growth and commercial reuse when notices are preserved; it does not require derivatives to be published and does not prevent every license change for original code in a derivative. Generated READMEs retain the rights to their content. Visual exclusivity and endorsement by third-party authors are not promised.

Evidence for checks actually run belongs in [development](../development.md); it must not be inferred from this decision.

## Sources

- [Pinned GitHub Stats Extended revision](https://github.com/stats-organization/github-stats-extended/tree/0506c4c0e0acab7be096be48d0d59d50852d811f).
- [Extended license](https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/LICENSE).
- [MIT license](https://opensource.org/license/mit).
- [Official feature matrix and family documentation](../github-stats-extended.md).
