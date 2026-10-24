# Profile model

The core implements `ProfileDocument` version 2, a registry of nine fixed IDs, and pure operations for creation, validation, visibility, ordering, and custom sections. The editor offers five fixed sections—presentation, technologies, projects, activity and contributions, and contact—plus multiple custom instances containing blocks. The retired IDs `knowledge`, `education`, and `current` preserve their legacy v1 structure, without editing or output. Metrics contributes cards to contributions and has no separate navigation entry. See [using the editor](editor.md).

## Location and contract

- [module-ids.ts](../src/core/modules/module-ids.ts) and [module-registry.ts](../src/core/modules/module-registry.ts): identifiers, initial order, and the typed registry of schemas, label keys, and empty-data factories. The UI resolves active-section labels from the EN/ES `Modules` namespace; the registry does not import components.
- [module-content.ts](../src/core/profile/module-content.ts) and [profile-schema.ts](../src/core/profile/profile-schema.ts): Zod schemas and inferred content and document types.
- [profile-validation.ts](../src/core/profile/profile-validation.ts), [profile-result.ts](../src/core/profile/profile-result.ts), and [profile-operations.ts](../src/core/profile/profile-operations.ts): parser, errors, and operations.
- [custom-content.ts](../src/core/profile/custom-content.ts) and [custom-section-operations.ts](../src/core/profile/custom-section-operations.ts): block schemas and custom-instance operations.
- [render-custom.ts](../src/core/readme/render-custom.ts), [public-image.ts](../src/core/readme/public-image.ts), and [readme-result.ts](../src/core/readme/readme-result.ts): block output, syntactic policy for public images, and derived preview metadata.
- [render-presentation.ts](../src/core/readme/render-presentation.ts) and [derived-profile-html.ts](../src/core/readme/derived-profile-html.ts): presentation and the pure helper that shares derived HTML, analysis, and budget with custom sections.
- [profile-html.ts](../src/core/readme/profile-html.ts): pure analysis of explicit HTML, limits, tags, attributes, and output policies.
- [Literal code](../src/core/code/index.ts): language catalog, aliases, safe tokens, limits, and code delimiters.
- [Technology catalog](../src/core/technologies/index.ts) and [contact providers](../src/core/contact/index.ts): pure presentation metadata; they do not add document properties.
- [Activity](../src/core/activity/index.ts), [public snapshot](../src/core/activity/activity-types.ts), and [SVG](../src/core/activity/render-card.ts): serializable contracts outside the document, normalization, and deterministic rendering; they do not query GitHub.

`schemaVersion` is the number `2`. `contentLocale` accepts `en` or `es` and is independent of the navigation language. `data` and `visibility` preserve all nine modules. `customSections` contains custom instances, and `sectionOrder` combines `{ kind: "module", moduleId }` and `{ kind: "custom", sectionId }`. Every fixed module and custom instance must have exactly one reference, including hidden or retired ones. V2 documents do not have `moduleOrder`. Optional means that users do not have to show a section or fill in its content; it does not mean its properties can be omitted.

The JSON shape uses `""` for empty text, `[]` for empty collections, and `null` for incomplete enumerated choices. It does not use `undefined` or clock- or randomness-based values. Complete example of `createEmptyProfile("en")`:

```json
{
  "schemaVersion": 2,
  "contentLocale": "en",
  "data": {
    "presentation": { "displayName": "", "headline": "", "bio": "", "location": "" },
    "knowledge": { "items": [] },
    "technologies": { "groups": [] },
    "education": { "items": [] },
    "current": { "items": [] },
    "projects": { "items": [] },
    "contributions": { "items": [] },
    "metrics": { "username": "", "cards": [] },
    "contact": { "links": [] }
  },
  "sectionOrder": [
    { "kind": "module", "moduleId": "presentation" },
    { "kind": "module", "moduleId": "knowledge" },
    { "kind": "module", "moduleId": "technologies" },
    { "kind": "module", "moduleId": "education" },
    { "kind": "module", "moduleId": "current" },
    { "kind": "module", "moduleId": "projects" },
    { "kind": "module", "moduleId": "contributions" },
    { "kind": "module", "moduleId": "metrics" },
    { "kind": "module", "moduleId": "contact" }
  ],
  "customSections": [],
  "visibility": {
    "presentation": false,
    "knowledge": false,
    "technologies": false,
    "education": false,
    "current": false,
    "projects": false,
    "contributions": false,
    "metrics": false,
    "contact": false
  }
}
```

## Fixed content preserved from v1

Every field is present in each entry; text may be empty. The table describes the persisted format, not editor options. The linked schemas are the exact reference. `knowledge`, `education`, and `current` are retired structures that are preserved internally.

| Module          | Content shape                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `presentation`  | `displayName`, `headline`, `bio`, `location`; only v2 supports optional `format`.                                                                                 |
| `knowledge`     | `items`: `id`, `title`, `description`.                                                                                                                            |
| `technologies`  | `groups`: `id`, `name`, `items`; each technology has `id`, `name`, and `context`.                                                                                 |
| `education`     | `items`: `id`, `kind`, `title`, `institution`, `status`, `startDate`, `endDate`, `description`, `url`.                                                            |
| `current`       | `items`: `id`, `kind`, `description`, `url`.                                                                                                                      |
| `projects`      | `items`: `id`, `name`, `description`, `role`, `technologies` as a text array, and `links`; v2 adds `titleUrl?` and `cover?: { url, alt }`.                        |
| `contributions` | `items`: `id`, `title`, `description`, legacy `url`; v2 adds optional `links`, `images`, and legacy `repository` data.                                            |
| `metrics`       | `username`, `cards`, `appearance?`, `extended?`, and v2 `cardColumns?`/`contentOrder?`; ten unique types and public options. It is composed within contributions. |
| `contact`       | `links`.                                                                                                                                                          |

Links have `id`, `label`, and `url`. Each `id` must contain at least one non-whitespace character and be unique within its collection; different collections may reuse an ID. Recovered IDs are not trimmed. Operations that need new identities receive an explicit function; the core does not generate them randomly.

IDs are opaque strings, not necessarily UUIDs, and must be preserved when editing or recovering data. Forms generate new IDs outside `core` and do not use them to build DOM IDs. `projects.technologies` remains an array of strings; no IDs are added to the persisted format. Technology groups may have an empty name, and each technology may have a name, context, or both.

Projects generate level-three titles linked to `titleUrl` when it exists. Earlier v2 documents use the first useful link in `links` as the destination; that collection is preserved in JSON, but secondary links are not edited or included in the README. When an earlier project is edited, the form preserves its primary destination in `titleUrl`. Legacy `role` and `technologies` are also preserved and included in the generated description. `titleUrl?` is additive in v2 only and is not inserted during recovery; v1 keeps its closed schema. `cover` stores the exact URL and alt text, without defaults during recovery or changes to v1. Its output requires public HTTPS and an alt description, and derives a 480-pixel-wide image after the description using the `customHtml` policy, budget, and ranges; it does not extend `customImages`. Hiding projects preserves the cover and excludes it from export validation. See [ADR 0033](decisions/0033-project-showcase.md) and [ADR 0037](decisions/0037-project-description-and-links.md).

V2 technologies support `layout?: "compact" | "grouped"`. When absent, the previous category-based output is preserved; recovery or migration from v1 does not add the field. Only a new v2 profile starts with `compact`. Compact presentation derives `kbd` labels with names, decorative icons, and inline categories using `customHtml`, its exact ranges, and the shared budget, without extending `customImages`. Notes preserve their paragraphs and order. All operations retain the selected option and content structure. See [ADR 0035](decisions/0035-compact-technologies.md).

V2 contribution items keep their existing `id`, `title`, `description`, and `url`, and add optional `links` (up to ten `{ id, label, url }` entries) and `images` (up to three `{ id, url, alt }` entries). When `links` is absent, generation uses the legacy `url`; when present, it is authoritative. Images require public HTTPS URLs and non-empty alternative text. `repository: { url, description }` remains accepted only so older v2 drafts can be opened; it renders as an ordinary link and description, and the first edit moves that data into the normal fields. The editor does not offer a repository preview or fetch metadata. Image HTML still uses the existing policy, budget, and exact `customHtml` ranges, without expanding `customImages`. The form preserves array order and offers explicit contribution move controls. V1 remains closed and recovery does not migrate fields. See [ADR 0039](decisions/0039-contribution-details-and-order.md).

Technology autocomplete uses a pure catalog of names, aliases, and suggested categories without adding fields to the document. A new selection stores the name and `context: ""` in the selected or suggested group; a custom tool may use an untitled group. The UI creates new IDs outside core. Pure operations receive an ID function, preserve content, and resolve duplicate item IDs across groups. Removing a category only clears its name; unnamed empty groups are preserved internally. The catalog resolves icons during generation without storing URLs or catalog IDs. Recovery or a language change does not reorganize the document; organizing is an explicit operation that preserves tools, notes, and recovered duplicates.

The contact catalog derives the provider from `url` after normalizing it and comparing its hostname against explicit domains. It does not interpret the label as a provider or add a persisted field for the form's suggested selection. Each contact continues to contain only `id`, `label`, and `url`. Personal websites, portfolios, and email addresses remain valid even when they do not belong to a known service.

Location keeps `presentation.location` as a free-form string. An explicit selection from the country catalog stores, for example, `"🇦🇷 Argentina"`. Only the exact flag and EN/ES name for the same country allow a fixed 20 × 15 decorative SVG to be generated next to the escaped name; no URLs or new fields are added to the document. The form shows the name with its local flag, and search recognizes both languages and ISO codes. Typing a different location removes the previous selection's prefix. Other values, such as `"Argentina"`, `"Buenos Aires, Argentina"`, or `"🇦🇷 Remote"`, remain intact text and are not rewritten or translated automatically. See [ADR 0011](decisions/0011-country-and-contact-inputs.md).

### Optional cards and appearance in v2

`data.metrics.cards` accepts `calendar`, `summary`, `languages`, `panorama`, `monthly`, `extended-stats`, `extended-languages`, `extended-repository`, `extended-gist`, and `extended-wakatime`, without duplicates. The three resource selections generate one card per configured destination and do not require `metrics.username`; the seven profile cards do require a valid username.

V2 also supports `cardColumns?: 1 | 2` and `contentOrder?: "activity-first" | "contributions-first"`. New profiles set `cardColumns` to `2`; when absent, generation keeps the previous one-card-per-row output. Two-column output preserves card selection order in GFM table rows, puts an odd final card on its own, and increases SVG text size for the reduced cell width. `contentOrder` chooses whether cards or manual contributions appear first in the combined section; absence preserves activity-first output. Recovery and v1 migration do not add either option; v1 remains strict. See [ADR 0040](decisions/0040-activity-card-columns.md) and [ADR 0041](decisions/0041-activity-contribution-order-and-readable-cards.md).

`appearance?` is strict and preserves `theme?: "light" | "dark"`, `palette?: "forest" | "ocean" | "violet"`, `design?: "classic" | "panels" | "minimal"`, and `size?: "compact" | "wide"`. It adds `preset?` with 79 named themes; hexadecimal `#RRGGBB` values for `titleColor/textColor/iconColor/borderColor/backgroundColor?`; `backgroundGradient?` with an angle from 0–360 and 2–10 colors; `borderRadius?` from 0–30; integer `width?` from 700–1200; integer line height `lineHeight?` from 22–50; `customTitle?` up to 100 units; booleans `hideTitle/hideBorder/showIcons/textBold?`; `numberFormat?: "short" | "long"`; and integer precision `numberPrecision?` from 0–2. It does not accept CSS, hosts, URLs, or unrestricted options.

`extended?` contains the strict optional properties `stats`, `languages`, `repositories` (up to twelve `owner/name` values), `gists` (up to twelve IDs), `wakatimeUsername`, and `resourceOptions`. `stats` preserves an ordered selection of 18 IDs, commit period, year, filters, inclusion of owned repositories, and opt-in ranking with `letter/percentile/github` presentation. `languages` supports five layouts, from 1 to 20 languages, bytes/percentages format, hiding, and weights from 0–2 with at least one positive value. Filters share bounded lists and closed roles. `resourceOptions` supports an owner, a 1–3 line description, an explicit username, and five repository contribution counters; for WakaTime, it supports time/percentage, hidden languages, a count from 1–20, a bar, and the `default/compact` layout. See the [exact schemas](../src/core/activity/extended-options.ts) and [feature matrix](github-stats-extended.md).

When absent, the original cards keep their previous output, and no defaults are added during recovery, migration, duplication, or project opening. Resetting appearance removes only that optional property. V1 preserves exactly `username/cards` with the three original IDs and rejects the new selections, `appearance`, and `extended`; its migration does not add these fields. The extension remains in v2 and uses the same storage key: an older strict reader may reject a new document and must preserve the incompatible value. See [ADR 0023](decisions/0023-customizable-activity-cards.md) and [ADR 0024](decisions/0024-extended-public-suite-and-mit.md).

### Optional presentation formatting in v2

`displayNameTypography?: "italic" | "monospace"` and `headlineTypography?: "italic" | "monospace"` are also supported. When absent, the default style is preserved; choosing the default removes only the corresponding option. Font families and CSS are not stored. The generator derives `em` or `code` around the field's literal text while preserving level, alignment, limits, and shared HTML ranges. The flag and connector for an integrated location are outside this style. V1 remains closed, and project JSON preserves the choices.

A separate location uses “📍 Currently based in” or “📍 Actualmente en” before its optional flag and text. It does not modify `location` or add internal line breaks.

`data.presentation.format?` is a strict object with optional properties: `displayNameLevel?: 1 | 2 | 3`, `displayNameAlignment?: "left" | "center" | "right"`, `headlineLevel?: 1 | 2 | 3`, `headlineAlignment?`, `bioAlignment?`, and `locationAlignment?`, using the same three alignments. It also supports `locationPlacement?: "displayName" | "headline"`. It does not change the four existing strings or include an automatic greeting option. The v1 schema preserves its exact original shape and rejects `format`; its migration to v2 does not add this property.

Without format overrides, the name and headline are exported centered as H1 and H2; their explicit alignments take precedence and can set them back to left. Defaults are not persisted or added during document recovery. Chosen levels produce Markdown headings when alignment is left and no greeting, typography, or integrated location requires HTML. Other combinations build permitted HTML with escaped text, without interpreting the content as HTML or Markdown. Aligned locations preserve the catalog's country icon with empty alt text and fixed dimensions. The preview uses its local copy.

The placeholder greeting is only a suggestion to write the complete headline; it is not added to the name or used to modify the headline. `locationPlacement` can integrate the chosen location next to the name or headline with `from`/`desde`; if the chosen field is empty, it generates a separate line. An integrated location uses the chosen field's alignment and is not duplicated. A country is preserved only after an explicit choice and may remain free-form text; it is never inferred, and no sample text is added. The form displays the country after About you. Derived HTML follows the same rules and budget; if the combined fragment exceeds the limit, the error points to the chosen field and `location`. See [ADR 0034](decisions/0034-friendly-presentation.md).

Derived presentation HTML shares the policy, limits, and budget of custom sections and explicit HTML. Its metadata uses the same `customHtml`, with exact UTF-16 ranges in the final Markdown and `headingLevel: 3`; the metadata is not persisted. `invalid_html` errors point to the original field in `["data", "presentation", "displayName" | "headline" | "bio" | "location"]`. Hiding presentation omits its output and export validation while preserving its content and formatting. Resetting formatting removes only the optional object. See [ADR 0020](decisions/0020-presentation-formatting.md).

Internal validation preserves the nullable v1 choices: `education.kind` = `degree`, `course`, `certification`, `other`, or `null`; `education.status` = `in-progress`, `completed`, `paused`, or `null`; `current.kind` = `work`, `learning`, `interests`, `collaboration`, or `null`. Retired date fields remain strings and are not reinterpreted. They have no form or generated output. These structures are preserved when migrating to v2.

## Custom sections

Each instance contains `id`, `title`, `visible`, and `blocks`. The title is optional text and does not determine the instance's identity; duplicate titles are valid. It also supports `showTitle?: boolean`, `titleLevel?: 1 | 2 | 3` and `titleAlignment?: "left" | "center" | "right"`. When these properties are absent, the previous output is preserved and they are not added during recovery. `showTitle: false` keeps `title` as the editor name while omitting the README heading, its validation and HTML budget; implicit subheadings behave as if no title were present. Name, formatting and visibility choice survive inclusion changes, duplication and JSON project files. Whole-section inclusion still uses `visible`, outside the fixed-module flags object. See [ADR 0042](decisions/0042-custom-section-title-visibility.md).

| Block     | Shape                                                                           |
| --------- | ------------------------------------------------------------------------------- |
| Paragraph | `{ id, type: "paragraph", text, alignment? }`.                                  |
| List      | `{ id, type: "list", style: "unordered" \| "ordered", items: [{ id, text }] }`. |
| Link      | `{ id, type: "link", label, url }`.                                             |
| Heading   | `{ id, type: "heading", text, level?, alignment? }`.                            |
| Divider   | `{ id, type: "divider" }`.                                                      |
| Quote     | `{ id, type: "quote", text }`.                                                  |
| Image     | `{ id, type: "image", url, alt }`.                                              |
| HTML      | `{ id, type: "html", source }`.                                                 |
| Code      | `{ id, type: "code", source, language }`.                                       |

Validation is strict and requires non-empty, unique IDs in each collection: sections within a document, blocks within a section, and items within a list. An unknown `sectionId` or an instance without a reference produces `invalid_reference`; duplicate references produce `invalid_order`. The discriminant on a reference distinguishes an instance from a module even when their strings match.

`heading`, `divider`, `quote`, `image`, `html`, `code`, and formatting options are additive extensions in v2. They do not change legacy structures or storage keys; the parser adds no defaults. `alignment` accepts `left`, `center`, or `right`, and `level` accepts 1, 2, or 3; these properties are not available on lists, links, quotes, images, code, or explicit HTML. An image URL and alt text, as well as HTML and code sources, are strings that may be incomplete or non-exportable in a structurally valid draft. Export applies separate checks. The selector offers ten options because `list` has two styles. Selector samples are not part of the document.

`html.source` preserves exactly the code that was written; it does not store the tree, notices, problems, or filtered HTML. Analysis limits do not truncate the string during reading or saving. Duplicating preserves the source and assigns a new block ID, as with the other variants. The section title and other blocks' text fields retain escaped output. See [ADR 0015](decisions/0015-explicit-profile-html.md).

`code.source` also preserves exactly what was written, but it is never interpreted as HTML or Markdown. `language: ""` represents plain text; the local catalog normalizes aliases and accepts an unknown safe token up to 64 UTF-16 code units. An invalid language or an oversized source blocks export with `invalid_code` at `language` or `source`. Each block allows 30,000 units, and visible code allows 150,000 units in total; hidden blocks do not consume the budget. An exactly empty source is omitted, but intentional whitespace is not. The exported delimiter uses more backticks than any run in the source, which is preserved between delimiter line breaks.

Without explicit formatting, a visible title uses `##`, and a subtitle uses `###` when the section has a visible title or `##` when it does not. A chosen level produces `#`, `##`, or `###`. Left alignment preserves escaped Markdown. Center and right alignment build HTML with escaped literal text, validate it under the current policy, and produce `customHtml` metadata with exact ranges, without storing tags in text fields. Derived formatting shares the HTML budgets and reports `invalid_html` at `title` or `text`. Code and lists keep their own layouts. See [ADR 0019](decisions/0019-code-and-formatting.md).

Adding inserts an empty, visible instance after an explicitly specified reference or at the end. Duplicating copies the entire tree, preserves text, order, and visibility, generates new IDs for the section, blocks, and items, and places the reference next to the original. No nested objects are shared with the copy. Hiding changes only `visible`; removing deletes that instance and its reference while preserving the relative order of the others.

Operations receive `createId` from the UI. They reject empty or previously used IDs and limit the number of attempts; failure returns `id_generation_failed` without partial changes. The core does not access the clock, randomness, browser, or storage.

## Compatibility and migration

`profileDocumentV1Schema` describes the old format strictly. `migrateProfileV1` preserves content, language, IDs, and visibility; converts each `moduleOrder` entry into a fixed reference; adds `customSections: []`; and returns v2. It does not translate, deduplicate, merge, or invent content. A v1 document with extra v2 properties is not accepted as a legacy format.

`parseProfileDocument` validates v2 or validates v1 and returns its migration. The local adapter uses `github-profile-generator.profile.v2` and reads `github-profile-generator.profile.v1` only when v2 is missing. Recovery or migration does not write: the first edit saves v2 and leaves the v1 key intact as the local original. If v2 is corrupted, incompatible, or unreadable, it is not automatically replaced with v1. See [ADR 0013](decisions/0013-custom-sections.md).

An older reader with a strict block union may reject new visual, HTML, code, or formatting variants even when `schemaVersion` remains `2`; this extension does not imply backward compatibility for readers. Recovery preserves a rejected value without rewriting it or replacing it with v1. Earlier documents without these options retain their shape and output. See [ADR 0014](decisions/0014-custom-visual-blocks.md), [ADR 0015](decisions/0015-explicit-profile-html.md), and [ADR 0019](decisions/0019-code-and-formatting.md).

## API and results

| API                                                                                                                   | Contract                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createEmptyProfile(contentLocale: ContentLocale): ProfileDocument`                                                   | Creates independent data and arrays on every call, with the initial order and all sections hidden. Receives an explicit typed language; does not access the browser. |
| `parseProfileDocument(input: unknown): ProfileResult<ProfileDocument>`                                                | Validates v2 or validates v1 and migrates it to v2. Does not convert content types or discard unknown properties.                                                    |
| `setModuleVisibility(document: ProfileDocument, moduleId: unknown, visible: unknown): ProfileResult<ProfileDocument>` | Validates the identifier and boolean. Preserves content and order.                                                                                                   |
| `reorderSections(document: ProfileDocument, sectionOrder: unknown): ProfileResult<ProfileDocument>`                   | Validates the complete mixed order and its references; preserves content and visibility.                                                                             |
| `reorderModules(document: ProfileDocument, moduleOrder: unknown): ProfileResult<ProfileDocument>`                     | Compatibility operation: reorders only the nine fixed references while preserving custom-section positions.                                                          |
| `addCustomSection(document, createId, after?)`                                                                        | Adds an instance and its reference.                                                                                                                                  |
| `updateCustomSection(document, sectionId, value)`                                                                     | Validates and replaces an instance without allowing its identity to change.                                                                                          |
| `setCustomSectionVisibility(document, sectionId, visible)`                                                            | Changes only its inclusion.                                                                                                                                          |
| `duplicateCustomSection(document, sectionId, createId)`                                                               | Creates a full copy with new IDs and places its reference next to the original.                                                                                      |
| `removeCustomSection(document, sectionId)`                                                                            | Removes only the instance and its reference.                                                                                                                         |

Instance operations also return `ProfileResult<ProfileDocument>`. `createEmptyProfileV1` remains as a compatibility factory; new drafts use `createEmptyProfile` and v2.

```ts
type ProfileResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly errors: readonly ProfileIssue[] };

type ProfileIssue = {
  readonly code: ProfileIssueCode;
  readonly path: readonly (string | number)[];
};
```

Errors expose stable codes and paths, without Zod messages or the rejected value. The UI resolves their text. Do not depend on the order or exact number of errors.

| Codes                                          | Meaning                                                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `invalid_type`, `invalid_value`                | Incorrect type, missing required field, or unsupported value.                                              |
| `unknown_property`                             | Undeclared property; the path ends at that key.                                                            |
| `unsupported_version`                          | Own `schemaVersion` property has a value other than `1` or `2`; if it is missing, the error is structural. |
| `unknown_module`, `invalid_order`              | Unknown identifier in order or visibility, or incomplete/duplicate order composition.                      |
| `invalid_id`, `duplicate_id`, `duplicate_card` | Empty ID, ID duplicated within its collection, or card selected more than once.                            |
| `unknown_section`, `invalid_reference`         | Missing instance or custom references that do not correspond to the document.                              |
| `id_generation_failed`                         | Could not generate valid new identities; no partial operation was applied.                                 |

Example paths: `["data", "projects", "items", 0, "id"]`, `["sectionOrder", 2]`, `["customSections", 0, "blocks", 1, "id"]`, `["schemaVersion"]`. Visibility arguments use `["moduleId"]` or `["sectionId"]`, and `["visible"]`.

Operations require a valid document produced by the factory or parser and validate their arguments; `reorderSections` checks the candidate document with its mixed order. A TypeScript assertion on external data does not meet this requirement. Operations do not mutate the original; they may share unchanged branches, so treat results as immutable. The factory produces independent structures, and duplicating an instance copies its nested objects.

## Import from Markdown

The importer does not change the v2 `ProfileDocument` schema. App-generated Markdown includes an out-of-model versioned comment manifest with emitted fixed/custom section references, order, ranges, and a source fingerprint. An explicit export option can add the complete validated v2 document for single-file exact recovery; this exposes hidden and retired data in the raw public source. The importer validates the manifest and snapshot before review. Project JSON remains a separate option.

`analyzeReadmeImport(source, contentLocale)` analyzes the complete Markdown source and returns candidate sections, UTF-16 ranges, module suggestions, recovery state, and diagnostics. App-authored metadata identifies the original destination of unchanged sections; a module adapter restores fixed fields only when it can reconstruct them safely, otherwise it keeps the visible content as a custom section with a hint. Without a full snapshot, not every rendered module is reversible. For other or edited READMEs, deterministic title aliases and content-shape adapters make explicit proposals. Fixed headings are not duplicated as custom titles. No data from the existing profile is silently merged. Snapshot restoration and importing edited visible content are separate explicit outcomes.

Blocks reuse `paragraph`, `list`, `link`, `heading`, `divider`, `quote`, `image`, `html`, and `code`; there is no raw Markdown block. Independent fenced or indented code preserves its AST source and normalized language; metadata that cannot be represented produces a notice. Within an open HTML context or a nested structure that requires preserving contiguous HTML, that structure takes precedence and loss of language metadata is reported. Converted HTML follows the existing policy. Visible Markdown analysis allows 100,000 UTF-16 code units, 6,000 nodes, and a depth of 32; a manifest-bearing file allows 200,000 units. HTML and code retain their own limits. References, anchors, relative paths, and incompatible constructs are checked before applying the proposal. The backup preserves the exact original even if the parser normalizes line breaks in a code block.

The adapter's backup record is outside `ProfileDocument`: `{ schemaVersion: 1, previousDocument, originalSource }`. Strict reading does not write or migrate incompatible records. It preserves one complete previous profile and the original source independently of the selection. README manifest data is derived export metadata and does not change persisted keys or structures. See [ADR 0018](decisions/0018-readme-import-with-backup.md) and [ADR 0044](decisions/0044-readme-roundtrip-and-guided-import.md).

## Validation boundaries

The parser receives a JavaScript value: it does not interpret JSON strings or catch `JSON.parse` errors. That boundary must handle read or syntax failures. The only implemented migration is validated v1 to v2; incompatible structures are not repaired.

An empty draft with all sections hidden is valid. Document validation does not check URL protocols, date formats or relationships, or HTML safety. A successful result does not authorize rendering or export without output-specific checks.

[`generateReadme(document, { activityCardBaseUrl? }): ReadmeResult`](../src/core/readme/generate-readme.ts) requires an already valid document and does not access the network or storage. It returns `{ success: true, markdown, exportIssues?, customImages?, customHtml? }` or `{ success: false, errors }`. Active generation errors are `empty_profile`, `invalid_url`, `missing_image_alt`, `invalid_html`, `invalid_code`, `invalid_username`, and `invalid_activity_options`; `unsupported_module` remains in the type for compatibility, but metrics no longer produces it. Preview, copy, and download share the same Markdown. A `success: true` result with `exportIssues` allows review but does not authorize copying or downloading.

`customImages` is present only when a successful result contains valid `image` blocks. It is `readonly CustomImageSource[]` with elements `{ readonly src: string; readonly alt: string }`: the canonical URL and normalized plain-text alt text must match the generated Markdown node exactly. Output order and duplicates are preserved. It does not include images inside HTML, catalog icons, cards, or images from hidden sections; it is not persisted or returned with errors. The preview uses these pairs to allow only the explicit Markdown images from that same result.

`customHtml` is present only when a successful result contains exportable HTML. It is `readonly CustomHtmlFragment[]` with elements `{ readonly html: string; readonly tree: Root; readonly start: number; readonly end: number; readonly headingLevel: 3 | 4 }`. `html` is a complete canonical unit inside a `div`; `markdown.slice(start, end)` must match it exactly. `tree` is the equivalent permitted HAST tree in structure and content, reused by the preview without parsing HTML again. Serialization encodes LF/CR as `&#10;`/`&#13;` entities so blank lines cannot reactivate Markdown; the tree preserves actual line breaks, so `toHtml(tree)` does not need to match `html` byte for byte. Indices are UTF-16 offsets in the final Markdown, using the `[start, end)` range, and preserve order and duplicates. `headingLevel` is `4` for custom body content when the section has a title or `3` when it does not; an aligned title and presentation units use `3`. This adapts preview semantics; it does not change h1–h6 in exported HTML. No tree or metadata is persisted, and hidden sections or results with errors do not contain fragments.

Visible, selected cards require a normalizable GitHub username. A leading `@` and surrounding whitespace are accepted during normalization; the draft text is stored, and the generator uses the canonical login in URLs. An invalid username produces `invalid_username` at `["data", "metrics", "username"]`. Visible metrics without cards do not require a username or produce content.

`activityCardBaseUrl` receives an explicit public HTTPS origin, without a port, credentials, path, query, fragment, or local address. Without a valid origin, local routes are generated so cards can be reviewed, along with `exportIssues: [{ code: "activity_not_configured", path: ["data", "metrics"] }]`. Consumers must block export without replacing Markdown with another representation or publishing localhost URLs. Unchecking cards removes this requirement for manual contributions.

`knowledge`, `education`, and `current` are always omitted, even when their visibility is true. Their content and links do not produce output, `invalid_url`, or `unsupported_module`. Reading and writing preserve these data, and structural validation continues to check their shape. A document whose content exists only in retired modules returns `empty_profile`; this does not enable legacy output.

## Output rules

- Respect `sectionOrder` and each collection's order; do not sort by name or activity. The UI reorders included references, fixed or custom, while preserving the positions of hidden, retired, and metrics references.
- Activity and contributions have effective inclusion `visibility.contributions || visibility.metrics`. The generator combines both sources in the `contributions` slot and omits the `metrics` slot. Manual contributions participate only when their flag is set; cards participate when the metrics flag is set and the selection is non-empty. The global checkbox turns off both flags when hiding the section; when showing it, it enables contributions and enables metrics if cards remain selected. This UI coordination does not change the schemas or the pure visibility operations for a single ID.
- Omit completely empty entries and headings without content. Projects and contributions allow manual content without links.
- Custom instances are emitted only when `visible` is true. A title without useful blocks does not produce a heading; useful body content without a title is emitted without inventing a name. Paragraphs retain their spacing; lists omit empty items, number exportable items, and indent continuations based on their marker. Structured lists belong only to custom instances, not to fixed-module text.
- Without explicit formatting, a non-empty custom subtitle generates `###` when the section has a title or `##` when it does not; a chosen level uses 1, 2, or 3. Text is normalized to one line and escaped; center/right alignment produces one permitted derived HTML unit. A divider generates `---` and counts as explicit content. Quotes escape their text and prefix every line, including paragraph separators, with `>`. Empty text blocks are omitted.
- A completely empty image is omitted. If it has a description but no permitted URL, it returns `invalid_url` at `["customSections", index, "blocks", index, "url"]`; a URL without normalized alt text returns `missing_image_alt` at the path ending in `alt`. Both errors may be returned when both fields need correction. No partial README is returned. A hidden instance adds no errors or `customImages`.
- An empty HTML block is omitted. A non-empty source with URL, missing-alt, structure, useful-content, or limit problems produces `invalid_html` at `["customSections", index, "blocks", index, "source"]`, without a partial result. Filtering or repair notices are not errors by themselves. The original source remains in the document, and hidden sections are not analyzed or added as fragments.
- A technology group contributes its heading only if it has an exportable technology. Technologies may have a name, context, or both. A recognized name or alias generates a decorative icon and visible name from the permitted catalog; custom entries and contexts produce escaped text. Generation does not score expertise or organize entries automatically.
- Omit the three retired IDs before inspecting their content, without changing their data or visibility.
- Escape plain text for Markdown and HTML. Translate only labels generated from `contentLocale`, not profile text.
- Use absolute HTTP/HTTPS URLs for content links, without credentials, spaces, control characters, or backslashes. `mailto:` with a single ASCII mailbox and no parameters is allowed only in contact.
- An empty optional URL is valid. Contact and project link rows are omitted when both fields are empty; a label without a valid URL produces an error. A valid URL without a label displays the name of a recognized contact service or the address in other cases.
- An invalid provided URL in an active, visible section blocks all output. Examples include `["data", "contributions", "items", 0, "url"]`, `["data", "contributions", "items", 0, "links", 1, "url"]`, `["data", "contributions", "items", 0, "images", 0, "url"]`, `["data", "contributions", "items", 0, "repository", "url"]`, `["data", "projects", "items", 0, "links", 1, "url"]`, and `["customSections", 1, "blocks", 2, "url"]`. Custom-section indices refer to storage order even when visual order differs. Their links use the same web policy and do not allow `mailto:`. Hidden or retired data does not participate. Do not silently generate a partial file.
- An active contribution image with a URL but no normalized alt text produces `missing_image_alt` at its path ending in `alt`. Completely empty images are omitted. A repository URL must identify a public GitHub `owner/repository` route; its description is escaped text and no repository data is fetched.

Exported technology icons are decorative 20 × 20 `img` tags with `alt=""` and a `src` built exclusively from the [technology](../src/core/technologies/index.ts) metadata, followed by the escaped visible name. Its 358 entries reference Devicon, Simple Icons, and Lobe Icons pinned to commits. The preview remains compatible with earlier 32 × 32 tokens. There are no custom icon URLs or skill levels; some products share a documented family mark. See [ADR 0012](decisions/0012-technology-categories.md).

Contact adds decorative 20 × 20 icons with `alt=""` from its 13 [contact](../src/core/contact/index.ts) providers. Branding depends on an accepted URL and an explicit hostname; it is not assigned to similar domains, arbitrary subdomains, or non-standard ports. The escaped label preserves the link's accessible name. A personal URL or email without a provider is exported as linked text, without an external image chosen by the user.

If a location matches a selection from the [country catalog](../src/core/location/index.ts), a decorative 20 × 15 flag with `alt=""` is added next to the escaped name. Its URL is pinned in the catalog, with no attributes taken from personal fields. All other values retain their text output.

Ordinary personal fields are never interpolated into HTML attributes. The preview recognizes exact tokens from the generated markup and checks the permitted URL and empty alt text for decorative technology/contact icons; it also checks the alt text in earlier technology tokens. It uses only the corresponding local SVGs. Technology rows adapt to the available width; this UI styling is not embedded in the README. Explicit `customHtml` fragments have their own range and tree validation. All other HTML continues to be discarded with `skipHtml`, without `rehypeRaw` or `dangerouslySetInnerHTML`. See [third-party notices](../THIRD_PARTY_NOTICES.md) for licenses and provenance.

`image` blocks generate Markdown images with escaped alt text and a destination delimited by `<` and `>`. [`normalizePublicImageUrl`](../src/core/readme/public-image.ts) accepts HTTPS with a syntactically public hostname or domain name, but rejects IP addresses, local hosts or known private suffixes, credentials, fragments, and non-standard ports. Query strings, the default HTTPS port, and extensionless paths are allowed. HTTP, relative URLs, `file:`, `blob:`, and `data:` are not accepted. The same policy applies to `img` inside explicit HTML. This is a syntactic check: it does not resolve DNS or verify content, availability, or link duration. The resource must be hosted separately; exporting the README does not publish or copy it.

The preview requires an exact `src` and `alt` match with `customImages` and checks the HTTPS policy again. It loads the image directly in the browser with an `img` using `loading="lazy"`, `decoding="async"`, and `referrerPolicy="no-referrer"`, with no proxy or server optimizer. A loading failure produces a temporary visual fallback with a description and link; it does not modify the draft or change export validity. Image syntax written in a paragraph, quote, title, or link still produces escaped text.

Cards are Markdown images from `/cards/github/{username}/{card}.svg?locale={locale}` or `/cards/extended/{repository|gist|wakatime}.svg` under the configured origin. Queries contain the language, validated appearance, serialized Extended options, and public destination where applicable. Construction uses the same exact ordering and validation: duplicate or unknown parameters, and values outside their limits, are rejected. The preview recognizes those same routes and resolves them locally, without accepting arbitrary hosts. A resource selection without a destination or an unrepresentable configured URL returns `invalid_activity_options` with a field path; an independent resource does not require a GitHub username. SVGs receive explicit snapshots and options, escape XML, and do not execute scripts or load external resources.

`panorama` combines the calendar, summary, and languages with scope notes; `monthly` sums UTC days without extrapolating partial months. Extended adaptations preserve MIT attribution and use application-owned snapshots fetched through this app's public clients. Optional ranking uses six complete counters; it is omitted when data is partial or missing and is not interpreted as skill or an observed population percentile. Language percentages reflect the chosen weighting formula over the sample; the default uses bytes, with the remainder grouped under Other.

`ExtendedProfileSnapshot` separates 18 metrics `{ value: number | null, scope: "period" | "lifetime" | "snapshot", partial: boolean }` and language data with bytes, repository count, and truncation status. `ResourceSnapshot` is a discriminated union of public repository, Gist, or WakaTime metadata; WakaTime preserves `range: "last_7_days"` and optional dates without inventing them. These are validated, ephemeral remote contracts without authentication metadata. Public history excludes anonymous private counts; basic activity retains its previous policy of explaining them when shared publicly.

`ActivitySnapshot` contains the user, query date, period, calendar, summary, languages, and public suggestions. It is a validated remote-data contract separate from `ProfileDocument`; it is not stored in the draft. `ActivityResult` distinguishes success with `stale` from user, configuration, not-found, quota, or availability errors. Suggestions become persisted data only when the user selects them; they are saved in the legacy manual-contribution structure with a new ID. There is no second source of truth for the profile.

## Explicit HTML analysis

`analyzeProfileHtml(source: string): ProfileHtmlAnalysis` receives the exact source and returns `html`, `tree`, `notices`, and `errors`. It is a pure AST function with no browser, React, network, or storage access. It uses `hast-util-from-html` 2.0.3, `hast-util-sanitize` 5.0.2 with an explicit schema, and `hast-util-to-html` 9.0.5. The analyzed result is derived; it does not modify the input string or get stored in the profile.

It accepts h1–h6 headings, paragraphs and containers, inline formatting, lists, quotes, code, dividers, links, images, tables, and `details`/`summary`. It preserves left/center/right alignment on permitted elements; images accept dimensions from 1 to 2,000 pixels and width from 1 to 100%. Full pages, CSS, JavaScript, event handlers, `id`, `name`, classes, `srcset`, `picture`, inline SVG, and MathML are not allowed. Elements and attributes outside the policy are filtered with notices; active elements such as scripts are removed with their contents.

HTML links use the absolute HTTP/HTTPS policy and require an accessible name or `aria-label`; `mailto:` remains limited to contact. Images require an accepted public HTTPS URL and an `alt` attribute, though `alt=""` can indicate an explicit decorative choice. Relative paths and `#anchors` are errors; they are not resolved against the application. A `details` element requires exactly one named `summary` as its first child; lists and cells must belong to the permitted structure. Validation checks these specific rules but does not certify full accessibility.

Limits are 30,000 UTF-16 code units per block, 1,500 nodes, and a depth of 32. The generator also checks a 150,000-unit HTML source budget across visible sections before analyzing them all. Exceeding a limit produces `invalid_html` at `source` without truncating the draft. Derived visual formatting shares these limits and budget; its paths end in `title` or `text`, and each unit is counted before analysis. Analysis problems distinguish size, complexity, URL, alt text, structure, and non-empty source with no useful content remaining. The interface explains these problems and notices about tags, attributes, comments, and repairs; the generation contract retains the stable `invalid_html` code.

Markdown preserves h1–h6 from permitted HTML and does not interpret Markdown written inside `source`. The preview checks each `customHtml` unit against the complete Markdown and creates React elements from a closed allowlist using its permitted tree. It does not enable a global HTML parser or parse all sources again to display the result. GitHub may apply different filters and styles; visual parity is not guaranteed. See [ADR 0015](decisions/0015-explicit-profile-html.md).

Module retirement is defined in [ADR 0008](decisions/0008-focused-profile.md). Sources and icons are covered in [ADR 0009](decisions/0009-profile-icons.md), and the contributions/metrics combination in [ADR 0010](decisions/0010-github-activity.md). The current contract, instances, and migration are described in [ADR 0013](decisions/0013-custom-sections.md), extended with visual variants and images in [ADR 0014](decisions/0014-custom-visual-blocks.md), explicit HTML in [ADR 0015](decisions/0015-explicit-profile-html.md), and code/formatting in [ADR 0019](decisions/0019-code-and-formatting.md). Earlier ADRs preserve historical context.

See [ADR 0003](decisions/0003-profile-document.md). Functional references: [Zod: Basics](https://zod.dev/basics) for `safeParse` and `z.infer`; [Zod: API](https://zod.dev/api) for strict objects and nullable schemas.

## Project files

The project file contains `ProfileDocument` v2 directly, without wrapping it in a new format or adding derived fields. `parseProjectFile` accepts strict v1 and v2 through `parseProfileDocument`, and applies file-size and complexity limits before accepting the result, including migration. `serializeProjectFile` checks structure and reopenability; it does not use the README generator or require exportable content. It preserves hidden and legacy content, sources, and absent options.

The project-open backup is an adapter record outside the document: `{ schemaVersion: 1, previousDocument }` under `github-profile-generator.project-backup.v1`. It requires a previous v2 profile that can be downloaded and leaves the independent Markdown backup and legacy draft key intact. See [ADR 0021](decisions/0021-project-files-and-recovery.md).
