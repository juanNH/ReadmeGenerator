# ADR 0007: Brief profile and technologies with icons

- Status: accepted.
- Date: 2026-10-19.
- Product: GitHub Profile Generator.
- Extends [ADR 0005](0005-manual-profile-composition.md) and [ADR 0006](0006-editor-navigation.md). Replaces the previous choice of technologies without a catalog or icons; retains the v1 contract, its text policies, and composition controls.

## Context

The editor's eight manual modules separated presentation, skills, and current focus, and asked for usage context for technologies and several education details. Product review identified repetition and a structure too close to a résumé. The goal is a brief personal introduction, with the freedom to share a sentence, tools, or things being learned without completing a work history.

We reviewed the brief introduction prompts from [GitHub Profile README Generator](https://rahuldkjain.github.io/github-profile-readme-generator/), the visual tool selection in [GPRM](https://gprm.itsvg.in/), and the block composition with preview in [Profilinator](https://profilinator.rishav.dev/). Our design conclusion is to prioritize an open introduction, technology search, and a small number of visible fields. These references inform the interaction; their architecture and full catalogs are not copied.

Existing drafts already use `ProfileDocument` v1 with nine IDs, hidden data, technology groups, and education details. Simplifying forms must not automatically delete, move, or merge personal text, or require a migration.

## Decision

### Sections and introduction

A new profile offers six sections: presentation, technologies, education, projects, contributions, and contact. Skills and current focus appear when their visibility is true or they have an entry, including an incomplete entry. They retain their forms and output. The filter belongs to the editor; the core retains all nine modules, their order, and their data.

Presentation includes an optional name and free text to describe oneself, share interests, or say what one is learning. The headline and location remain in secondary details. People are not required to repeat information in other sections, and existing content is not changed to deduplicate it.

### Technologies

The form provides autocomplete by name or alias, keyboard selection, and chips with icons and a remove action. It prevents duplicates among recognized selections and accepts custom names outside the catalog, with text output. Adding a tool does not ask for usage context or create groups.

`src/core/technologies` contains pure, immutable metadata for 48 tools. Local SVGs and public URLs come from the same [Devicon commit](https://github.com/devicons/devicon/commit/6a37858047b0e8d9c9c0e68f4a071fc410652e89). The MIT license is included with the files and its attribution is in [third-party resources](../../THIRD_PARTY_NOTICES.md). Search does not depend on external queries, and no package dependency is added for the catalog.

The document retains its v1 groups, IDs, names, and contexts. A new selection stores its name and an empty context; if it needs to create a group, it does so without a name. Existing groups and contexts remain editable in secondary details and retain their output. The catalog does not add customizable URLs or new fields to the draft.

### Education

A new entry prioritizes a name and optional type: degree, course, certification, or other. The type can be left empty or deselected. For a degree, the form offers an optional institution; a previously saved institution remains editable even if the type changes.

Status, dates, description, and link appear in details only when they already exist in the draft. A URL error opens those details and keeps the field available for review and correction. Data is retained when the type changes. Minimal entries export as one line with a type emoji, translated label, title, and institution when present. Existing details retain their full output, and dates remain free text.

### Output and security

Preview, copy, and download continue to use the same Markdown. Personal fields remain escaped plain text; their HTML or Markdown is not interpreted.

Recognized technologies without context export as 32 × 32 `img` tags. `src` and `alt` come exclusively from the pinned catalog; attributes are not interpolated from profile text or URLs. Entries with context or unrecognized names retain escaped text output.

The preview uses `remarkTechnologyIcons` to recognize only complete rows that match this exact markup and convert them into image nodes. The component checks the name and URL combination against the catalog and serves the equivalent local SVG. It retains `skipHtml`, the allowed-element list, and the absence of `rehypeRaw`. No free-form HTML or path for person-selected external images is enabled.

Navigation, selection, visibility, and reordering retain the behavior of ADR 0006. Storage, recovery, visible-metrics, and link rules do not change.

## Alternatives considered

| Alternative                                                                           | Advantage                       | Reason for the decision                                                                |
| ------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| Keep all eight modules and all fields visible                                         | Direct access to existing data. | Adds repetition and work to a brief introduction.                                      |
| Delete skills and current focus from the document or merge them into the introduction | Reduces the model.              | Changes personal content and breaks compatibility without need.                        |
| Technologies as text without icons                                                    | Simple generation.              | Does not meet the requested visual selection with icons.                               |
| Query a remote catalog during search                                                  | Broad, updateable catalog.      | Adds an availability dependency without improving the basic flow.                      |
| Allow custom image URLs or HTML                                                       | More visual freedom.            | Expands the content and validation surface; the closed catalog meets the current goal. |

## Consequences

- A brief profile needs fewer fields and does not depend on work history, employment, or public activity.
- The initial UI and contract have different scopes: six initial options and nine persisted IDs. Both must be described accurately.
- Earlier drafts retain their data and remain editable without migration or automatic text changes.
- The catalog is finite and requires maintaining metadata, local SVG copies, and attribution when updated. Custom text allows tools that are not included.
- The README uses pinned external URLs and their availability affects icons on GitHub; autocomplete and preview use local data and SVGs.
- The generated-markup exception requires preserving exact recognition and name/URL checks. It does not authorize user-supplied HTML.
- Flow review must cover keyboard selection, duplicates, custom names, allowed icons, earlier documents, recovered details, and link correction, as well as navigation and order.

See [editor](../editor.md), [architecture](../architecture.md), and [profile model](../profile-model.md).
