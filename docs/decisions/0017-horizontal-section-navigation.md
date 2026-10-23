# ADR 0017: Sections in a permanent horizontal row

- Status: accepted for the editor revision.
- Date: 2026-10-19.
- Supersedes the section selector and collapsible organizer in ADR 0016. Preserves its separation of internal tools.

## Context

The project owner requested that every section be visible without opening a panel and that they be arranged from left to right in the same place. A vertical list takes up too much space before the form, especially with several custom sections.

## Decision

- Always show sections in a single row with no wrapping and horizontal scrolling within its container. The page does not grow wider. Included sections follow their README order, and available sections appear afterward.
- Each item provides an inclusion checkbox, a selection button, and a drag handle. Its accessible name is complete; its visible text is shortened to keep the row compact. Settings retain the full name. The active section is distinguished visually and with `aria-current`.
- Drag included sections horizontally with pointer, touch, or keyboard. Each keyboard arrow moves exactly one position, even when changing direction while the row is scrolling. A single pair of left/right buttons reorders the active section as an alternative. Moves are confirmed on drop; Escape cancels and restores the original order.
- Preserve focus on the button when selecting, and on the checkbox when including or hiding. Bring the active or focused item into view horizontally without scrolling the page vertically. When changing forms, show its beginning below the bar.
- Share the actions area with Edit/Preview and Add section. Keep the bar fixed only when enough usable space remains. Keep the block selector collapsible.

## Alternatives

A compact selector hides other sections and requires opening it to find them. A separate organization panel introduces another navigation pattern and takes too much vertical space when expanded. Allowing multiple rows makes the form keep moving down as sections are added.

## Consequences

On small screens, all sections cannot fit on screen at once; they are browsed horizontally. Controls must retain targets at least 44 px wide/high, visible focus, and updated drag instructions. Tests check the single row, local scrolling, long titles, many items, ordering, cancellation, inclusion, and persistence in both languages. The document and generator do not change.

The drag operation closes immediately. The public `Feedback.dropAnimation: null` option avoids the library's focus restoration without `preventScroll`, which scrolled a long editing session when cancelling. The editor restores the keyboard drag handle after rendering without changing vertical scroll or interfering with another control focused by the person. Index-based movement and an ephemeral sequence prevent geometry-related jumps and late callbacks; the dependency is not changed.
