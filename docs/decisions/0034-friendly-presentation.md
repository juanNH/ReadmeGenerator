# ADR 0034: Friendly Introduction and Location

## Status

Accepted on October 21, 2026; revised on October 22, 2026, after the product iteration. Complements and updates the default output from [ADR 0020](0020-presentation-formatting.md).

## Context

The introduction should be brief and easy to adapt for different people. A location or country remains useful and can be part of the displayed name or headline. Writing guidance should help without changing a person's content. Centering the name and headline gives the initial composition more clarity, with controls for people who prefer another alignment.

## Decision

Add optional, strict v2 properties under `data.presentation.format`:

- `locationPlacement?: "displayName" | "headline"` places the selected location next to the name or headline using “from” or “desde.” Without this option, the location appears on its own line. If the selected field is empty, the location appears on a separate line; no connector is emitted when the location is empty.

Write the greeting as part of the full headline. The placeholder and help offer an editable idea, but do not automatically prepend text or change headline formatting. Do not add an automatic-greeting property to the v2 schema.

Keep the country/location field visible in the form. A person can choose a country from the catalog—with its local flag—or keep a location they wrote. The generator does not infer or add a country.

Center the name and headline by default, including in the classic style. The collapsible formatting section can change their level and alignment; an explicit choice takes precedence over the initial value. Bio and standalone location retain their existing alignments. Do not save default values to the document.

Show writing help as text associated with the name, headline, and bio fields. Do not provide buttons that insert suggestions or dialogs that replace text. Text remains literal and changes only when the person edits the field.

Place complete examples in placeholders and help: “It's great to have you here — I'm Alex Rivera 🌱” and “⌨️ Full-stack developer & Linux enthusiast 🐧”, with Spanish alternatives. These examples provide guidance and are never saved automatically.

Render a standalone location as “📍 Currently based in 🇦🇷 Argentina” or “📍 Actualmente en 🇦🇷 Argentina”. It also remains visible when the destination for an integrated location is empty. The flag remains a fixed resource for the selected country; free-form text is not converted into a country selection.

`displayNameTypography?: "italic" | "monospace"` and `headlineTypography?: "italic" | "monospace"` are independent v2 choices. Absence uses GitHub's style and does not add defaults. Derive them with `em` or `code` and escaped text, along with the selected level and alignment. Integrated location keeps its own representation and is not converted to code. The preview, HTML budget, and project JSON use the same contract.

GitHub removes CSS styles from README HTML, as documented by [GitHub Markup](https://github.com/github/markup). Do not offer arbitrary font families, `font-family`, downloadable fonts, or Unicode substitutions that replace the text. Titles rendered as images would require another flow and are outside this decision. Headline examples are inspired by [GitHub Profile README Generator](https://github.com/rahuldkjain/github-profile-readme-generator) and the [Awesome GitHub Profile README](https://github.com/abhisheknaiidu/awesome-github-profile-readme) collection, without incorporating code or assets from those projects.

The four content strings remain the source of truth and are preserved exactly when selecting a location or format, changing language, resetting formatting, or recovering a project. Do not modify v1: its schema continues to reject `format`. Older strict v2 readers may reject new options and must preserve the protected source. Project JSON retains supported formatting options.

Centered or styled titles and fields that combine a location are built with escaped-text HAST nodes and, where applicable, the exact local flag from the catalog. They are validated with the existing HTML helper and share the policy, budget, trees, and UTF-16 ranges of `customHtml`. They do not interpret Markdown, written HTML, URLs, or arbitrary icons. If a combined fragment exceeds the limit, `invalid_html` identifies its component fields. Data is not truncated.

## Alternatives and Consequences

Adding a greeting at render time could duplicate one the person already wrote; asking for a complete headline keeps control in one field. Help can guide without changing the draft. In the form, location appears after About You and can be placed next to the name, headline, or on a separate line. Inferring a country from free-form text could assign an incorrect location, so choosing from the catalog is explicit.

Centered output changes the default appearance compared with older documents. A person can choose left alignment to restore simple Markdown output or choose right alignment. Country selection is explicit and does not change written data. No services, dependencies, or AI writing are added. GitHub controls the final heading style; the local preview remains approximate.
