# ADR 0015: Explicit, sanitized HTML for profiles

- Status: accepted.
- Date: 2026-10-19.
- Extends [ADR 0013](0013-custom-sections.md) and [ADR 0014](0014-custom-visual-blocks.md). It replaces the general prohibition on HTML only for a custom `html` block; escaped text remains in all other fields, with closed exceptions for icons and cards, document v2, and conservative recovery.

## Context

A profile README can combine Markdown with centered headings, linked images, tables, and collapsible sections. Structured blocks cover common compositions; an explicit HTML input makes these layouts possible without asking for more career-history details or changing the fixed forms.

GitHub converts markup and then applies sanitization and other filters. Its `markup` repository does not implement the entire pipeline. The GFM specification is not a list of safe HTML. The public HTML Pipeline code provides a reference for tags and attributes, but does not let us promise a replica of GitHub's production configuration. See [GitHub Markup](https://github.com/github/markup), the [GFM specification](https://github.github.com/gfm/), and [HTML Pipeline sanitization](https://github.com/gjtorikian/html-pipeline/blob/main/lib/html_pipeline/sanitization_filter.rb).

Local data must preserve the code that was written, even when it cannot be exported. Sanitized HTML and the preview are derived from that content. No external service, execution of a person's code, or server-side resource download is needed to produce them.

## Decision

### Contract and data preservation

Add the following to the strict union of `customSections` blocks:

```ts
type CustomHtmlBlock = {
  id: string;
  type: "html";
  source: string;
};
```

`source` preserves the original source exactly; analysis does not trim, normalize, or replace it. Trees, notices, errors, sanitized HTML, and preview metadata are not stored. Keep `schemaVersion: 2`, storage keys, the v1 migration, and the shape of every earlier block, without adding default fields.

Existing operations preserve order and opaque identities. Duplicating copies the source with a new ID and without sharing mutable objects; hiding preserves the entire block, and excluding it means its output is not reviewed. Deleting removes only the selected content. A strict older reader may reject this v2 variant: it must preserve the incompatible value, without overwriting it or automatically falling back to v1.

### Pure analysis and HTML policy

`analyzeProfileHtml` parses a HAST fragment with `hast-util-from-html` 2.0.3, applies custom rules and an explicit `hast-util-sanitize` 5.0.2 schema, then serializes it with `hast-util-to-html` 9.0.5. These libraries operate on trees in Node.js and the browser, without requiring a DOM for the core contract. The parser and serializer do not replace sanitization. See [parsing](https://github.com/syntax-tree/hast-util-from-html), [sanitization](https://github.com/syntax-tree/hast-util-sanitize), and [serialization](https://github.com/syntax-tree/hast-util-to-html).

The policy allows a profile-oriented subset:

- `h1`–`h6`, `p`, `div`, `span`, `br`, and `hr`.
- `strong`, `b`, `em`, `i`, `del`, `s`, `kbd`, `sub`, `sup`, `blockquote`, `pre`, and `code`.
- `a`, `img`, `ul`, `ol`, and `li`.
- `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, and `caption`.
- `details` and `summary`.

Attributes are allowed per element. Where applicable, `align` accepts left, center, or right. Images allow dimensions from 1 to 2,000 pixels, and `width` from 1 to 100%. Cell spans, list starts, titles, and the `open` state have bounded rules. A link needs an accessible name; `aria-label` is allowed to identify it. A collapsible section requires exactly one named `summary` as its first child. Specific structural relationships in lists and tables are checked, without certifying complete accessibility.

Disallowed attributes, events, CSS, classes, `id`, `name`, comments, and declarations are removed. Active or unrelated elements such as `script`, `style`, forms, `iframe`, embeds, SVG, and inline MathML are removed with their contents. Full HTML pages, `picture`, `srcset`, JavaScript, React, and MDX are not accepted. Sanitization or repair changes produce notices and are not applied to the saved source.

### Links and images

HTML links use absolute HTTP/HTTPS URLs under the shared web policy. `mailto:` remains reserved for the contact form. Images use `normalizePublicImageUrl`: HTTPS with a syntactically public domain, without IP addresses, local or known-private hosts, credentials, fragments, or nonstandard ports. This check does not query DNS, verify the actual format, or guarantee availability. Queries and URLs without an extension are allowed. Resources are hosted separately.

Every `img` requires an `alt` attribute. An explicit `alt=""` means the image is decorative; a missing attribute produces an error. This exception does not change the requirement for non-empty alternative text on the structured `image` block. An external SVG in `img` is treated as an image and does not enable inline SVG.

The custom check runs on URLs already decoded from the AST. The sanitizer's protocol configuration allows relative URLs and is insufficient for the application's policy. Relative paths, local addresses, and `#anchors` require explicit changes; they are not resolved against the editor's origin. GitHub can resolve paths using repository, file, and branch context, which this block does not receive. See [GitHub links and images](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax).

### Export limits and errors

Analysis limits each source to 30,000 UTF-16 code units, 1,500 nodes, and depth 32. The generator also checks a combined maximum of 150,000 UTF-16 code units of HTML source across visible sections before analyzing them. Hidden data does not count against this budget. These limits protect analysis; a recovered draft is never truncated.

An empty source is omitted. A non-empty source with size, complexity, URL, alternative-text, or structural problems—or with no useful content after sanitization—produces `invalid_html` at `customSections/{index}/blocks/{index}/source`. This error blocks all generation; no partial file is produced. Sanitization or repair notices do not by themselves prevent export. The UI explains issues and notices using the same analyzer.

### One Markdown output and derived metadata

The generator emits each block as a closed canonical HTML unit inside a `div` in the same Markdown used for preview, copying, and download. It preserves its `h1`–`h6` levels and does not interpret Markdown inside `source`. LF/CR line breaks serialize as `&#10;`/`&#13;` entities: they preserve content and prevent blank lines from terminating the HTML block and reactivating Markdown. The original source is unchanged, and the tree retains the actual characters, including inside code. There is no alternate representation of the README.

Serialization compensates on a copy of the tree for the HTML rule that drops the first line break in `pre`. If the sanitized tree begins that element with LF, a compensating LF is added before serialization. Parsing the result again therefore preserves preview content without changing the source or derived tree. This compensation is not applied when the first child of `pre` is an element such as `code`.

A successful result may include `customHtml: readonly CustomHtmlFragment[]` with entries `{ html, tree, start, end, headingLevel: 3 | 4 }`. `tree` is the allowed HAST tree equivalent in structure and content to the HTML; `toHtml(tree)` may differ byte-for-byte because of line-break entities. The preview reuses the tree without parsing the serialized string again, whose size may exceed the source limit. The `[start, end)` ranges are UTF-16 offsets in the final Markdown and must match `html` exactly. They preserve order and repetitions and are included only when exportable fragments exist. The preview heading level is `4` when the section has a title and `3` otherwise. These values are not persisted or returned in error results.

`remarkCustomHtml` verifies the content and limits of each range so it recognizes only complete units. The renderer creates React elements from the allowed tree without `dangerouslySetInnerHTML`, `rehypeRaw`, or global HTML interpretation. `skipHtml` continues to discard HTML outside those units, and existing icon exceptions keep their exact rules.

The preview adapts heading semantics to its context, allows horizontal scrolling for tables, and preserves native collapsible-section controls. This adaptation does not rewrite exported HTML. Images in this block are authorized within `customHtml`; they do not extend `customImages`, which is reserved for `image` blocks.

Images load directly in the browser with `loading="lazy"`, `decoding="async"`, and `referrerPolicy="no-referrer"`, without a proxy or server optimizer. A load failure is ephemeral presentation state and does not modify the source or invalidate an accepted URL. The browser does contact the resource host when displaying it.

### Editing and scope

The content selector offers nine options with local decorative samples. The HTML block starts empty, focuses its code field, and does not receive automatic list conversions. The guide, counter, issues, notices, and inspectable exported HTML have English and Spanish text.

Three examples—a centered heading, a table, and a collapsible section—are inserted only after an explicit action. Replacing non-empty code requires confirmation. Help does not publish resources, execute HTML, or turn the entire editor into a free-form document. GitHub documents `details` and `summary`, but mixing HTML with Markdown requires different parsing rules: this block interprets HTML only. See [GitHub collapsed sections](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections).

This delivery does not add a README importer, AI assistance, accounts, file uploads, or new services. The preview is approximate and does not promise parity with GitHub's filters, theme, or styles.

## Alternatives considered

| Alternative                                                  | Advantage                                       | Reason for the decision                                                                                                                   |
| ------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Interpret HTML in every field                                | Allows tags anywhere.                           | Changes the text contract of existing forms and hides where formatting is allowed. The explicit block limits this input.                  |
| Store only sanitized HTML                                    | Reduces stored data.                            | Loses the original source and makes it harder to correct sanitization or errors; preserve source and derive output instead.               |
| Use the sanitizer's protocol list without further validation | Simplifies configuration.                       | Allows relative URLs and does not express the public-domain policy for images. Shared normalizers are applied.                            |
| Insert HTML as a string into the DOM                         | Requires less custom rendering.                 | Creates a boundary outside the verifiable element and metadata allowlist; the AST is traversed with React.                                |
| Enable global HTML in ReactMarkdown                          | Handles arbitrary HTML and Markdown mixtures.   | Expands the scope of every field and loses the distinction between explicit units and text. Ranges are verified within the same Markdown. |
| Move to v3                                                   | Distinguishes the new format by version number. | The agreed expansion adds a variant without changing earlier documents; rejection by strict older readers is documented.                  |

## Consequences

- Profiles can use specific HTML compositions while retaining a short workflow with structured blocks.
- Written source survives sanitization, errors, duplication, hiding, language changes, and recovery.
- Structural parsing does not prove a source is exportable; the generator remains responsible for that decision.
- The policy and its limits are shared by the form, export, and preview without core network requests.
- Exact ranges require preserving offsets while composing Markdown, including Unicode and repeated content.
- Final appearance depends on GitHub and external resources; the editor does not host content or reproduce GitHub's renderer.
- Strict older readers must preserve incompatible documents even if they recognize the version number.

See [editor](../editor.md), [profile model](../profile-model.md), and [architecture](../architecture.md).
