# ADR 0042: Internal Section Names and Optional README Titles

- Status: accepted.
- Date: 2026-10-23.
- Extends [ADR 0013](0013-custom-sections.md) and [ADR 0019](0019-code-and-formatting.md).

## Context

A person may want a recognizable name in the editor without publishing a heading above the section's content. Using an empty title for both purposes makes several sections difficult to distinguish.

## Decision

Keep `CustomSection.title` as the authored name used in editor navigation and the configuration heading. Add `showTitle?: boolean` to the strict v2 schema. Absence and `true` preserve previous README output; `false` omits the generated section heading. Parsing and recovery do not add defaults, change storage keys, or modify v1.

The **Section name** field remains editable. **Show title in README** controls only the generated heading, independently from including the whole section. Unchecking retains the name, title level, alignment, blocks, identity and position. Checking again restores the saved formatting and removes the optional visibility override. Duplicating and JSON project files preserve the choice.

A hidden title does not consume the HTML budget or produce title-format export errors. Implicit subheadings use the same hierarchy as a section with no title. Explicit heading levels and authored HTML remain unchanged. Preview, copy and download continue to use the same generated Markdown and verified `customHtml` ranges.

## Alternatives and Consequences

- A separate name field would require two authored strings, recovery rules and another source of labels. Reusing the existing title keeps this bounded.
- Clearing the title loses the editor name. Hiding it with CSS would still publish it and does not work across Markdown readers.
- An older strict v2 reader can reject `showTitle`; it must preserve that incompatible draft. Existing documents without the property keep their shape and output.

Review this decision if internal names and exported titles must become independently authored text.
