# ADR 0039: Detailed and Reorderable Contributions

- Status: Accepted.
- Date: 2026-10-23.

## Context

Manual contributions previously held one optional URL and appeared in their saved order without controls to change it. People need to describe work with several destinations, an illustrative image, or a repository reference, and to choose which contribution appears first. These details must remain optional and must not require a GitHub account or API request.

## Decision

Extend only the v2 contribution item with optional `links` (up to five entries), `images` (up to three public HTTPS URLs with alternative text), and `repository` (a GitHub repository URL and a description written by the user). Keep the existing `url` field for v1 compatibility. When `links` is absent, generation uses the legacy URL; when it is present, it is authoritative. V1 remains strict and migration does not insert the new properties.

The editor adds, removes, edits, and reorders contributions with explicit keyboard-accessible move controls. Images and repository descriptions are rendered through the existing filtered derived-HTML policy and shared budget, with exact `customHtml` ranges. They do not extend `customImages`. A repository preview is derived only from the entered owner/name, URL, and description; it does not query GitHub. Link and image order is preserved.

## Alternatives Considered

- Replace `url` in v2: would discard the legacy shape or require a migration on recovery. Keep it as the fallback when the additive field is absent.
- Fetch repository metadata or upload images: would add network behavior, credentials or hosting requirements. Use manually entered public URLs and descriptions.
- Sort contributions automatically: would change user intent. Keep the saved order and expose move up/down controls.

## Consequences

People can give each contribution richer context without activating an integration. Old drafts keep their previous output until edited; v1 documents retain their original contract. Invalid links, image URLs, or missing alternative text block export with field-specific errors. The preview and README derive from one generated Markdown result.

See [Profile Model](../profile-model.md), [Editor](../editor.md), [ADR 0015](0015-explicit-profile-html.md), and [ADR 0021](0021-project-files-and-recovery.md).
