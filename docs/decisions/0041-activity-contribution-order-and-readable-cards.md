# ADR 0041: Activity and Contribution Order with Readable Cards

- Status: Accepted.
- Date: 2026-10-23.

## Context

Activity cards and manually written contributions share one README section, but the generator always placed activity first. In two-column mode, GitHub scales each card SVG into half of the available row width, making its text difficult to read.

## Decision

Add the optional v2 field `metrics.contentOrder?: "activity-first" | "contributions-first"`. The editor offers an explicit choice next to the card layout controls. When both content groups are present, generation and preview place them in the selected order; absence preserves activity-first output. V1 remains strict, and recovery does not add a default.

When `metrics.cardColumns` is `2`, all activity card families increase their SVG text sizes while retaining the same URLs, data, order, accessible descriptions, and one generated Markdown output. Both server-hosted cards and local preview use the same renderer behavior. One-column cards keep their current size. Card selection order and content group order remain independent choices.

## Alternatives Considered

- Add activity and contributions as separate fixed sections: would change the profile's section model and navigation. Keep them combined in the existing `contributions` slot.
- Adjust SVGs only in the editor preview: would make exported cards differ from the generated README. Apply the same validated `columns` option to local and hosted rendering.
- Increase card text for every layout: would unnecessarily change the existing one-column appearance. Apply the larger text only for two-column output.

## Consequences

People can choose which group appears first and can use two-column cards without reducing text to the previous tiny scale. Existing v2 documents retain the prior order and card appearance until they choose or already use the two-column layout. GitHub still controls table rendering and wrapping on narrow screens.

See [Profile Model](../profile-model.md), [Editor](../editor.md), [ADR 0040](0040-activity-card-columns.md), and [ADR 0039](0039-contribution-details-and-order.md).
