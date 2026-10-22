# ADR 0016: Top navigation and the internal design system

- Status: internal tools remain current; the selector and organizer were superseded by ADR 0017.
- Date: 2026-10-19.
- Complements ADR 0006; replaces its side layout and public design-system showcase.

## Context

The navigation layout in this decision was revised in [ADR 0017](0017-horizontal-section-navigation.md): sections now remain in one horizontal row. This record preserves the context of that iteration and the decision to keep development tools out of the public product.

On phones, preventing horizontal overflow is not enough. The header, section organizer, and nine block samples could fill several screens before reaching the fields. Long custom titles were repeated above their inputs. The project owner also clarified that the design system should be a development tool, not a public feature.

## Decision

- Select sections from a compact top bar. The selector preserves focus while moving through options and distinguishes included sections from those that can be added.
- Offer inclusion, ordering, and dragging in a collapsible organizer with a capped height. Opening it from a long editing session scrolls it into view; closing it returns focus to the trigger. Selecting a section in the organizer closes it and focuses its settings. Escape preserves the drag library's cancellation behavior.
- Keep the bar available while scrolling only when its height leaves enough room to edit. Also measure the visual viewport to avoid fixing an oversized bar when text is zoomed or the on-screen keyboard appears.
- Toggle between editing and preview only when one panel is shown at a time; when switching, show the panel from its beginning and preserve focus on the button. On wide desktop screens, show both panels and hide this toggle.
- Keep custom-instance headings short; the actual title remains in the selector, its field, and the README. Show the nine samples when “Add block” opens, initially open only for an empty section and closed after a choice.
- Remove public links to the design system and return 404 for `/design-system` in production. Keep the local showcase available under `pnpm dev` and preserve existing tokens and primitives. Playwright and axe remain repository tools. Storybook is an option for a separate component workshop; do not add it or present it as an existing integration.

## Alternatives

A full list at the top preserves too little vertical space on mobile. A horizontal strip of tabs makes long titles and many instances hard to find. A sidebar reduces available width and requires a second pattern on phones. Publishing the component workshop adds a route unrelated to creating a README.

## Consequences

The organizer does not change document rules or section identities. Selection, view, focus, expansion, and measurements are ephemeral state. Saving, generation, and alternatives to dragging are preserved. Tests should cover phone heights, reaching the first field, use after a long editing session, and real keyboard interaction, as well as width, accessible names, and automated contrast. Emulation does not replace physical devices or screen readers.
