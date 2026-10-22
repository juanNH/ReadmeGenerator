# ADR 0004: Local editor and shared Markdown

- Status: accepted.
- Date: 2026-10-19.
- Scope: presentation, contact, generation, preview, and local draft.

## Context

The editor needs to turn a person's input into reproducible output, with a consistent preview and export, without requiring an account or external services. The profile contract contains nine modules; the current editor and generator support presentation and contact.

## Decision

Accept plain text and generate escaped Markdown in `src/core/readme/`. The generator receives a structurally valid document and checks output limits separately. It returns Markdown or errors with a code and path: `empty_profile`, `invalid_url`, and `unsupported_module`. Do not silently produce a partial export when visible modules are unsupported.

Allow absolute HTTP/HTTPS URLs without credentials, spaces, control characters, or backslashes, and `mailto:` with a single ASCII mailbox and no parameters. Hidden data remains in the document and does not affect output.

Use the same Markdown for preview, clipboard, and download. Render the preview with ReactMarkdown 10.1, without free-form HTML or GFM plugins, and with explicitly allowed elements. The editor layout is not an export format. `contentLocale` controls README labels and remains separate from the interface language and the text the person wrote.

Keep the draft in `localStorage` through an adapter in the editor feature. Recover and validate it before enabling writes. Save after 500 ms and attempt a flush when leaving, hiding, or unmounting the page. Protect invalid or inaccessible values: replacement requires confirming a new draft. If a write fails, keep editing in memory, show a persistent warning, and leave valid export available.

Temporarily keep that state in the client module when saving is unavailable: changing languages remounts the editor, which must recover the full document without relying on failed storage. Read it after hydration and write it only from client effects. A successful save removes this ephemeral backup; it does not survive reload or closing the tab.

## Alternatives

| Alternative                               | Consequence                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Edit free-form HTML or Markdown           | Expands input interpretation and makes it harder to keep preview and output controls consistent. |
| Render a preview directly from forms      | Duplicates rules and can differ from the exported file.                                          |
| Save to a server                          | Requires identity, operations, and additional data policy for this account-free flow.            |
| Replace a failed read with initial values | Can destroy incompatible or temporarily inaccessible information.                                |

## Consequences and review

The flow works without network access or credentials to generate the README. The draft depends on the origin and browser: there is no synchronization, remote backup, or guarantee of persistence after an abrupt close. A storage failure does not prevent editing or export, but changes may be lost on exit.

The model retains the other seven modules without promising forms or generators. Export requires resolving any visible unsupported module; its data is not deleted. There is no free-form format customization or configuration portability through files.

Review this decision when additional output formats, new link policies, or concrete persistence and compatibility requirements arise. Earlier decisions describe the state of their deliveries and retain their historical value. See [editor](../editor.md), [profile model](../profile-model.md), and [architecture](../architecture.md).
