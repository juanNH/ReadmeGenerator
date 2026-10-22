# ADR 0019: Literal Code and Bounded Visual Formatting in Custom Sections

- Status: accepted.
- Date: 2026-10-20.
- Complements [ADR 0013](0013-custom-sections.md), [ADR 0015](0015-explicit-profile-html.md), and [ADR 0018](0018-readme-import-with-backup.md).

## Context

A personal section may include a TOML fragment or a fragment in another language. It must appear as code, preserve its exact text, and remain editable without relying on HTML. Heading levels and alignment are also needed for personal text, while preserving existing documents and GitHub's output policy. A syntax-highlighted editor makes HTML easier to write, but does not expand the allowed tags, attributes, or resources.

## Decision

Extend `ProfileDocument` v2 additively, without changing the version, storage keys, or legacy structures. The parser remains strict and adds no defaults:

- `code` has exactly `{ id, type: "code", source, language }`, with both text values required. `language: ""` represents text with no declared language. `source` is preserved without trimming, normalizing line breaks, or interpreting HTML, Markdown, or instructions.
- `paragraph` allows `alignment?: "left" | "center" | "right"`.
- `heading` allows `level?: 1 | 2 | 3` and `alignment` with the same values.
- A custom section allows `titleLevel?: 1 | 2 | 3` and `titleAlignment` with the same values.

Absent options preserve the previous output: section title as `##`; subtitle as `###` when a section title exists and `##` otherwise; and escaped-text paragraphs. Explicit left alignment also uses Markdown. Lists, images, and code are not aligned automatically. Duplicating copies the source and every option, changing only the corresponding IDs. A strict older reader may reject the additions and must preserve the original protected value.

### Code and languages

The pure catalog in `src/core/code/` offers local choices and aliases without network access. It normalizes letter case, surrounding whitespace, and known aliases. An unknown identifier of up to 64 UTF-16 code units is accepted if it is an alphanumeric token that may also contain `_`, `+`, `.`, or `-`; it is not interpreted as an attribute or executable content. Known aliases may be converted to a safe canonical token. An invalid language blocks export with `invalid_code` at `language`.

Each block allows up to 30,000 UTF-16 code units of source, and the document allows up to 150,000 UTF-16 code units of visible code. These are export limits: longer source remains in the draft and produces `invalid_code` at `source`. Hidden sections are excluded. A source that is exactly empty is omitted; intentional spaces and line breaks are code. The backtick fence is longer than any run in the source, so pasted text cannot close the block or activate HTML. A delimiter line break is appended after the source without changing the source itself. The Markdown renderer may normalize line breaks according to CommonMark; the draft and exported source retain the written characters.

The importer recognizes fenced and indented code nodes as `code` blocks, preserves AST content, and normalizes the language. The parser may normalize line breaks; the backup keeps the original Markdown exactly. Unrepresentable metadata is reported. An invalid language token is converted to plain text with no language and a warning. Independent code fragments inside closed HTML remain editable. If they belong to an open HTML context or a nested structure that must remain together, preserving that structure takes precedence, and any lost language metadata is reported. Do not automatically convert `pre/code` inside an existing HTML block.

### Derived formatting

Levels without special alignment generate Markdown. Center and right alignment build HAST elements with normalized text as literal values, serialize them with contextual escaping, and pass them through `analyzeProfileHtml`. Personal text is never interpreted as HTML. Separate paragraphs remain distinct aligned `p` units. No CSS, classes, scripts, or unrestricted attributes are generated.

Derived HTML uses the current HTML limits: 30,000 source code units per fragment, 1,500 nodes, depth 32, and 150,000 aggregate visible units shared with explicit HTML blocks. Errors point to `title` or `text` and block output. The explicit HTML budget is checked before analysis, and each derived fragment is added to the budget before it is analyzed. Code has a separate budget because it is not interpreted as HTML.

Output uses the existing `customHtml` contract: complete closed units, an allowed tree, and exact UTF-16 ranges in the final Markdown. The aligned title is included as its own unit; heading semantics are adapted only in the preview. Do not add `dangerouslySetInnerHTML`, `rehypeRaw`, a global parser, or a second README output. Metadata is derived and is not stored.

### Source editing

HTML and code source may be shown with syntax highlighting, line numbers, and indentation help inside a small client boundary. It must preserve a plain-text alternative, labels, focus and keyboard navigation, selection, and exact editing. Highlighting does not validate export. The editor loads locally; it does not execute code or add accounts or remote services. Concrete dependency and loading decisions are documented alongside the implementation.

## Alternatives

- Reuse HTML `pre/code`: preserves visual content, but loses the language when classes are filtered and requires writing tags for a common fragment.
- Store free-form Markdown or reinterpret all paragraphs: makes existing fields ambiguous and broadens the interpretation surface.
- Use a universal rich-text editor: requires another contract and more compatibility rules for needs already met by small blocks.
- Always store formatting defaults or migrate to v3: rewrites documents without a contract need and makes explicit choices harder to distinguish.

## Consequences

Code, HTML, and ordinary text retain separate contracts. Existing documents keep their output; new choices remain editable and are duplicated independently. Syntax highlighting and final alignment depend on GitHub's renderer; no color theme or exact preview parity is promised. Code execution and rich inline formatting are not added.

## Sources

- [GitHub: code blocks and syntax highlighting](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-and-highlighting-code-blocks).
- [GFM: fences, headings, and HTML](https://github.github.io/gfm/).
- [GitHub Markup: processing and sanitization](https://github.com/github/markup).
