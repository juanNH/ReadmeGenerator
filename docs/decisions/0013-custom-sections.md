# ADR 0013: Custom sections and v2 document with mixed order

- Status: accepted.
- Date: 2026-10-19.
- Updates the contract and storage from [ADR 0003](0003-profile-document.md) and [ADR 0004](0004-local-readme-editor.md), and expands the composition from [ADR 0006](0006-editor-navigation.md). Retains the retirement of modules in [ADR 0008](0008-focused-profile.md), GitHub activity, and safe-output rules.

## Context

A brief profile needs to allow personal content that does not fit the five fixed forms, without restoring a résumé structure or enabling a free-form HTML or Markdown editor. Custom sections need to be repeatable, ordered among existing sections, and copied without sharing data with the original.

The v1 document has nine fixed IDs and `moduleOrder`; it does not represent repeatable instances with blocks. Changing this format requires a new version and recovery that preserves the earlier draft, including read or write failures.

## Decision

### Current document

Use `ProfileDocument` with `schemaVersion: 2`. Retain `contentLocale`, `data`, and `visibility` with the legacy fixed structures. Add `customSections` and replace `moduleOrder` with one mixed `sectionOrder`:

```ts
type SectionReference =
  { kind: "module"; moduleId: ModuleId } | { kind: "custom"; sectionId: string };
```

The order includes each of the nine fixed IDs and each custom instance exactly once. Unknown, missing, or repeated references are rejected. Identities are opaque strings, independent of titles and DOM IDs.

The editor retains the five optional fixed forms and allows creating multiple custom instances. Skills, education, and current focus do not return to navigation or output. Metrics remains integrated into contributions and retains its internal reference without separate output. When reordering included references, hidden and retired ones remain in their slots; cancelling a drag preserves the previous document.

### Custom content

An instance contains `{ id, title, visible, blocks }`. The title is optional, can be repeated, and produces a heading only when useful body content exists. Blocks have their own IDs and include:

- `paragraph`: plain text.
- `list`: `unordered` or `ordered` style and `{id, text}` items.
- `link`: optional label and web URL.

Adding creates an empty, visible instance. Duplicating deep-copies all its blocks and items, retains text, order, and visibility, and obtains new IDs through a supplied function. The copy's reference is placed next to the original. Failure to generate identities applies no partial changes. Editing a copy does not affect another instance.

Hiding changes only inclusion and preserves data and position. Deleting removes only that instance and its reference; the UI asks for confirmation when it has a title or content and retains all other sections and copies. Add, remove, convert, and reorder actions manage focus and are announced in English and Spanish.

Structured lists and their helpers belong only to the custom form. Starting the first line of a text block with `- ` allows converting it into a bulleted list; Enter adds items, and the last empty item allows continuing as text. Pasting multiple lines creates items. Converting to text preserves content and markers. Presentation fields, notes, and fixed modules do not add this behavior or interpret free Markdown.

### Recovery and saving

Keep `profileDocumentV1Schema` strict. `parseProfileDocument` validates v2 or validates v1 and returns a deterministic migration: it preserves data, flags, language, and IDs, converts `moduleOrder` to fixed references, and adds `customSections: []`. It does not merge, translate, or invent content. A v1 document with additional v2 fields is not accepted as a legacy document.

The browser adapter first reads `github-profile-generator.profile.v2`. Only if it is absent does it read `github-profile-generator.profile.v1`. Recovery and migration are read-only: they do not write on open, language change, or exit without editing. The first edit saves to v2 using the existing deferred save. The v1 key is kept intact as the local original; no current write or confirmed reset deletes or overwrites it.

An invalid, incompatible, or inaccessible v2 does not fall back to v1. It is preserved, and the person can work in memory until explicitly choosing to start another draft. Cancel retains both values. This avoids hiding newer changes after loading an older copy and does not constitute synchronization or remote backup.

### Generation and security

The pure generator walks `sectionOrder` and produces the same Markdown for preview, copy, and download. Hidden instances are omitted, including their invalid links. Titles without a body and empty blocks produce no output. A body without a title is exported without inventing a name.

All personal text is escaped. Lists omit empty items, preserve order, and indent continuations to match marker width, including two-digit numbering. Equivalent Markdown markers alternate between emitted lists (`+`/`*` and `.`/`)`) to preserve independent blocks and restart numbering, including across untitled sections. Custom bullets are also distinguished from the `-` used by fixed modules. No HTML or invisible content is added to separate them. Text that resembles Markdown or HTML does not introduce additional blocks.

Custom links use the shared HTTP/HTTPS policy, without credentials, spaces, controls, or backslashes. They do not use Contact's `mailto:` exception. A visible invalid link blocks the entire output and returns its original path `customSections/{index}/blocks/{index}/url`, even when visual order differs. The restrictions for cards, allowed catalogs, `skipHtml`, and the absence of arbitrary images or `rehypeRaw` remain in place.

## Alternatives considered

| Alternative                              | Advantage                              | Reason for the decision                                                            |
| ---------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| Repeat fixed modules without changing v1 | Reuses existing forms.                 | Unique v1 IDs do not represent repeatable instances or custom content.             |
| Free-form HTML or Markdown               | More formatting freedom.               | Expands input and rendering and does not provide the requested structured editing. |
| Keep two orders, fixed and custom        | Reduces changes to the previous order. | Does not uniquely represent how sections are interleaved in the README.            |
| Overwrite v1 on open                     | Simplifies later saving.               | Changes the original without an edit and risks data if storage fails.              |
| Use v1 when v2 fails                     | Quickly recovers an older copy.        | Can hide later changes and make recovery appear successful.                        |

## Consequences

- Format compatibility and exportability remain separate checks.
- One order allows sections to be mixed without a second representation of the README.
- Copies require regenerating all identities and separating nested objects.
- Retaining v1 uses additional storage and provides a local original, without automatic restore over an existing v2.
- Error paths must distinguish instances by stored index and the UI by identity, without relying on titles or visible positions.

See [profile model](../profile-model.md), [editor](../editor.md), and [architecture](../architecture.md).
