# ADR 0026: Choose Cards with Samples and Fetch Data on Explicit Action

- Status: Accepted for implementation.
- Date: 2026-10-20.
- Product: GitHub Profile Generator.
- Extends [ADR 0025](0025-activity-data-cache-and-preview-batching.md) and replaces automatic loading of new configurations in the editor.

## Context

Incremental caching and batching clicks reduce repeated work, but each new combination of options could still request an image while the person edited. The requested flow was to choose cards from thumbnails, fetch them with a button, and make the README language easier to find. Free hosting and the PAT's shared quota make it important to avoid accidental requests, without presenting this interface control as infrastructure for large-scale traffic.

## Decision

### Choose locally before fetching

Offer the ten families as independent choices with local CSS samples. Samples contain no personal statistics, remote images, or provider requests. They show layout patterns; real cards use the configured options. People can choose cards before searching for a user or completing destinations. Required fields and generator errors still determine whether a selection can be applied.

The “Search and show cards” action approves the latest batch of URLs generated for the visible selection. Images are requested only after that action and show their own loading or error states. Successfully decoding an SVG does not prove that the provider was available: an unavailable-card response is also valid SVG. The overall status says that the selection is applied without claiming that all its data was retrieved.

Keep the optional search for suggested contributions separate. Its button requests the basic snapshot through `useGitHubActivity`; that request is not required to choose or load Extended, repository, Gist, or WakaTime cards. Manual contributions continue to work without credentials.

### Derived URLs and temporary approval

`ReadmeResult.activityCards?` contains only the card URLs emitted by the generator, in their original order and with repetitions preserved. They are collected while building the same Markdown, without another generator or additional parsing of the document. The property is omitted when there are no cards and from results with errors. It is derived metadata, not part of `ProfileDocument` or the draft.

The editor validates those URLs with `parseActivityCardUrl` and `parseResourceCardUrl` and obtains their exact local paths. `EditorWorkspace` keeps the latest approved set in memory only. `PreviewImage` shows a local sample without linking to the endpoint when the current URL has not been approved. A new user, destination, content language, filter, or appearance requires applying again if it changes the URL. Manual text and form edits do not change approval for a URL.

Applying another batch replaces the previous set; changing A → B → A without applying B preserves approval for A. An approved image may be requested again after remounting, depending on the browser and server caches. Approval does not guarantee that all its bytes remain in browser memory.

Recovering a draft on mount starts without approvals. A new draft, confirmed deletion, import, project open, and restoration revoke the set. Reviewing or canceling a candidate file preserves the profile and does not load its resources.

The document, autosave, copy, and download continue to use the current configuration and Markdown. An editor search is not a new export requirement. Existing errors, the required public HTTPS origin, and image and HTML restrictions remain in force. The first approved image keeps showing a sample while it loads; the real image appears after it decodes, and failures allow an explicit retry.

### Accessible language control near the top

Move `readme-language` to the configuration header, before the title and form. Preserve its accessible name, help, focus behavior, language names without flags, and the distinction between content language and interface language. Keep the mobile label compact and check phone heights before any automatic scrolling. The horizontal section bar does not gain another row of controls.

On phones, compact the section actions beside the title with 44 px icons and accessible names. Keep the position counter's text available to screen readers; leave it visible on desktop. Constrain the language group to the available width and let it reflow with enlarged text, without overflowing the page or pushing the first field below a 568 px viewport at normal zoom.

### Operational limits

Approval affects the editor. A published README and public SVG endpoints may make new requests when no reusable cache entry exists. Per-field caching, CDN caching, deduplication, and per-process limits remain in place; the PAT quota is still shared among visitors. No accounts, dependencies, GitHub App, or infrastructure are added. The [API and hosting guide](../github-api-and-hosting.md) distinguishes GitHub quota, Vercel consumption, and visitors, using official sources and hypothetical examples.

## Alternatives Considered

- Increase the debounce: this would still fetch intermediate configurations when editing pauses.
- Freeze the document or Markdown until data is fetched: this would desynchronize editing, saving, and export.
- Request the basic snapshot before every family: this would fetch data that Extended or WakaTime does not need.
- Reproduce URL-building rules in the editor: this would duplicate selection, normalization, and filters; use generator metadata instead.
- Load real thumbnails from providers: this would consume quota before confirmation and mix examples with personal data.
- Approve a user or a global boolean: this would enable requests for options and destinations that have not been applied.

## Verification

Check for zero JSON/SVG requests when selecting, typing, recovering, or changing options without applying; loading only the final batch; resources independent of the GitHub user; inert pending URLs and links; retry, late responses, and languages; revocation after replacing the profile; and exact metadata omitted on errors. Review the language control and first field at phone and desktop heights. Executed results are recorded in [Development](../development.md).
