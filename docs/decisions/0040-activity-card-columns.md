# ADR 0040: Activity Card Columns

- Status: Accepted.
- Date: 2026-10-23.

## Context

Activity cards previously occupied a full row each. People want to choose a more compact layout while retaining the order in which cards were selected. The editor preview must render the same Markdown structure as GitHub without introducing another README output or unsafe HTML path.

## Decision

Add the optional v2 field `metrics.cardColumns?: 1 | 2`. A new profile explicitly starts with two cards per row; an absent field in a recovered or migrated document keeps the previous one-card-per-row output. The editor exposes one or two cards per row. Generation preserves card order, pairs consecutive cards in GitHub Flavored Markdown tables, and leaves an unpaired last card by itself. The preview enables `remark-gfm` and renders tables in a horizontally scrollable, keyboard-focusable container.

V1 remains strict. Recovery, migration, and project opening do not add the field. No card is selected or reordered as a side effect of changing the layout.

## Alternatives Considered

- Default all documents to two columns during recovery: would alter existing README output without an explicit edit. Keep absence as the legacy layout.
- Use inline CSS or free-form HTML for positioning: GitHub can filter styling, and this would broaden the authored HTML surface. Use GFM tables.
- Reorder cards as part of this option: layout and selection order are separate user choices. Preserve selection order.

## Consequences

New profiles can use the available README width more efficiently. Existing profile JSON remains compatible with its previous output until a person chooses a layout. GitHub controls final styling and may wrap the table on narrow screens; the local preview is an approximation of that presentation.

See [Profile Model](../profile-model.md), [Editor](../editor.md), and [ADR 0031](0031-browser-persistent-activity-cache.md).
