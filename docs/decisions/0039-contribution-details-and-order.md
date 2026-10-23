# ADR 0039: Detailed and Reorderable Contributions

- Status: Accepted.
- Date: 2026-10-23.

## Context

Manual contributions previously held one optional URL and appeared in their saved order without controls to change it. People need to describe work with several destinations or an illustrative image, and to choose which contribution appears first. These details must remain optional and must not require a GitHub account or API request.

## Decision

Extend only the v2 contribution item with optional `links` (up to ten entries) and `images` (up to three public HTTPS URLs with alternative text). Keep the existing `url` field for compatibility. When `links` is absent, generation uses the legacy URL; when it is present, it is authoritative. The optional v2 `repository: { url, description }` field is retained only to parse drafts made by the former repository preview. It renders as a normal link and contribution description; the first edit moves it into `links` and `description`. V1 remains strict and recovery does not insert or migrate fields.

The editor adds, removes, edits, and reorders contributions with explicit keyboard-accessible move controls. Images use the existing filtered derived-HTML policy and shared budget, with exact `customHtml` ranges; they do not extend `customImages`. Repository URLs use the ordinary link editor. Link and image order is preserved.

## Alternatives Considered

- Replace `url` in v2: would discard the legacy shape or require a migration on recovery. Keep it as the fallback when the additive field is absent.
- Fetch repository metadata or upload images: would add network behavior, credentials or hosting requirements. Use manually entered public URLs and image descriptions.
- Sort contributions automatically: would change user intent. Keep the saved order and expose move up/down controls.

## Consequences

People can give each contribution richer context without activating an integration. Old drafts keep their previous output until edited; v1 documents retain their original contract. Invalid links, image URLs, or missing alternative text block export with field-specific errors. The preview and README derive from one generated Markdown result.

See [Profile Model](../profile-model.md), [Editor](../editor.md), [ADR 0015](0015-explicit-profile-html.md), and [ADR 0021](0021-project-files-and-recovery.md).
