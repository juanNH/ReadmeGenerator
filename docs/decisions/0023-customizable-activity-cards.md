# ADR 0023: Customizable activity cards and GitHub Stats Extended adaptations

- Status: accepted for implementation.
- Date: 2026-10-20.
- Product: GitHub Profile Generator.

## Context

The integration in [ADR 0010](0010-github-activity.md) provides a calendar, summary, and languages through custom SVGs. Additional compositions and visual options are needed, along with designs adapted from GitHub Stats Extended, while retaining public queries, the server-only token, and export from the configured origin.

GitHub Stats Extended publishes its code under the MIT license. That license permits using, modifying, and distributing the code, including commercially, while preserving the copyright and permission notices. It does not guarantee the availability of its hosted service or that all of its options comply with this application’s public-data policy.

## Decision

### Seven cards with a single source of data

Keep `calendar`, `summary`, and `languages`, and add four independent selections:

| ID                   | Content                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `panorama`           | Calendar, period summary, and languages from the analyzed repositories, with their scopes distinguished.                                   |
| `monthly`            | Sums of the calendar’s daily contributions grouped by UTC month, with partial months identified.                                           |
| `extended-stats`     | Local adaptation of GitHub Stats Extended’s statistics design for commits, PRs, issues, and reviews in the available period.               |
| `extended-languages` | Local adaptation of its language design, with percentages calculated across all bytes in the sample and the remainder grouped as “Others.” |

All seven use the same validated public `ActivitySnapshot`. No queries, scopes, package dependencies, or credentials are added. The Extended design does not enable its full metrics suite: it includes no scores, rankings, skill levels, or values that the current snapshot does not provide. Language percentages do not use minimum visual sizes that would distort their actual proportions. Languages still describes the current code sample, not the calendar period.

Contributions with context keep the existing flow: a manually entered title, description, and link, or an explicitly selected and then editable suggestion. The draft is not published in a dynamic card, personal text is not added to a URL, and no remote storage is introduced.

### Optional, bounded appearance in v2

`data.metrics` retains `username` and `cards` and accepts `appearance?`, a strict object with optional properties:

- `theme`: `light` or `dark`.
- `palette`: `forest`, `ocean`, or `violet`.
- `design`: `classic`, `panels`, or `minimal`.
- `size`: `compact` or `wide`.

When absent, the original three cards retain their previous output. Recovery or migration does not add defaults; the v1 schema keeps exactly its three IDs and does not accept `appearance`. This is an additive v2 extension that does not change the version or key: an older strict reader may reject the new configuration and must preserve the incompatible value.

The form keeps all cards disabled by default, requires an explicit query, and keeps the section collapsible. It offers three local decorative design samples and appearance controls. Resetting the appearance removes only that optional configuration and preserves the username, cards, and contributions. Samples do not query GitHub and are not saved as real data.

### Local SVGs and verified routes

Pure renderers live in `src/core/activity`. Extended adaptations are implemented in `render-extended-card.ts` from `stats.ts` and `top-languages.ts` in `packages/core/src/cards`, pinned to commit `0506c4c0e0acab7be096be48d0d59d50852d811f`. The full license and copyright of Anurag Hazra, Abhijit Gupta, and martin-mfg are preserved in `public/licenses/github-stats-extended.txt`, with provenance in [third-party notices](../../THIRD_PARTY_NOTICES.md).

The application serves every SVG at `/cards/github/{username}/{card}.svg`. The query accepts only a language and the listed appearance presets, without duplicates, CSS, arbitrary colors, URLs, or free-form parameters. The generator and preview share the exact route construction and validation; the preview resolves the same Markdown locally. SVGs remain passive, escaped, and free of external resources.

`APP_URL` remains a public HTTPS origin required to export cards. Without it, local review is allowed and `activity_not_configured` is returned; copy and download remain blocked while cards are selected. The hosted GitHub Stats Extended service is not called, and neither the token nor the draft is sent to another provider.

## Alternatives considered

- Use images from Extended’s hosted service: reduces local adaptation but introduces an external availability dependency and a query policy this application does not control.
- Install or deploy its full backend: adds operations and capabilities the current public contract does not need.
- Allow arbitrary CSS, colors, or URLs: expands the validation surface and makes it harder to keep routes and SVGs closed. Presets cover the agreed visual options.
- Publish draft contributions in dynamic cards: requires decisions about persisting, publishing, and removing personal data; the manual README already allows adding context to contributions.
- Replace the three existing cards: changes existing drafts without an explicit choice. The new selections are additive.

## Consequences and limits

Customization and new cards are saved with the complete profile and travel in Project files. Snapshots remain ephemeral. All designs share the existing client’s sample, period, cache, and public-data limits; a new composition does not increase GitHub data coverage.

The integration retains MIT attribution obligations and records the pinned source of adapted code. It does not guarantee exclusivity of the original designs or full parity with the Extended service. Evidence for checks actually run is recorded in [development](../development.md).

## Sources

- [GitHub Stats Extended, pinned revision](https://github.com/stats-organization/github-stats-extended/tree/0506c4c0e0acab7be096be48d0d59d50852d811f).
- [Source statistics card](https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/packages/core/src/cards/stats.ts).
- [Source languages card](https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/packages/core/src/cards/top-languages.ts).
- [Source MIT license](https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/LICENSE).
