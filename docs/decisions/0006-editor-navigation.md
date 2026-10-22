# ADR 0006: Section navigation and stable configuration

- Status: accepted.
- Date: 2026-10-19.
- Scope: navigation, active configuration, and editor section order.
- Extends [ADR 0005](0005-manual-profile-composition.md). Retains the eight manual modules, v1 contract, output policies, and local draft protections; replaces the composition of forms in collapsible cards.

## Context

Cards for each section spread forms across the page. When switching sections, a person needs to find where to continue configuring and recognize which part they are editing. Reordering only through adjacent moves takes several actions to move a section to a distant position.

Composition must allow selection, inclusion or hiding, and reordering as distinct actions. Modules are optional, their hidden data is retained, and the draft always contains nine IDs. Improving navigation does not require changing the persisted format or generation rules.

## Decision

Present compact navigation, a stable configuration panel, and a preview. On wide screens, place them on the left, center, and right, respectively. Navigation shows the eight manual sections, with included sections first in document order followed by hidden sections. The active form and README language share the configuration panel. Mount only the active form, without accordions. Navigation, the form heading, and an indicator beside the preview identify the section being edited; the indicator does not change exported Markdown.

Separate each section's controls: the checkbox changes inclusion only and retains focus; the name of an included section selects its form and focuses the configuration heading. The action for a hidden section is identified as add and edit to communicate its visibility change. Hiding preserves data and allows continued configuration while clearly identifying the hidden state. Removing an entry remains an explicit action that deletes its data.

On narrow screens, collapse section navigation and provide Edit/Preview buttons with `aria-pressed`. Active selection, collapsed navigation, mobile view, and drag-and-drop operation are ephemeral state. Do not add fields to `ProfileDocument` or change the draft key. Reviewing an error selects the form, shows the editor, and focuses the first invalid field.

Use `@dnd-kit/react` and `@dnd-kit/dom` 0.5.1 in client-side navigation, with the current `DragDropProvider` and sortable APIs. The integration uses pointer and keyboard sensors and a dedicated handle for each included section. Restrict the touch gesture only on the handle; fields, names, and checkboxes retain their interaction. Translate instructions and announcements into English and Spanish, and keep Move up/Move down buttons as an alternative. Choosing a library does not by itself demonstrate complete accessibility or performance improvements.

Commit the new order only after a valid move completes. Cancellation retains the previous document. A move calculates a new sequence of included manual modules and places it in the same slots of `moduleOrder`; it preserves the positions of hidden sections and metrics, as well as all nine IDs, before calling `reorderModules`. The visual grouping of included and hidden sections is not saved as another order. Preserve the active selection while reordering.

The sequence that changes during the gesture is an ephemeral projection controlled by React. Disable `OptimisticSortingPlugin` through the public sortable configuration and retain `SortableKeyboardPlugin`. During review of version 0.5.1, dropping outside the target with a null destination and no explicit sensor cancellation was observed to preserve the provisional DOM order even though the document did not change. Controlling the projection allows discarding it on both cancellation and drop outside, without manipulating nodes or remounting navigation. Announcements read the current language context and section count, including after draft recovery.

## Alternatives considered

| Alternative                                  | Consequence                                                         |
| -------------------------------------------- | ------------------------------------------------------------------- |
| Keep forms in distributed cards              | Requires scrolling through the page to locate active configuration. |
| Use the section name as a checkbox           | Mixes configuration with changing what appears in the README.       |
| Allow dragging the entire row or form        | Interferes with selection, writing, and touch scrolling.            |
| Remove ordering buttons                      | Requires drag-and-drop for an action that can use direct controls.  |
| Store a second order or migrate the document | Duplicates information already represented by the v1 contract.      |
| Update the draft during every pointer move   | Makes cancellation require reverting already-persisted changes.     |

## Consequences and review

Editing retains a recognizable location when switching sections and distinguishes selection from the exported composition. Mobile navigation avoids presenting all forms on one long page. Controls need explicit focus behavior, accessible names, position announcements, and review with pointer, keyboard, and touch.

The drag-and-drop dependency remains in the UI; the core continues without React, browser APIs, or storage. Preview, copy, and download still derive from the same Markdown, and local recovery protections remain in force. This does not add README styling, metrics, GitHub, or AI.

Review this decision if navigation, the persisted format, or the interaction library changes. Earlier decisions describe their deliveries and retain their historical value.

## References

- [dnd kit React integration quickstart](https://dndkit.com/react/quickstart/).
- [Sortable state management](https://dndkit.com/react/guides/sortable-state-management/).
- [Sensor configuration](https://dndkit.com/react/guides/sensors/).
- [Editor](../editor.md) and [architecture](../architecture.md).
