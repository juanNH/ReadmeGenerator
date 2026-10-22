# ADR 0005: Manual composition of eight modules

- Status: accepted.
- Date: 2026-10-19.
- Scope: manual editing, composition, and README generation.
- Extends [ADR 0004](0004-local-readme-editor.md); retains its decisions about plain text, shared Markdown, and local recovery.

## Context

The v1 contract already contains nine modules. The editor needs to present skills, education, technologies, current focus, projects, and contributions alongside presentation and contact, without requiring public activity or work history. Showing all forms open makes long profiles harder to navigate; hiding a section must not be the only way to reduce editing space.

Collections have opaque IDs and may contain partial data. Saved drafts must retain their format, language, hidden content, and order. Metrics has configuration in the contract but no editing or generation support.

## Decision

Support eight manual modules with specific forms in `src/modules/` and small pure renderers in `src/core/readme/`. Keep `ProfileDocument` at version 1 and retain the existing storage key, without migration: all required fields are already represented. The core registry retains schemas and metadata, without components, icons, or interaction rules.

Separate three actions: collapsing preserves visibility and content; hiding changes visibility while preserving content; removing an entry deletes its data through an action that explains the effect. The open card is ephemeral state, and only one card is open at a time. Link errors appear in the field and card; a review action opens and focuses the corresponding field.

Reorder with Move up/Move down buttons that swap two neighboring visible manual modules within the full array. Hidden IDs and metrics retain their positions; always pass all nine IDs to `reorderModules`. Use this order for forms and the README, with focus and a position announcement. Do not introduce a parallel UI order or drag-and-drop.

Keep technologies as free text that can be grouped, without a catalog, logos, or scores. Project technologies remain strings; entries with IDs retain their opaque identity. Use independent DOM IDs and create new entry IDs outside the core. Keep dates as free text and enums nullable, without inferring seniority, completion, or skill.

Omit empty entries without inventing titles. Technology groups need at least one exportable entry; education or current-focus enums alone do not create content. Other partial data is shown without requiring a name, institution, job, or repository. `contentLocale` translates generated labels and enums while preserving authored text and dates.

Share the HTTP/HTTPS web-link policy across modules. Only contact allows `mailto:` under its restrictive policy. An empty optional URL is valid; a contact or project link row with a label but no URL requires correction. Errors for supplied URLs include the full path and block the entire output, including nested links. Hidden data does not block generation.

Keep `unsupported_module` for visible metrics. Offer an explicit action to hide it while preserving username, cards, and order. Do not discard configuration or silently produce a partial export.

## Alternatives considered

| Alternative                                           | Consequence                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Show all eight forms open                             | Lengthens the flow and makes it harder to focus on one section.           |
| Use visibility to collapse forms                      | Changes the README when the person only wants to reduce editing space.    |
| Store a second order containing only visible sections | Requires reconciling it with hidden modules and the full contract.        |
| Require titles, institutions, or repositories         | Excludes useful partial content and profiles with little public activity. |
| Migrate the document to enable forms                  | Changes a format that already represents all its data.                    |
| Hide or delete metrics automatically                  | Alters draft decisions or configuration without an explicit action.       |

## Consequences and review

Short and extensive profiles use the same composition without completion percentages. Collapsed state is not persisted, while content, visibility, and order use the existing draft. Repeatable forms require explicit focus when adding and removing entries; order controls need distinct names and handling for the endpoints.

The README remains limited to generated Markdown and its shared preview. This does not add free-form customization, remote catalogs, GitHub queries, metrics, or AI. Review this decision if the persisted contract, link policy, or composition behavior changes.

See [editor](../editor.md), [profile model](../profile-model.md), and [architecture](../architecture.md).
