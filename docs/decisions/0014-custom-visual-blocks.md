# ADR 0014: Custom visual blocks and explicit HTTPS images

- Status: accepted.
- Date: 2026-10-19.
- Extends the blocks in [ADR 0013](0013-custom-sections.md) and replaces its general restriction on personal images only for the explicit `image` block. It keeps document v2, its keys, the v1 migration, the retirement of modules in [ADR 0008](0008-focused-profile.md), the allowed catalogs, and output rules that disallow unrestricted HTML.

## Context

Custom sections allow people to write brief content outside the five fixed forms. The composition needs recognizable visual options to separate ideas, emphasize a phrase, and display an already-published image, without asking for career history or turning the editor into a free-form HTML or Markdown document.

GitHub supports images from a repository or external URLs and describes alternative text as the textual equivalent of an image. Its profile README guide includes quotes and dividers. This lets the generator create specific formats from structured fields while keeping the same Markdown for preview, copying, and download. See [images on GitHub](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#images) and [quotes and dividers in a profile](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/quickstart-for-writing-on-github#adding-a-quote).

Selecting a file from a device does not publish it. The application has no image-upload service and does not modify the person's repository. Export must reference an HTTPS resource hosted separately and keep a clear distinction between an accepted URL and an available resource.

## Decision

### Additive expansion of v2

Add four variants to the strict union of `customSections` blocks:

```ts
type CustomVisualBlock =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "divider" }
  | { id: string; type: "quote"; text: string }
  | { id: string; type: "image"; url: string; alt: string };
```

The `paragraph`, `list`, and `link` variants keep their existing shapes. No default properties are added to earlier blocks, and no inherited structures, `sectionOrder`, visibility, version, or storage keys are changed. The current format remains `schemaVersion: 2` and uses `github-profile-generator.profile.v2`. Strict v1 reading and its in-memory migration remain unchanged; the original v1 data is neither rewritten nor removed.

An older reader with a strict union may reject the new variants even if it recognizes the version number. This expansion does not guarantee compatibility with that reader. When a value is incompatible, preserve the original; do not automatically replace it with v1. Existing documents that do not use the new blocks keep their structure and output.

Existing operations preserve opaque identities and order. Duplicating copies every block with new IDs and independent objects; URLs and descriptions remain text. Hiding preserves the tree, while deletion removes only that instance and its reference.

### Selector and editing

Offer eight options: text, bulleted list, numbered list, link, subheading, divider, highlighted quote, and image/banner. Both list options share the `list` type. Each option has a small local decorative sample, plus an accessible name and description in English and Spanish. Samples make no external requests and are not inserted as personal content.

Fields in a new block start empty. A divider needs no additional fields. Adding focuses the relevant field or the divider heading; removing and reordering preserve a stable target, and actions are announced in both languages. List helpers remain limited to paragraphs and lists in the custom-section form; they do not turn other fields into Markdown editors.

### Generated Markdown

- `heading` generates escaped text as `###` when the section has a title, or `##` when it does not. It is normalized to one line and omitted when empty.
- `divider` generates `---` and counts as explicit content.
- `quote` escapes the text and prefixes every line with `>`, including blank lines between paragraphs. An empty quote is omitted.
- `image` generates a Markdown image with an escaped alternative and a URL enclosed in `<` and `>`, after validating both fields. It does not generate HTML or interpret tags entered by the person.

The section title keeps its existing behavior: it appears only when the body has useful content. Block order, list indentation, and the alternating markers that separate independent lists are preserved. Text fields remain escaped; entering image syntax or HTML in them does not create visual content.

### Image policy and errors

`normalizePublicImageUrl` accepts HTTPS URLs with a syntactically public domain name. It rejects IP addresses, local hosts and known private suffixes, credentials, fragments, nonstandard ports, and characters disallowed by the shared web policy. It accepts queries, the default HTTPS port, and paths without a file extension. It rejects HTTP, local or relative paths, and schemes such as `file:`, `blob:`, and `data:`.

Validation is syntactic only: it does not resolve DNS, request the resource, check its file type, guarantee public access, or confirm that it will remain available. Help text asks for a direct URL to an already-published image that can be opened without signing in. It may be a banner, screenshot, or GIF available at that URL. Copying or downloading `README.md` does not copy or publish the resource.

A completely empty image is omitted. If it has alternative text but no accepted URL, it produces `invalid_url`; a URL without normalized alternative text produces `missing_image_alt`. If both fields need correction, both errors are reported. Paths point to the original stored values:

- `customSections/{index}/blocks/{index}/url`.
- `customSections/{index}/blocks/{index}/alt`.

Errors in a visible section block generation of the entire README; no partial README is produced. A hidden section produces neither errors nor image metadata. Structural validation accepts incomplete drafts and does not replace this export validation.

### Derived metadata and preview

A successful `generateReadme` result includes `customImages` only when valid custom images are present. It is a collection of `CustomImageSource` entries with canonical `src` and normalized plain-text `alt`, exactly matching the values in the generated Markdown node. It preserves order and repetitions. It contains no catalog icons or cards, is absent from results with errors, and is not stored in `ProfileDocument`.

The preview requires `src` and `alt` to match exactly the metadata from that same result and checks the HTTPS policy again. Icons, flags, and cards keep their existing closed exceptions. All other HTML is skipped with `skipHtml`, without `rehypeRaw`, unrestricted styles, or scripts. GitHub also sanitizes HTML in its documents and removes scripts and inline styles; see the [official markup pipeline](https://github.com/github/markup#github-markup).

Personal images use a browser-native `img` directly, with `loading="lazy"`, `decoding="async"`, and `referrerPolicy="no-referrer"`. They do not go through a proxy, network check, or server image optimizer. The browser contacts the specified host when displaying the image; the application does not download or host these files on its server.

A load failure displays the description, a notice, and a link to open the URL. This is ephemeral component state and does not change the draft, Markdown, or validity of an accepted URL. A temporary host issue therefore does not turn a valid URL into a persisted error or prevent copying or downloading the README.

## Alternatives considered

| Alternative                                         | Advantage                                              | Reason for the decision                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Allow unrestricted HTML or Markdown                 | More composition freedom.                              | Expands input and rendering beyond the agreed blocks and controls.                                                                       |
| Accept local files without publishing them          | Enables an immediate preview.                          | The file is not accessible from the exported README and would make export appear complete when it is not.                                |
| Download or validate images on the server           | Centralizes loading and can check responses.           | Adds requests to person-selected hosts and unnecessary operations for referencing an already-published image.                            |
| Use the image optimizer for these hosts             | Transforms resources.                                  | Requires the server to request personal images; direct browser loading is chosen instead.                                                |
| Move to v3 or add optional fields to earlier blocks | Distinguishes a new format or consolidates variations. | The agreed scope adds independent variants within v2; the earlier shape is retained and rejection by strict older readers is documented. |
| Block export when a preview image fails to load     | Flags a resource that did not respond at that moment.  | Confuses temporary availability with URL policy and would turn ephemeral state into an export rule.                                      |

## Consequences

- Profiles can include visual formatting without asking for additional career-history details.
- Visual content keeps the existing editing, duplication, visibility, and ordering behavior of sections.
- Alternative text is an export requirement for images; it is not inferred content.
- An accepted URL depends on the selected host and may stop working; no hosting or remote availability check is provided.
- Preview metadata is derived from the same generator and does not create another persisted source.
- Output safety remains separate from structural validation and browser image-load errors.
- Strict older readers must preserve documents they do not recognize; reusing the same version number does not permit discarding new variants.

See [profile model](../profile-model.md), [editor](../editor.md), and [architecture](../architecture.md). [ADR 0013](0013-custom-sections.md) preserves the historical decision on custom sections and migration.
