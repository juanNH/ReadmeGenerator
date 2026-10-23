# ADR 0018: README Import with Review and Backup

- Status: accepted for the first import increment.
- Date: 2026-10-20.
- Complements ADRs 0004, 0013, 0015, and 0017.

## Context

Someone with an existing README needs to continue editing its content. Published Markdown omits information from the editor document, such as hidden sections and identities, so it cannot be converted back exactly. It may also combine text, references, tables, and HTML that do not fit into plain visual fields. Deferred draft saving does not, by itself, provide a backup before replacement.

## Decision

- Paste text or open a local UTF-8 `.md` file. Analyze it without network access or writing to the draft; enforce limits before and during analysis.
- Parse Markdown structurally and inspect references and containers before splitting it into sections. Keep the document together when splitting HTML would break its context, and show an explicit warning.
- Recognize complete root-level HTML headings against the original tree and its ranges, preserving context across block and inline nodes. The opening header may combine a name and tagline at different levels; an H2 that follows an H1 with no body between them may be a tagline, while an independent opening H2 still establishes hierarchy. Use H2 separators, or H3 separators when there are no H2 separators, without splitting headings inside tables, disclosures, or other containers. When the structure is uncertain, keep the HTML together. Detected titles name the review section and remain in the HTML with their level and allowed attributes; do not duplicate them as generated titles.
- Propose custom sections in the detected order. Convert compatible content to existing blocks; represent complex structures with allowed, reviewable HTML. Do not infer fixed modules, technologies, or career history from a title or icon.
- Preserve the entire original source and its ranges. Show the source and result as code during review, without rendering images, cards, or remote HTML. Selecting sections is an explicit decision; errors prevent the affected section from being applied, and exclusions are reported before confirmation.
- Reuse `ProfileDocument` v2, the HTML analyzer, and the generator. Do not introduce raw Markdown, expand allowed tags or URLs, or enable global HTML interpretation. Copy, download, and preview of the applied profile continue to use the same output.
- Save the complete previous profile and the original Markdown in a versioned sidecar record containing the latest backup. Save that record before writing the candidate. Offer separate downloads for both and confirmed restoration, while retaining the backup.
- When storage is unusable or a protected value exists, require an explicit choice to continue in memory only. Preserve invalid stored values and v1; this choice does not re-enable automatic saving. Invalidate earlier debounces and flushes so they cannot overwrite the replacement.
- Keep the flow bilingual, with a panel accessible from the horizontal bar. Closing or reviewing does not replace the profile; confirming returns to the imported form.

## Alternatives

Reconstructing modules automatically from titles can assign content incorrectly. Pasting everything as escaped text loses formatting. A generic raw-Markdown block would expand the persistence, export, and security contracts; it is deferred until a future need. Using AI for parsing adds uncertainty and services without being necessary for this scope.

## Consequences

The imported README preserves what can be represented and makes differences visible, without promising visual or textual parity with GitHub. Incompatible formats require correction or an informed exclusion. The backup preserves the previous profile, including hidden content; it cannot recover settings that were never present in the input README. Relative paths and anchors need correction under the current policy. Only the latest backup is kept; this is neither a history nor cross-device synchronization.

Parsing dependencies are declared directly and pinned; the renderer's existing ecosystem is reused. Tests protect against writes or loads during analysis, hostile inputs and limits, conversion and ordering, confirmation, storage failures, recovery, and pending writes. Automated accessibility checks and emulation do not replace physical devices or screen readers.
