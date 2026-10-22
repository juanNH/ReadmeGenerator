# ADR 0008: Five sections and retirement of work-history modules

- Status: accepted.
- Date: 2026-10-19.
- Product: GitHub Profile Generator.
- Replaces the section scope of [ADR 0005](0005-manual-profile-composition.md) and [ADR 0007](0007-simple-profile.md). Retains catalog and icon rules, security, storage, and [navigation](0006-editor-navigation.md) that do not conflict with this decision.

## Context

Product review confirmed that simplifying fields while keeping earlier forms still made the flow resemble a résumé. The request is to remove skills, education, and current focus from the product, including when recovering drafts. The free-form introduction allows people to describe interests or personal activity without additional sections.

`ProfileDocument` v1 already contains nine IDs and may have data in retired modules. Deleting those fields during recovery or saving would destroy browser data and require a migration that is unnecessary for reducing the product.

## Decision

The editor and README offer exactly five optional sections: presentation, technologies, projects, contributions, and contact. No content or visibility condition reactivates skills, education, or current focus. Their forms, navigation options, and references as available features are removed from the UI and current documentation.

The v1 contract internally retains `knowledge`, `education`, and `current`, their structures, visibility, and positions. Reading continues to validate the full document, and saving preserves these values without editing, deleting, or merging them into presentation. Internal retention does not constitute a legacy editing feature.

The generator omits the three retired IDs before checking their content or links, even when they are visible. They produce no text, headings, `invalid_url` errors, or `unsupported_module` errors. If only retired content exists, the result is `empty_profile`. The five active sections retain their output controls; visible metrics still produces its error and explicit hide action.

Composition and drag-and-drop operate on the five included active sections. They rebuild their order within the nine positions, preserving slots for hidden, retired, and metrics IDs. Selection, visibility, and deletion remain separate.

Earlier ADRs retain their historical context; their section lists do not describe the current scope. Usage, product, and architecture documentation point to this decision. Git history is not rewritten to remove earlier decisions.

## Alternatives considered

| Alternative                                        | Advantage                       | Reason for the decision                                                               |
| -------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| Keep forms when an earlier draft already has data  | Allows editing every v1 field.  | Reintroduces sections that were requested to be removed and leaves two product flows. |
| Automatically merge retired data into presentation | Reuses earlier visible content. | Changes personal text without its author's decision and can introduce repetition.     |
| Remove the three IDs from the document             | Reduces the schema.             | Destroys data or requires a migration without helping the five-section flow.          |
| Omit output but validate retired links             | Reuses previous validation.     | Blocks export on fields that no longer have editing or README participation.          |

## Consequences

- The product always presents the same five sections, with a free introduction and visual technologies.
- An earlier draft may generate a different README: retired modules are no longer exported, but their data remains internally.
- Structural document validation and output validation have different scopes. The parser retains v1 invariants; the generator checks only active sections and the metrics limit.
- Internal compatibility requires preserving retired data while saving and reordering, without activating interfaces or renderers for them.
- Verification must cover drafts with visible retired modules, invalid links there, missing output, and preservation of their data and positions.

See [product](../product.md), [editor](../editor.md), and [profile model](../profile-model.md).
