# ADR 0033: Linked Titles and Optional Project Covers

- Status: Accepted.
- Date: 2026-10-20.
- Evolution: ADR 0037 updates the form composition and output order; linked titles and the cover contract remain in effect.

## Context

The project list repeated each name and its link, and separated contributions and technologies into long paragraphs. An optional image makes it possible to show an app without requiring a repository or turning the section into a résumé. Output must work as a GitHub README and preserve the current image and HTML policy.

## Decision

Each project with a name generates a level-three heading. The first useful, valid link is used as the title destination and omitted from the additional output links. Its original label remains in the document. Without a name, all links are shown with their labels. The form identifies the primary link and lets the user choose another by reordering the collection; it does not add a separate persisted selection. All links are validated, and errors retain their original indices.

Add `cover?: { url: string; alt: string }` to v2 project entries. It is optional and is not inserted when recovering older documents. The v1 project schema remains closed and independent. An empty cover is omitted; a selected URL requires non-empty alternative text. Reuse normalization for public HTTPS images without uploading files, resolving DNS, fetching metadata, checking availability, or adding dependencies.

The cover derives an HTML unit with a 480-wide `img`, built with HAST and validated through the policy and shared budget of `renderProfileHtml`. Only that unit is authorized through exact UTF-16 ranges in `customHtml`. `customImages` remains reserved for custom `image` blocks. The preview traverses the existing allowed tree and uses `PublicProfileImage` with lazy loading, asynchronous decoding, and no referrer. There is no arbitrary HTML, proxy, or alternate README output. The original URL and alternative text are retained in JSON; normalization affects output only. Hidden projects do not use the budget or produce export errors.

Description, contributions, technologies, and additional links remain optional; contributions and technologies share a compact paragraph. The editor offers a composition with a title, cover thumbnail, and text, but the final appearance depends on GitHub. It does not promise a CSS card, borders, or a layout identical to the editor.

## Alternatives Considered

- Persist a primary destination: adds another reference that can become stale when links are removed. Reordering preserves the prior contract and makes the choice visible.
- Reuse `customImages` for the cover: would broaden its meaning and authorize images without the derived unit's limits and ranges. Reuse the already validated HTML path instead.
- Fetch screenshots or Open Graph data automatically: requires network access, site extraction, and another privacy boundary; use an explicit public image.
- Create a grid with tables and styles: complicates mobile layout and depends on styles GitHub filters. Keep a linear reading order with a bounded image.

## Consequences

The JSON file retains the full cover, including incomplete or invalid-for-publishing data. Older strict v2 readers may reject this field and must preserve the original file. Exported Markdown omits the primary link's label even though it remains editable in the project. An image load failure is temporary and does not invalidate an accepted URL.

See [Profile Model](../profile-model.md), [Editor](../editor.md), [ADR 0014](0014-custom-visual-blocks.md), [ADR 0015](0015-explicit-profile-html.md), and [ADR 0021](0021-project-files-and-recovery.md).
