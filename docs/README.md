# Documentation

The [toolchain and compatibility decision](decisions/0002-toolchain.md) records the pinned versions and known warnings in the toolchain.

The GitHub Profile Generator documentation describes the product, its available behavior, and the technical guides for contributors. Development planning remains private and is not needed to set up the project or propose a contribution.

| Document                                                                                             | Purpose                                                                                       |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [Product](product.md)                                                                                | Short profiles, five fixed sections, custom sections, and the profile creation flow.          |
| [Development](development.md)                                                                        | Environment setup, commands, routes, and validation records.                                  |
| [Architecture](architecture.md)                                                                      | Responsibilities, boundaries, and optional public GitHub activity.                            |
| [Profile model](profile-model.md)                                                                    | The v2 contract, mixed section order, v1 compatibility, and core operations.                  |
| [Editor](editor.md)                                                                                  | Visual blocks, HTML, code, formatting, imports, and draft backups.                            |
| [Extended public suite](github-stats-extended.md)                                                    | Card families, counters, options, opt-in ranking, and compatibility limits.                   |
| [Open source](open-source.md)                                                                        | MIT, attribution, contributions, inventory, and distribution preparation.                     |
| [Branching and pull requests](branching.md)                                                          | Branch names, work from clones and forks, and the integration workflow.                       |
| [Repository guardrails](repository-guardrails.md)                                                    | Branch validation in CI and the limits of available enforcement.                              |
| [Design system](design-system.md)                                                                    | Internal tooling, tokens, components, and accessibility criteria.                             |
| [AI-assisted development](ai-development.md)                                                         | Context, delegation, and review of AI-assisted changes.                                       |
| [Initial architecture decision](decisions/0001-architecture.md)                                      | Context and consequences of the foundational architecture decisions.                          |
| [Profile document decision](decisions/0003-profile-document.md)                                      | Zod schemas, the draft JSON shape, and strict validation.                                     |
| [Manual profile composition](decisions/0005-manual-profile-composition.md)                           | Historical composition decision; current scope is defined in ADR 0008.                        |
| [Editor navigation](decisions/0006-editor-navigation.md)                                             | Stable configuration, selection, inclusion, and drag-based ordering.                          |
| [Short profile](decisions/0007-simple-profile.md)                                                    | Catalog and icons; its section selection was superseded by ADR 0008.                          |
| [Five sections](decisions/0008-focused-profile.md)                                                   | Retirement of career-history modules and internal v1 compatibility.                           |
| [Profile icons](decisions/0009-profile-icons.md)                                                     | Expanded catalogs, contact by domain, and permitted generated images.                         |
| [GitHub activity](decisions/0010-github-activity.md)                                                 | Five sections, first-party cards, public limits, and configured export.                       |
| [Countries and contacts](decisions/0011-country-and-contact-inputs.md)                               | Optional countries with flags and social links configured per entry.                          |
| [Technology categories](decisions/0012-technology-categories.md)                                     | A 358-item tools catalog, editable categories, and icons with labels.                         |
| [Custom sections](decisions/0013-custom-sections.md)                                                 | Text, list, and link blocks; independent copies; and v1-to-v2 migration.                      |
| [Custom visual blocks](decisions/0014-custom-visual-blocks.md)                                       | Additive v2 blocks, public HTTPS images, and the preview allowlist.                           |
| [Explicit HTML](decisions/0015-explicit-profile-html.md)                                             | Preserved source, filtered HTML, limits, and preview of the same Markdown.                    |
| [Top navigation and tools](decisions/0016-top-navigation-and-internal-tools.md)                      | Collapsible organization, mobile access to fields, and a development-only kit.                |
| [Horizontal section row](decisions/0017-horizontal-section-navigation.md)                            | Persistent sections, horizontal ordering, and scrolling within the row.                       |
| [Import with backup](decisions/0018-readme-import-with-backup.md)                                    | Local parsing, review, compatible HTML, and explicit recoverable replacement.                 |
| [Custom code and formatting](decisions/0019-code-and-formatting.md)                                  | Literal source, languages, local editor, and alignment with permitted derived HTML.           |
| [Presentation formatting](decisions/0020-presentation-formatting.md)                                 | Optional levels and alignment, v1/v2 compatibility, and shared derived HTML.                  |
| [Project files](decisions/0021-project-files-and-recovery.md)                                        | Complete JSON portability, review, and a backup independent of the previous profile.          |
| [Owner activity](decisions/0022-token-owner-public-activity.md)                                      | Queries with the owner's token, validated identity, and public-data filters.                  |
| [Customizable cards](decisions/0023-customizable-activity-cards.md)                                  | Seven local cards, visual presets, and MIT adaptations of GitHub Stats Extended.              |
| [Extended suite and MIT](decisions/0024-extended-public-suite-and-mit.md)                            | Ten card types, public data, opt-in ranking, and distribution notices.                        |
| [Activity data cache and batching](decisions/0025-activity-data-cache-and-preview-batching.md)       | Incremental public-data coverage and image requests after a short pause.                      |
| [Explicit card loading and local samples](decisions/0026-explicit-card-loading-and-local-samples.md) | Local samples, ephemeral approval, and language selection above the form.                     |
| [Temporary browser data](decisions/0027-browser-activity-data-cache.md)                              | Coverage-based grouped searches, local rendering, and customization without queries.          |
| [Independent scrolling](decisions/0028-independent-editor-scroll.md)                                 | Two native desktop panels and natural flow on small screens.                                  |
| [Search before choosing cards](decisions/0029-account-first-activity-search.md)                      | Explicit common-data prefetch and automatic loading of missing data for the searched account. |
| [Prefetch all counters](decisions/0030-all-profile-counters-prefetch.md)                             | Prepare all 18 counters in the current scope before customization.                            |
| [Persistent browser cache](decisions/0031-browser-persistent-activity-cache.md)                      | Temporary IndexedDB storage to reuse public data after reload without another query.          |
| [API and hosting](github-api-and-hosting.md)                                                         | Shared PAT quota, caches, and Vercel Hobby conditions for public traffic.                     |
| [Vercel deployment](vercel-deployment.md)                                                            | Hobby deployment with a PAT, main/dev, and anonymous README-card checks.                      |
| [Vercel Hobby with anonymous PAT](decisions/0032-vercel-hobby-anonymous-pat.md)                      | Initial deployment decision, function duration, and validation limits.                        |
| [Project showcase](decisions/0033-project-showcase.md)                                               | Linked title, optional v2 cover image, and composition with validated derived HTML.           |
| [Presentation and location](decisions/0034-friendly-presentation.md)                                 | Visible location, editable headline, and compatible styles.                                   |
| [Compact technologies](decisions/0035-compact-technologies.md)                                       | Catalog labels, inline categories, and draft compatibility.                                   |
| [Stable card origin](decisions/0036-production-card-origin.md)                                       | `APP_URL` priority and a fallback to the stable domain in Vercel Production only.             |
| [Project descriptions and links](decisions/0037-project-description-and-links.md)                    | Description text, cover image, and a single URL for the title.                                |
| [Indexación de producción y canonicales](decisions/0038-production-indexing-and-canonicals.md)       | Indexación por entorno, URL canónicas localizadas y rutas públicas del sitemap.               |
| [Third-party notices](../THIRD_PARTY_NOTICES.md)                                                     | Provenance and licenses for icons, flags, the code editor, and Extended cards.                |
| [Contributing](../CONTRIBUTING.md)                                                                   | Workflow, expectations for changes, and pull requests.                                        |

Start with the product guide to understand the proposal. To work on the code, follow the development guide, review the architecture, and agree on a concrete contribution goal.
