# ADR 0028: Independent Scrolling in the Editor's Two Columns

- Status: Accepted for implementation.
- Date: 2026-10-20.
- Product: GitHub Profile Generator.

## Context

Repeatable sections and their options can make the configuration or README very long. The request was to scroll both sides of the editor independently and adapt the bars to the site's visual style while preserving keyboard and phone use.

## Decision

When the container query enables two columns and there is enough visible height, configuration and preview use independent native scrollports in the available area below the editor bar. `useEditorScroll` measures that area, observes size changes, and batches measurements in animation frames. Deep focus and `scrollIntoView` continue to scroll their native ancestors; wheel, gestures, and keys are not intercepted.

On phones, narrow containers, enlarged text, or insufficient height, retain the page's natural vertical flow. Section navigation keeps its own horizontal row, selection, ordering, and internal scrolling.

On desktop, changing sections or selecting the active section again reveals the full panel header, including the language control, without removing focus from navigation. Actions that focus configuration also preserve that header; reviewing an error still reveals the affected field. Ctrl+Home acts on the focused column according to native behavior.

The editor bars and navigation use semantic colors, a rounded thumb, and an integrated track. Keep the native control and restore its rendering in forced-colors mode. Panels have accessible names and can receive focus for keyboard scrolling. This change adds no library and does not recreate a scrollbar in JavaScript.

## Alternatives Considered

- Always constrain both columns in height: makes editing harder on short screens or with enlarged text.
- Keep one long desktop page: loses the other column's context while editing.
- Draw scrollbars with an external component: adds a dependency and requires reproducing native interaction.

## Verification

Check independent wheel and keyboard scrolling, focus on deeply nested fields, reaching the first field before interaction, returning to natural flow at 320 × 568 and with text at 200%, both languages and themes, and forced colors. Emulation does not replace a physical device. See [Development](../development.md).
