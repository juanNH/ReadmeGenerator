# ADR 0020: Optional Visual Formatting for the Introduction

- Status: accepted.
- Date: 2026-10-20.
- Complements [ADR 0019](0019-code-and-formatting.md), [ADR 0015](0015-explicit-profile-html.md), and [ADR 0011](0011-country-and-contact-inputs.md).

## Context

A profile's name, tagline, and introduction shape its first impression. Limiting visual controls to custom sections forces people to duplicate the introduction to center it or choose its hierarchy. The flow should remain brief, without adding career-history fields or treating ordinary text as authored HTML.

## Decision

Add an optional, strict `data.presentation.format` object only to `ProfileDocument` v2, with these optional properties:

- `displayNameLevel?: 1 | 2 | 3` and `displayNameAlignment?: "left" | "center" | "right"`.
- `headlineLevel?: 1 | 2 | 3` and `headlineAlignment?: "left" | "center" | "right"`.
- `bioAlignment?: "left" | "center" | "right"`.
- `locationAlignment?: "left" | "center" | "right"`.

Do not change `schemaVersion`, storage keys, or the four existing content strings. Do not add `format` or defaults when creating, recovering, or migrating. Separate the v1 content schemas from the current schemas so the legacy format remains closed: even `format: {}` is rejected in v1. An older strict v2 reader may reject these properties and must preserve the original protected draft.

Absent formatting preserves the previous output exactly: name as `#`, tagline as `##`, bio as escaped-text paragraphs, and location with its label and catalog flag when applicable. Choosing left alignment keeps Markdown; choosing a level changes only the corresponding heading. Empty fields still produce no content.

Center and right alignment generate HAST with normalized literal text and controlled properties, then serialize and validate it with `analyzeProfileHtml`. The location includes only the fixed icon for the selected country, never a URL from personal text. The preview retains its local copy and decorative dimensions. Markdown and HTML inside the name, tagline, bio, or location are never interpreted.

Extract aligned-text construction and fragment analysis into a pure helper shared with custom sections. Every unit uses the current policy, the same 150,000 UTF-16 code-unit budget for visible HTML per document, and the limits of 30,000 per source, 1,500 nodes, and depth 32. Exceeding a limit produces `invalid_html` at `data/presentation/displayName`, `headline`, `bio`, or `location`, without truncating text. A hidden introduction is not analyzed and consumes no budget.

Derived fragments are exposed in `customHtml` with their allowed trees and exact UTF-16 ranges in the same Markdown used for preview, copy, and download. The historical metadata name does not limit it to custom sections. Trees are not persisted, and no second output, `rehypeRaw`, or `dangerouslySetInnerHTML` is introduced.

The UI groups size and alignment in an optional formatting panel, with per-field labels and an immediate preview. Resetting formatting removes only `format` and preserves all four text values. Export errors are associated with the content field and expand the details that contain them.

## Alternatives

- Create a custom copy of the introduction: duplicates content and makes the flow less clear.
- Allow free-form HTML or Markdown in the current fields: changes their interpretation and the security of existing drafts.
- Add a general rich-text editor: requires another contract for a need met by six optional choices.
- Extend the shared v1 schema without separating it: would silently allow later properties in the legacy format.

## Consequences

The introduction can be customized without writing tags or adding another section. Configuration does not rewrite recovered drafts or change the selected country. Exported alignment and hierarchy remain subject to GitHub's renderer; preview style parity is not promised. No fonts, colors, CSS, banners, or external services are added.

[ADR 0034](0034-friendly-presentation.md) expands the optional choices with compatible typography and explicit location integration, and defines writing examples for the complete tagline. It also changes the visual default: the name and headline are centered unless an explicit alignment overrides it. Choosing left alignment preserves simple Markdown output when neither typography nor integrated location requires HTML.
