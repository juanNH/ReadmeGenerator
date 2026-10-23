# ADR 0035: Compact Technologies with Catalog Tags

- Status: Accepted.
- Date: 2026-10-20.

## Context

Category headings and separate tool rows took up a large portion of the README. The requested visual reference uses short tags that wrap to fit the available width. GitHub's format does not support arbitrary CSS, and an external badge service would add a network dependency and availability requirement.

## Decision

Add `data.technologies.layout?: "compact" | "grouped"` exclusively to v2. Its absence preserves the previous output exactly, with category headings. The parser and v1 migration do not add defaults; v1 retains its closed, independent schema. The factory for a new v2 profile explicitly selects `compact`. Opening JSON or recovering a draft preserves the selected option or its absence.

The “README layout” selector offers compact tags and category headings. Changing it updates the same Markdown used by preview, copy, and download. It does not regroup, rename, or remove categories, items, identities, or notes. All form edits and organization operations preserve the selected option.

Compact mode displays the category name in bold on the same row as its tools, wrapping to fit the width. Each name is wrapped in `kbd` and, when available, includes the catalog's pinned 20 × 20 decorative icon. Custom names remain text without an inferred brand. Notes keep their order and paragraphs; they are not hidden to reduce height. Groups with no useful content are omitted.

HTML is built from HAST text nodes, filtered with `renderProfileHtml`, and shares its limits and budget with the rest of the document. Exact UTF-16 ranges and allowed trees are provided through `customHtml`, without expanding `customImages`, enabling global HTML, or persisting metadata. `invalid_html` errors identify the affected group; the UI offers to fix it or return to category headings. Hidden technologies do not use the budget.

The preview recognizes only exact catalog URLs, an empty alternative text value, and 20 × 20 dimensions in order to use local SVGs. Compact tags use inline-flex alignment and bounded wrapping in the local preview so the icon and label occupy the available chip area without clipping. The rest of the image and HTML policy remains in place. No third-party badges are requested, no endpoint is created, and `APP_URL` is not required. Colors come from existing icons. GitHub controls the published `kbd` styling, so matching its appearance pixel-for-pixel is not promised.

## Alternatives Considered

- Change all drafts to compact during recovery: would alter an implicit saved choice. Preserve the previous output when the field is absent.
- Remove categories or notes from output: saves space at the cost of a person's content. Keep their original order.
- Use Shields or another external service: adds another host, resource format, and availability dependency. Reuse resources that already have attribution.
- Use SVGs with their own background: requires publishing a file or public endpoint for each badge. Tag composition avoids adding hosting.
- Use CSS and inline SVG in the README: GitHub may filter them and this would broaden the HTML boundary. Keep the current schema.

## Consequences

New profiles start with a more compact presentation, and existing profiles can select it explicitly. JSON retains the option and all original structure. An older strict v2 reader may reject `layout` and must preserve the document without overwriting it. An exceptionally large category can exceed HTML limits; category headings keep its content in Markdown. The local preview is approximate, and GitHub readers receive visible text beside decorative icons.

See [Profile Model](../profile-model.md), [Editor](../editor.md), [ADR 0012](0012-technology-categories.md), [ADR 0015](0015-explicit-profile-html.md), and [ADR 0021](0021-project-files-and-recovery.md).
