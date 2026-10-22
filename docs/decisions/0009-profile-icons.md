# ADR 0009: Expanded catalogs and contact icons based on URL

- Status: accepted.
- Date: 2026-10-19.
- Product: GitHub Profile Generator.
- Updates the sources and presentation of icons from [ADR 0007](0007-simple-profile.md), retained by [ADR 0008](0008-focused-profile.md). Replaces its Devicon-only restriction; retains the five sections, retirement of skills/education/current focus, and v1 compatibility.
- Later expansion and named technology presentation are covered by [ADR 0012](0012-technology-categories.md); the rest of this decision remains in effect.

## Context

The initial catalog covered 48 tools, and the preview could display icons in a column of block images. Review requested compact, responsive rows, more commonly used and AI tools, and recognizable contact methods through icons without preventing people from sharing their own portfolio.

The generator must remain deterministic and produce the same Markdown for preview, copy, and download. Expanding the catalog does not require new document properties, remote queries during search, or accepting images written by the person.

## Decision

### Technologies

Keep autocomplete by name and alias, chips with a remove action, and custom text as an alternative. Expand the local catalog to 259 entries covering languages, frameworks, data, messaging, infrastructure, development tools, and AI tools. A tool's presence does not represent a market ranking or skill level. Showing Claude, Codex, or LangGraph does not integrate those services with the application.

Recognized technologies without additional context generate 32 × 32 icons with alternative text from allowed metadata. The preview arranges them in flexible rows with spacing and wrapping based on available width. The README retains inline image tags with explicit dimensions; editor CSS is not exported.

Custom names or entries with context retain their escaped text output. Groups, names, contexts, and v1 IDs are preserved; adding a tool still stores its name and an empty context, without new catalog URLs or IDs.

### Pinned sources and trademarks

Local SVGs are copied unchanged from official sources, and exported URLs are pinned to the same commits:

| Use          | Source and commit                                                                                                                                                | License |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Technologies | [Devicon, `6a37858047b0e8d9c9c0e68f4a071fc410652e89`](https://github.com/devicons/devicon/commit/6a37858047b0e8d9c9c0e68f4a071fc410652e89)                       | MIT     |
| Technologies | [Simple Icons, `c71c69e3a27e4436936b831c72643e6513b9f49b`](https://github.com/simple-icons/simple-icons/commit/c71c69e3a27e4436936b831c72643e6513b9f49b)         | CC0 1.0 |
| Technologies | [Lobe Icons, `8a1b2821bb768c484fe8da20c5e1838b6bf551a9`](https://github.com/lobehub/lobe-icons/commit/8a1b2821bb768c484fe8da20c5e1838b6bf551a9)                  | MIT     |
| Contact      | [Simple Icons 11.15.0, `0af835e2949a9222965522780e5e0810d3c53382`](https://github.com/simple-icons/simple-icons/commit/0af835e2949a9222965522780e5e0810d3c53382) | CC0 1.0 |

Per-file provenance and full licenses are recorded in [third-party resources](../../THIRD_PARTY_NOTICES.md). Icons identify their owners' trademarks and do not imply endorsement. Some entries share a family brand: React Native uses React; JetBrains AI uses JetBrains; ChatGPT and OpenAI share OpenAI. This correspondence is not presented as an exclusive product logo. Codex uses its specific SVG.

### Contact

Provide a suggested selector with LinkedIn, LeetCode, HackerRank, YouTube, Facebook, Instagram, GitHub, X, Bluesky, DEV Community, Medium, Twitch, and Stack Overflow, as well as personal portfolio/web and email. Focus the URL field when adding an entry. The custom label is optional and remains in secondary details.

Derive the provider only from the normalized URL and explicit domains in `core/contact`. The label and ephemeral form selection cannot assign an icon to a different address. Do not use partial hostname matches, arbitrary subdomains, credentials, or non-standard ports to recognize a brand. Unknown URLs that satisfy the link policy remain valid and are not blocked for being absent from the catalog.

Export a recognized contact as a Markdown link containing a 20 × 20 icon and its escaped label. The icon is decorative, with `alt=""`, because visible text already names the link. An empty label uses the recognized service name; personal websites or email without a provider use the address and receive no exported image. The form may show a generic web or email icon.

The document retains `links` with `id`, `label`, and `url`, without new fields or migration. Opaque IDs are preserved, and URL errors include their original index.

### Closed recognition in the preview

`remarkProfileIcons` converts only exact tokens emitted by catalog generators into image nodes, both in technology rows and inside contact links. Before serving the corresponding local SVG, the component checks the name/URL for technologies or the allowed URL and empty alternative text for contact.

Retain `skipHtml`, the allowed-element list, and the absence of `rehypeRaw`. Do not accept free-form HTML, personal image attributes, or arbitrary image URLs. Profile text remains escaped plain text, and HTTP/HTTPS and `mailto:` policies remain in force.

## Alternatives considered

| Alternative                                 | Advantage                                        | Reason for the decision                                                          |
| ------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| Keep only Devicon                           | One source and one license.                      | Does not cover all requested AI and contact tools.                               |
| Query icons or providers during search      | Updateable catalog without changing local files. | Adds a network dependency and variable results to the basic flow.                |
| Allow custom images by URL                  | More visual freedom.                             | Expands input and rendering without being necessary for the requested icons.     |
| Store provider and icon URL in each contact | Direct resolution in the document.               | Duplicates derived data and requires changing v1 without a real need.            |
| Use the label to identify the provider      | Does not need to inspect the destination.        | Can show a brand for a different domain and confuse the person opening the link. |

## Consequences

- Expanding the catalog requires coordinated maintenance of metadata, SVG copies, pinned URLs, and licenses.
- Search and preview use local data; README icons depend on the availability of pinned URLs and how GitHub presents them.
- Exact recognition and image checks must cover altered tokens, unexpected attributes, impostor domains, custom labels, and unknown tools.
- Decorative contact icons avoid repeating the accessible name of the link; technologies retain readable alternative text.
- The five sections and nine internal IDs remain. Contributions are still manual; GitHub graphs, autogenerated cards, and AI assistance are not implemented by this decision.

See [editor](../editor.md), [architecture](../architecture.md), and [profile model](../profile-model.md).
