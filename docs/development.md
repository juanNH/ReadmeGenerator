# Development

This guide explains how to run and review the application and its profile core. The product definition and current scope are in [Product](product.md); the contract and its operations are described in [Profile model](profile-model.md).

## Requirements

- Node.js `24.21.0`, specified in `.nvmrc`.
- pnpm `11.25.0`, specified by `packageManager` in `package.json`.

The project uses Next.js `16.4.2`, React `19.3.1`, TypeScript, Tailwind CSS 4, and `next-intl` for localization. The core uses Zod `4.6.7` to validate documents. You do not need a GitHub account, an AI key, or environment variables to review the current baseline.

Direct dependencies and the lockfile pin the baseline versions. In a clean checkout, `pnpm install --frozen-lockfile` reproduces that resolution. Three transitive plugins have a peer-dependency warning with ESLint 10; the decision and its limitations are recorded in [ADR 0002](decisions/0002-toolchain.md).

The importer directly declares unified `11.0.5`, remark-parse `11.0.0`, remark-gfm `4.0.1`, and mdast-util-to-hast `13.2.1`, with `@types/mdast` `4.0.4` for development. It reuses the existing HTML parser and serializer. The parser loads when the importer opens; it adds no services, accounts, or keys. GFM support allows tables and other structures to be parsed, but conversion remains limited by the editor's blocks and HTML policy.

## Installation and running the app

From the repository root:

```sh
pnpm install
pnpm dev
```

Open [http://127.0.0.1:3000/en](http://127.0.0.1:3000/en) for English or [http://127.0.0.1:3000/es](http://127.0.0.1:3000/es) for Spanish. The internal design system is available in [English](http://127.0.0.1:3000/en/design-system) and [Spanish](http://127.0.0.1:3000/es/design-system) only with this development server; production returns 404. The [http://127.0.0.1:3000](http://127.0.0.1:3000) route redirects to English.

To run the production build:

```sh
pnpm build
pnpm start
```

`pnpm start` requires `pnpm build` to have completed successfully. The expected port is `3000`.

## Commands

| Command                  | Purpose                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `pnpm dev`               | Start the development server.                                                           |
| `pnpm build`             | Create the production build.                                                            |
| `pnpm start`             | Serve the existing production build.                                                    |
| `pnpm lint`              | Check code against the repository rules.                                                |
| `pnpm typecheck`         | Check types without emitting files.                                                     |
| `pnpm format`            | Apply the project's formatting.                                                         |
| `pnpm format:check`      | Check formatting without changing files.                                                |
| `pnpm test`              | Use Vitest to check the profile, generation, draft adapter, and EN/ES messages.         |
| `pnpm test:watch`        | Run those tests during development.                                                     |
| `pnpm test:e2e`          | Check public routes and browser flows for editing, recovery, and export.                |
| `pnpm test:e2e:ui`       | Open Playwright's internal UI to explore and run the flows.                             |
| `pnpm test:a11y`         | Run automated accessibility checks for public routes and the editor.                    |
| `pnpm test:e2e:cards`    | Test all ten exported card families with real routes and controlled providers.          |
| `pnpm test:cards`        | Test the card checker without credentials or external requests.                         |
| `pnpm cards:check`       | Check SVG URLs from a public origin or an exported README.                              |
| `pnpm docs:check`        | Check local links in the repository's Markdown files.                                   |
| `pnpm licenses:generate` | Regenerate dependency and third-party resource inventories and notices.                 |
| `pnpm licenses:check`    | Check dependency and third-party resource inventories and notices.                      |
| `pnpm check`             | Run license checks, lint, type checks, formatting, documentation links, and unit tests. |

`pnpm check` groups `licenses:check`, `lint`, `typecheck`, `format:check`, `docs:check`, `test`, and `test:cards`. The build and browser checks run separately. To deploy with a PAT and without login, follow the [Vercel guide for main/dev](vercel-deployment.md). `licenses:generate` updates notices when dependencies or distributed assets change; review its diff using the [open-source guide](open-source.md). `typecheck` first generates Next.js route types, including the `next/root-params` getters.

If browser tests ask you to install their browser, run:

```sh
pnpm exec playwright install chromium
```

## Baseline scope

Internal planning is kept locally in `.private/planning/`, excluded from Git and public documentation checks. A fresh clone works without those files. The folder is not synced or backed up remotely through this repository; do not use `git add -f` to publish it.

- `/`: redirects to the default language, English.
- `/en` and `/es`: application entry points that show the project's initial state.
- `/en/design-system` and `/es/design-system`: internal visual-system catalog, available only with `pnpm dev`; production returns 404 and the application does not link to it.
- `/en/editor` and `/es/editor`: five optional fixed sections and repeatable custom sections, with top navigation, collapsible organization, stable configuration, drag or button-based ordering, preview, export, and a local draft. Skills, education, and news remain retired, including for earlier drafts. The editor is rendered per request to read runtime card configuration; the home page remains pre-rendered.
- Functional language selector, localized routes, and separate English and Spanish messages.
- Shared components and initial quality and test configuration.
- Profile v2 contract, fixed/custom references in `sectionOrder`, blocks in `customSections`, validated v1 migration, and pure create, duplicate, visibility, delete, and ordering operations in `src/core/`.

Unit tests cover profile contracts and operations, README generation, the storage adapter, messages, SVGs, and the GitHub client with controlled responses. Production browser checks cover the visual baseline, the editor flow, and the absence of the public design system. GitHub activity integration is implemented and requires server configuration; there are no AI providers.

Vitest checks core behavior, output and persistence limits, and message-key and parameter parity across both languages. Playwright checks flows, languages, theme, keyboard behavior, errors, screen sizes, and export. Results are recorded by delivery below; the existence of a test does not mean it ran in this review.

Set `PLAYWRIGHT_BASE_URL` to check an already running instance; otherwise, Playwright starts the development server. In CI, the app is built first and Playwright starts `pnpm start` to check production. Do not run `pnpm dev` and `pnpm build` at the same time while validating the same delivery.

Changing languages preserves the route, parameters, and anchor. The document's `contentLocale` field is independent of the navigation language; changing languages does not translate the content. This initial view uses `noindex` metadata; review this setting before publishing the final product.

## Local draft and troubleshooting

The editor stores the complete document in `localStorage` under `github-profile-generator.profile.v2`. If that key does not exist, it reads `github-profile-generator.profile.v1`, validates the exact legacy format, and migrates it in memory. Recovery or migration does not write; the first edit saves v2. The v1 key remains intact as the local original, even when starting another confirmed draft. An invalid or inaccessible v2 is not automatically replaced with v1.

Valid changes are saved after 500 ms, and the editor also attempts to save pending changes when the page is hidden or left, or when the editor unmounts. An abrupt close may prevent this last attempt. Document data is not sent to a server or synced across devices. When troubleshooting, always distinguish the two keys and preserve the original values before intervening.

Always use the same origin: `http://127.0.0.1:3000`. Switching to `localhost`, another host, port, or protocol opens different storage. The editor's languages share the draft as long as the origin stays the same.

For invalid JSON, an incompatible version, or a blocked read, the editor preserves the existing value and prevents automatic replacement. Confirming that you want to start a new draft allows it to be replaced; canceling does not write anything. If a write fails or storage is full, the warning remains, and you can continue editing in memory and export a valid README; do not claim that the latest changes are saved.

The five fixed modules retain their legacy v1 structures. The current format adds custom instances and their mixed order. The selected section and mobile view are temporary; content, visibility, and order are saved. Hiding an active section keeps its form editable and indicates that it is excluded from the README. Dragging moves a fixed or custom section among the included sections; Move up/Move down changes its position by one. Both actions preserve hidden, retired, and metrics references in their positions during reordering.

All documents offer the same five fixed sections and the option to add custom sections. Skills, education, and news have no form or output, even if their old flags are true; their links do not block export either. V2 preserves those fields and references so drafts can be recovered without data loss. They are not re-enabled under any condition and are not automatically merged into the introduction. See [ADR 0008](decisions/0008-focused-profile.md).

Custom instances support an optional title, paragraphs, bulleted or numbered lists, and web links. Duplicating copies the whole tree with new IDs; hiding preserves data, and deleting removes only that instance. The `- `, Enter, paste, and list-conversion helpers apply only to `modules/custom`; fixed fields remain plain text. The generator produces a single escaped Markdown output and validates its visible links using `customSections` paths, without enabling free-form HTML. See [ADR 0013](decisions/0013-custom-sections.md).

Technologies uses a local catalog of 358 tools with SVGs and licenses from Devicon, Simple Icons, and Lobe Icons, pinned to commits. It supports custom text, editable suggested categories, and optional notes; searching does not query external services. Decorative 20 × 20 icons appear beside visible names in responsive rows. Organization is explicit and does not modify drafts during recovery or language changes. Contact offers 13 services, a website/portfolio, and email; a valid URL determines the icon, while the label is optional and customizable. Exported icons are decorative and 20 × 20. `remarkProfileIcons` preserves inline Markdown context without nested paragraphs and also recognizes earlier 32 × 32 technology tokens. The `ContactProviders` namespace is passed explicitly to the editor's client provider. Markup is generated only from approved catalogs. See [ADR 0009](decisions/0009-profile-icons.md) and [ADR 0012](decisions/0012-technology-categories.md).

## Configure GitHub activity

The **Activity and contributions** form retains a manual workflow that requires no account and offers a collapsible area to search for a user and choose a calendar, summary, or languages. Suggested highlights are copied only after an explicit selection. The current document retains the legacy `data.metrics` and `data.contributions` structures; it does not store remote snapshots. Navigation uses the effective inclusion of both flags and generates a single block under the contributions reference without moving the internal metrics reference.

The variables are described in [.env.example](../.env.example). They are empty by default, and the manual workflow works without them:

- `GITHUB_TOKEN`: a dedicated classic PAT with only `public_repo`, as required by the current GraphQL documentation. This permission also allows public write access; the implemented client uses only fixed queries. The server checks `X-OAuth-Scopes` on every response and accepts an empty value or exactly `public_repo`; it rejects other or mixed permissions and credentials it cannot verify. Tokens with additional access to accounts, private repositories, or private contributions are not accepted. Do not paste secrets into chats, public files, or `NEXT_PUBLIC_` variables.
- `APP_URL`: the public HTTPS origin for this deployment, which will host the SVGs. It is read per request, so restarting the service after changing it is sufficient. It is not derived from Host and does not accept local addresses, credentials, ports, paths, parameters, or fragments. Without a public origin, cards can be reviewed locally, but the generator reports `exportIssues` and the interface prevents copying or downloading that output. Excluding the cards allows manual content to be exported.

Only on Vercel with `VERCEL_ENV=production`, when `APP_URL` is empty, the app validates `https://` plus the stable domain from `VERCEL_PROJECT_PRODUCTION_URL`. A non-empty invalid `APP_URL` does not enable this fallback. Local, Preview, and self-hosted environments require explicit configuration; `VERCEL_URL`, branch aliases, and a request's Host are never used. System environment variables must be enabled in Vercel, and changes require a redeploy. See [environment configuration](vercel-deployment.md#3-environment-variables) and [ADR 0036](decisions/0036-production-card-origin.md).

### Development and production

Next.js selects the environment automatically: `pnpm dev` uses development; `pnpm build` and `pnpm start` use production, even when run on a local computer. Environment files belong in the project root.

| Environment | Configuration                                                                             | `GITHUB_TOKEN`                                           | `APP_URL`                                                                                |
| ----------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Development | Copy `.env.example` to `.env.development.local`.                                          | Store the dedicated classic PAT with only `public_repo`. | Leave empty to query and preview locally.                                                |
| Production  | Hosting environment variables; a self-hosted server can also use `.env.production.local`. | Store an accepted credential as a server secret.         | The deployment's actual public HTTPS origin, for example `https://profiles.example.com`. |

To create the credential, follow GitHub's [guide to classic tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic) and select only `public_repo`. Store it directly in the local file or hosting secrets; do not send it in chat or include it in the README. People using the generator only enter a username; they do not need to create their own tokens or sign in.

Process variables take precedence over files. Next checks `.env.development.local` or `.env.production.local`, then `.env.local`, then `.env.development` or `.env.production`, and finally `.env`. To keep the two environments separate, define both keys in the environment-specific file and avoid using `.env.local` for this configuration. `.env*.local` files are excluded from Git; `.env.example` contains only empty keys and explanations.

Restart the service after saving the values. In development, open **Activity and contributions**, enter a username, and select **Search GitHub activity**. The first successful query enables the calendar, summary, and languages selections. A missing, rejected, or incompatible token leaves the integration unconfigured; an empty template does not enable it.

The token owner can query their own username with the same accepted credential. The client validates the requested username and `isViewer`; it accepts the `PUBLIC` view and also `PRIVATE` when it belongs to the authenticated owner. It retains scope verification, the owner's public non-fork repositories, and unrestricted public highlights. GitHub requires `read:user` to include private/internal contributions, and this client rejects that scope; it accepts only restricted anonymous counts that the person chose to share publicly. `userViewType` cannot detect a private-profile setting, and its values are not exposed in the snapshot. See [ADR 0022](decisions/0022-token-owner-public-activity.md).

Production must run the Next.js application with its API and SVG routes and allow GitHub to access the cards publicly. The origin must also be available when the server starts; defining it only during the build is not enough. Once deployed, development can use the same `APP_URL` to export a README with cards hosted in production. The preview keeps its local requests; URLs in exported Markdown point to the configured public origin. Without an operational public deployment, leave `APP_URL` empty and review cards locally.

### Activity routes and states

`GET /api/github/activity?username=...` returns a validated snapshot or an error code. `GET /cards/github/{username}/{calendar|summary|languages}.svg?locale=en|es` serves first-party images that are refreshed through caching. The form queries only when its button is selected; already selected cards load when displayed. Images include a link to open them at full size. No third-party public chart service is integrated.

Without a token, the JSON query returns `503 not_configured`; the image shows an unavailable state without numbers and returns HTTP 200 to avoid a broken image. Actual zero values come from a successful query and are not used to replace errors. For dates, coverage, privacy, limits, and caching, see [Architecture](architecture.md) and [ADR 0010](decisions/0010-github-activity.md). Routine tests use controlled responses and do not require credentials.

Metrics is retained in the document even though it has no form or generator. If visible, `unsupported_module` blocks export, and the UI offers an explicit action to hide it while preserving its configuration. A structurally valid document is not necessarily exportable: links provided in visible sections are validated before generation. See the [editor guide](editor.md) for text and link rules.

Geist fonts come from installed packages and are served with `next/font/local`; fonts are not downloaded during the build. On Windows, a sandbox may prevent SWC native bindings from loading or being materialized; if this happens, run checks from an authorized repository terminal. Do not disable validations or change system permissions as a workaround.

## Visual and accessibility review

For interface changes, review the entry point, editor, and design system in both languages, on desktop and a narrow screen. Check the language selector, `/` redirect, keyboard navigation, visible focus, control labels, and any disabled or error states affected by the change.

Automated accessibility checks cover only part of the behavior. Record the manual review separately, along with any cases that remain pending.

## Initial delivery validation record

Local validation performed on **2026-10-19** with Node.js 24.21.0 and pnpm 11.25.0 on Windows. Browser tests ran against the production build at `http://127.0.0.1:3000`.

| Check                                      | Observed result                                                                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --offline --frozen-lockfile` | Passed; used previously downloaded packages and preserved the lockfile resolution.                                                              |
| `pnpm check`                               | Passed: lint, types, formatting, local links, and 2 translation tests.                                                                          |
| `pnpm build`                               | Passed; the home page and design system were pre-rendered in English and Spanish.                                                               |
| `pnpm test:e2e`                            | 11 Chromium tests passed: navigation, language, theme persistence, keyboard, field errors, mobile, and 404.                                     |
| Automated accessibility                    | The 5 axe cases included in `test:e2e` found no violations of the selected WCAG AA rules. `test:a11y` was not run separately.                   |
| Manual visual review                       | Home page and design system on desktop, Spanish design system at 360 px, and accessible theme state after reload, using the integrated browser. |

Keyboard navigation and the absence of overflow at 360 px were also checked automatically. A discrepancy in the theme button's accessible state after reload was fixed, and the complete suite was rerun successfully. No screen reader review or browser matrix beyond Chromium was performed; these checks do not certify full accessibility.

The results in this section come from local runs and do not indicate the current status of remote GitHub Actions checks. The ESLint plugin compatibility warning is documented in [ADR 0002](decisions/0002-toolchain.md).

## Profile core validation

Local validation performed on **2026-10-19** with Node.js 24.21.0 and pnpm 11.25.0 on Windows:

| Check                                      | Observed result                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `pnpm install --offline --frozen-lockfile` | Passed; direct dependency Zod 4.6.7 is pinned in the manifest and lockfile.                         |
| `pnpm check`                               | Passed: lint, types, formatting, public links in 17 Markdown files, and 104 unit tests in 3 suites. |
| `pnpm build`                               | Passed; the home page and design system were pre-rendered in English and Spanish.                   |
| Independent code and documentation review  | No material issues with contracts, operations, examples, limits, or planning privacy.               |

Tests include 102 profile and registry cases and 2 translation cases. They check incomplete drafts, JSON serialization, invalid keys and identifiers, ordering and visibility without mutating the original document, and independence of examples. Examples use fictional people and links; they do not query GitHub.

Browser tests and visual checks were not repeated in that review because no screens or interactions changed. The editor, persistence, and README generation did not exist yet; those results apply only to the profile core.

## Local editor validation

Local validation performed on **2026-10-19** with Node.js 24.21.0 and pnpm 11.25.0 on Windows. Browser tests used the production build at `http://127.0.0.1:3000`.

| Check                                      | Observed result                                                                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --offline --frozen-lockfile` | Passed; the manifest and lockfile retain ReactMarkdown 10.1.0 and Zod 4.6.7.                                                                          |
| `pnpm check`                               | Passed: lint, types, formatting, local links in 19 Markdown files, and 195 unit tests in 5 suites.                                                    |
| `pnpm build`                               | Passed; the home page, design system, and editor were pre-rendered in English and Spanish.                                                            |
| `pnpm test:e2e`                            | 27 Chromium tests passed: 16 for the editor and 11 for the baseline.                                                                                  |
| Automated accessibility                    | The 8 axe cases included in `test:e2e` found no violations of the selected WCAG AA rules. `test:a11y` was not run separately.                         |
| Manual review                              | Editor on desktop and at 360 px; forms, preview, EN/ES switch, README language independence, keyboard hiding, and recovery after reload.              |
| Independent review                         | Fixed loss of in-memory edits when changing languages and the accessible announcement for a save failure. Final review found no material open issues. |

Unit tests cover the profile contract, generator, storage adapter, and translation parity. Browser tests check optional sections, focus when adding and removing links, protection of the original draft, read and quota failures, navigation between languages before saving, output shared by preview/copy/download, and plain-text handling.

If storage fails, temporary state preserves the edit when navigating between languages in the same tab. A full reload or closing the tab removes that backup; the warning advises downloading it first. No screen reader review or browser matrix beyond Chromium was performed. Automated results and manual review do not certify full accessibility. These local records do not represent the status of GitHub Actions.

## Manual modules and composition validation

Local validation performed on **2026-10-19** with Node.js 24.21.0 and pnpm 11.25.0 on Windows. Browser tests ran against production at `http://127.0.0.1:3000`.

| Check                   | Observed result                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`            | Passed: lint, types, formatting, local links in 20 Markdown files, and 277 unit tests in 7 suites.                                                                                                     |
| `pnpm build`            | Passed; the home page, design system, and editor were pre-rendered in English and Spanish.                                                                                                             |
| `pnpm test:e2e`         | 37 Chromium tests passed: 10 for manual modules/composition, 16 editor regressions, and 11 baseline cases.                                                                                             |
| Automated accessibility | The 10 accessibility cases in the suite ran 12 axe analyses and found no violations of the selected WCAG AA rules; the 2 new cases reviewed both themes at 360 px. `test:a11y` was not run separately. |
| Manual review           | Editor in EN/ES, adding skills and education, collapsing panels, keyboard reordering, recovery, and README language independence; desktop and mobile screenshots.                                      |
| Independent review      | Forms, renderers, focus, error routes, and compatibility reviewed; fixed focus after hiding metrics, with no material open findings.                                                                   |

Unit tests include 143 generation cases, 102 profile contract cases, 16 draft adapter cases, 9 translation cases, and 7 composition cases. They check partial output, free-form dates, localized enums, omission of empty values, context-specific protocols, nested paths, complete ordering, and immutability. Browser flows use fictional data and retain regressions for corrupted, blocked, or full storage and language navigation before saving.

No dependencies, external queries, or v1 draft migration were added. Visual review of 360 px screenshots complements automated overflow checks. No screen reader review or other browser engines were used; these checks do not certify full accessibility or represent remote CI status.

## Editor navigation and drag validation

Local validation performed on **2026-10-19** with Node.js 24.21.0 and pnpm 11.25.0 on Windows. Browser tests used production at `http://127.0.0.1:3000`.

| Check                                      | Observed result                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --offline --frozen-lockfile` | Passed; preserves resolution of `@dnd-kit/react` and `@dnd-kit/dom` 0.5.1.                                                                 |
| `pnpm check`                               | Passed: lint, types, formatting, public links in 21 Markdown files, and 289 unit tests in 7 suites.                                        |
| `pnpm build`                               | Passed; home, design-system, and editor routes were pre-rendered in English and Spanish.                                                   |
| `pnpm test:e2e`                            | 46 Chromium tests passed, including nine for navigation, configuration, and dragging.                                                      |
| Drag repetitions                           | Five cases repeated three times: 15 successful runs for mouse, emulated touch, keyboard, Escape, and dropping outside a target.            |
| Automated accessibility                    | The 12 cases in the suite ran 16 axe analyses and found no violations of the selected WCAG AA rules. `test:a11y` was not run separately.   |
| Visual review                              | Screenshots with fictional data: 1440 px desktop and 360 px mobile; active configuration, preview, long fields, and errors in both themes. |
| Independent review                         | Composition, selection, focus, cancellation, and documentation reviewed; no material open findings after integrating fixes.                |

The flows check the single configuration panel, active section, independent inclusion, editable hidden content, shared exportable Markdown, order restored after reload, and preservation of data and positions for hidden modules. Cancellations check both the saved document and the list's visual order. Announcements verify the number of sections after draft recovery. Storage-error and language-navigation regressions were retained.

During integration, the app was fixed to preserve a provisional DOM order when dropping outside a target and to prevent announcements from capturing the zero count before recovery. Mobile flows were also updated to open navigation before checking links, and the mouse driver was synchronized with visible controls and the actual gesture state.

Touch was checked using Chromium input events in a mobile context; this does not replace review on physical devices, Safari, or touch assistive technologies. No screen reader review or other browser engines were used. Screenshots and automated analyses do not certify full accessibility or reflect remote CI. The v1 document remains unmigrated; the two new dependencies support client interaction and add no external GitHub or AI services. See [ADR 0006](decisions/0006-editor-navigation.md).

## Simplified profile validation

Local validation performed on **2026-10-19** with Node.js 24.21.0 and pnpm 11.25.0 on Windows. Chromium flows used the production build at `http://127.0.0.1:3000`.

| Check                   | Observed result                                                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`            | Passed: lint, types, formatting, public links in 23 Markdown files, and 298 unit tests in 9 suites.                                                                              |
| `pnpm build`            | Passed; the home page, design system, and editor were pre-rendered in both languages.                                                                                            |
| `pnpm test:e2e`         | 51 tests passed in the final run, including five new simplified-profile flows.                                                                                                   |
| Automated accessibility | The 13 cases in the suite ran 19 axe analyses and found no violations of the selected WCAG AA rules. `test:a11y` was not run separately.                                         |
| Icons                   | Inventory of 48 local SVGs, 132,163 bytes total, with MIT license and attribution; metadata and originals pinned to the same Devicon commit. No additional package dependencies. |
| Visual review           | Fictional technology screenshots at 1440 px and education/preview in Spanish at 360 px; chips, hierarchy, compact fields, study type, and icons reviewed.                        |
| Independent review      | Catalog, allowed markup, preview, and compatibility reviewed; fixed loss of focus when clearing a previously saved institution.                                                  |

The new cases check six initial sections, a free-form introduction, secondary details, keyboard search for technologies, aliases and duplicates, custom names, exported icons, minimal education details, and an optional institution. They also check that an `img` tag pasted as text does not become an image, even if it matches an allowed icon. Tests for earlier sections use saved v1 documents to check continuity without offering those sections again in the new flow.

Storage, language-switching, export, drag ordering, and visual cancellation regressions were retained. When a chip is removed, focus returns to the search field and suggestions stay closed; when a saved institution is cleared, the field keeps focus and allows re-entry. The study type does not delete earlier data.

README review is limited to generated output and its local preview; no test profile was published to GitHub. README icon availability depends on the pinned public URLs. Search and preview use local data. Limitations remain for emulated touch, no screen reader, and no other browser engines; these checks do not certify full accessibility or reflect remote CI. See [ADR 0007](decisions/0007-simple-profile.md).

## Five-section flow validation

Local validation performed on **2026-10-19** with Node.js 24.21.0 and pnpm 11.25.0 on Windows. This record replaces the section scope from the previous delivery. Browser flows used the production build at `http://127.0.0.1:3000`.

| Check                   | Observed result                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`            | Passed: lint, types, formatting, public links in 24 Markdown documents, and 273 unit tests in 9 suites.                                                    |
| `pnpm build`            | Passed; the home page, design system, and editor were pre-rendered in English and Spanish.                                                                 |
| `pnpm test:e2e`         | 51 Chromium tests passed, with regressions adapted to the five current sections.                                                                           |
| Automated accessibility | The 13 cases ran 19 axe analyses and found no violations of the selected WCAG AA rules. `test:a11y` was not run separately.                                |
| Visual review           | Fictional screenshots at 1440 px desktop and 360 px mobile; five-section navigation, active configuration, and Spanish preview had no horizontal overflow. |
| Independent review      | UI, messages, and generation reviewed; no material open findings.                                                                                          |

Tests verify that skills, education, and news do not reappear in navigation, forms, preview, or README, even when data and visibility are saved. Invalid links in those structures do not block output. Saving and reloading preserves their values, flags, and internal positions without merging text into the introduction. The five-section list is tested for both new profiles and earlier drafts.

Mouse, emulated-touch, and keyboard drag flows, cancellation, focus, storage, language switching, icon autocompletion, and matching preview/copy/download output were retained. This update added no dependencies and did not migrate the v1 document. No screen reader, physical touch-device, other-engine, or GitHub profile-publishing review was performed; these local results do not certify full accessibility or reflect remote CI. See [ADR 0008](decisions/0008-focused-profile.md).

## Catalog and contact icon validation

Local validation performed on **2026-10-19** with Node.js 24.21.0 and pnpm 11.25.0 on Windows. Chromium flows used production at `http://127.0.0.1:3000`.

| Check                         | Observed result                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                  | Passed: lint, types, formatting, links in 25 Markdown documents, and 318 unit tests in 11 suites.                                                                |
| `pnpm build`                  | Passed; home, design-system, and editor routes were pre-rendered in EN/ES.                                                                                       |
| `pnpm test:e2e`               | 64 tests passed in the final run.                                                                                                                                |
| Automated accessibility       | 19 cases include 31 axe analyses with no violations of the selected rules. `test:a11y` was not run separately.                                                   |
| Technology inventory          | 259 SVGs, 1,003,008 bytes: 223 Devicon, 15 Simple Icons, and 21 Lobe Icons. URLs pinned and license copies local; no additional packages.                        |
| Contact inventory             | 13 SVGs, 8,769 bytes, from Simple Icons 11.15.0, with a local CC0 license.                                                                                       |
| Visual and independent review | Fictional technology and contact screenshots at 1440 px and 360 px; both themes reviewed with no overflow. Catalog and security review found no blocking issues. |

The technology regression checks rendering through real ReactMarkdown, the absence of nested paragraphs, adjacent icons on the same row, and wrapping at 360 px. Downloads preserve explicit dimensions. Catalog tests cover identity, aliases, immutable sources, and local SVGs with no active or remote content.

Contact is checked in both languages: service selection, website/portfolio, email, custom label, focus, recovery of opaque IDs, spoofed domains, escaped links, and 20 × 20 dimensions. Decorative icons do not duplicate a link's accessible name. A real test detected and helped fix that the `ContactProviders` namespace was not reaching the editor's client provider.

Storage, retired-module, drag and cancellation, language, and shared-output regressions remain. The v1 format was not changed, and no GitHub or AI provider was integrated. Review was local: no README was published to GitHub. Contrast for original monochrome SVGs may differ in GitHub's dark theme, while the editor places icons on light backgrounds; exported URLs depend on their original hosts. No screen reader, physical touch device, or other engines were used. These results do not certify full accessibility or reflect remote CI. See [ADR 0009](decisions/0009-profile-icons.md).

## Activity and contributions validation

Local validation performed on **2026-10-19** with Node.js 24.21.0 and pnpm 11.25.0 on Windows. Browser tests used the production build at `http://127.0.0.1:3000`. The integration is delivered without credentials or a domain configured; successful GitHub data in tests comes from controlled, fictional responses.

| Check                    | Observed result                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`             | Passed: lint, types, formatting, links in 26 Markdown documents, and 427 unit tests in 17 suites.                                                      |
| `pnpm build`             | Passed; editor, dynamic JSON and SVG, home page, and design system were pre-rendered in EN/ES.                                                         |
| `pnpm test:e2e`          | 75 Chromium flows passed in the final run, including 11 for activity and highlights.                                                                   |
| Automated accessibility  | 21 cases include 37 axe analyses with no violations of the selected rules. `test:a11y` was not run separately.                                         |
| HTTP without credentials | Valid JSON: 503 `not_configured`; invalid username: 400; SVG: 200, `unavailable` state, no simulated numbers.                                          |
| Visual review            | Fictional data at 1440 px desktop and 360 px mobile, both languages and themes; configuration, cards, and highlights had no horizontal overflow.       |
| Independent review       | Corrected the permitted token scope according to official documentation, public runtime configuration, and card reactivation. No blocking open issues. |

Pure tests cover local/public URLs, immutability, username validation, composition of both slots, omission of empty cards, and escaped SVGs for zero/unavailable/stale states. The client and cache are tested with controlled responses for scopes, private/internal data, pagination, limits, HTTP and GraphQL errors, the last valid result, deduplication, and credential rotation.

Flows check collapsed GitHub controls and disabled cards, manual contributions without a username, explicit querying, selecting highlights without duplicates, discarding late responses, v1 saves without snapshots, recovery, independent inclusion/exclusion, and editable hidden sections. Locally, the preview uses the same Markdown and local URLs cannot be published; excluding cards preserves selections and allows manual content to be exported. Images link to their full-size versions.

Technology, contact, language, storage, mouse/emulated-touch/keyboard ordering, and cancellation regressions were retained. A wait in contact tests was fixed because it read the draft before its first 500 ms save. This delivery added no dependencies or format migration, and involved no commit, push, or deployment.

No real authenticated GitHub query, README publication, public-domain validation, screen reader, physical touch device, other browser engines, or remote CI check was performed. Enabling the integration requires `GITHUB_TOKEN` and `APP_URL`; limits and cache retention are per process. These local and automated results do not certify full accessibility. See [ADR 0010](decisions/0010-github-activity.md).

## Multiple contact links validation

Additional verification on **2026-10-19**: `pnpm check` passed with 427 unit tests in 17 suites, `pnpm build` passed, and **77 Chromium flows passed**. The two new cases add three custom websites and two profiles for the same service in EN/ES; they check independent names, URLs, and IDs, editing, deletion, recovery, and export. The “Add another website” action creates a custom entry even when the selector retains a known service.

The Spanish mobile screenshot in dark theme was reviewed with no overflow. The 21 accessibility cases still include 37 axe analyses with no violations of the selected rules; this is not a full certification. Plans, the roadmap, and temporary files remain excluded from Git; the configuration example keeps credentials empty.

## Countries and per-entry contacts validation

Validation on **2026-10-19**: `pnpm check` passed with 443 unit tests in 19 suites and links in 27 documents; `pnpm build` passed; **87 Chromium flows passed in the final run**. The 25 accessibility cases include 45 axe analyses with no violations of the selected rules. `test:a11y` was not run separately, and this does not certify full accessibility.

Countries in both languages, search by name/code, keyboard, Escape, pointer selection, 20 × 15 flag images, v1 save and recovery, language switching without translating data, and export from the same Markdown are checked. Free text and earlier locations are preserved, including emoji or HTML written as text. A real regression revealed that a prefix in another language could take precedence over the active language's name; in English, “arg” now prioritizes Argentina.

Contact uses an add button and selectors inside each entry; optional labels and repeated websites/social profiles are retained. Tests verify focus with arrow keys and Tab, preservation of URL/name/ID when changing a suggestion, provider derivation from the URL, and recovery. Spanish mobile screenshots in dark theme were reviewed, including the country dropdown; there was no horizontal overflow. No dependencies were added and the document was not migrated. The review does not include a screen reader, physical touch device, other engines, or a README published to GitHub.

## Categories and technology catalog validation

Validation on **2026-10-19** on Windows with Node.js 24.21.0 and pnpm 11.25.0. Chromium flows use the local production build.

| Check                     | Observed result                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`              | Passed: lint, types, formatting, links in 28 Markdown documents, and 506 unit tests in 22 suites.                                                |
| `pnpm build`              | Passed; the editor is dynamic and the home page/design system were pre-rendered in EN/ES.                                                        |
| `pnpm test:e2e`           | 95 flows passed in the final run, including 8 category cases.                                                                                    |
| Focused visual regression | 3 presentation/export cases passed before rerunning the full suite.                                                                              |
| Automated accessibility   | 27 cases include 49 axe analyses with no violations of the selected rules. `test:a11y` was not run separately.                                   |
| Catalog                   | 358 SVGs, 1,172,189 bytes: 248 Devicon, 82 Simple Icons, and 28 Lobe Icons, with pinned sources and local attribution.                           |
| Visual review             | Fictional screenshots at 1440 px and 360 px, both languages and themes; visible names, categories, details, and rows had no horizontal overflow. |

Tests cover the nine suggested categories and aliases in the expanded catalog, creation and renaming, adding an uncategorized item, explicit moves, reordering, removing titles without losing tools, confirming organization, opaque IDs, and collisions across collections. Recovery or changing languages preserves categories, notes, and unrelated data without migrating v1. An empty category can be renamed without unmounting the field when its title is temporarily cleared; the title is applied on blur or when Enter is pressed. Focus is preserved when moving items and at the ends of the order.

Output includes decorative 20 × 20 icons with visible names and escaped custom text. Earlier 32 × 32 tokens and HTML/image restrictions remain. Shared marks are tested with React Native, SvelteKit, and TanStack libraries. A mobile geometry check found that a non-breaking space alone could leave an icon orphaned; the preview now groups icon and name in an inline element while preserving exported Markdown and separators. Dimensions, alignment, wrapping between tools, and accessible names without duplication are checked.

Independent reviews of the core, renderer/security, and form found no blocking issues. Contact, location, activity, language, export, storage, and drag regressions remain covered. No new dependencies were added and no README was published to GitHub; its typography and layout may differ from the preview. Screen readers, physical devices, other engines, and remote CI were not reviewed. Automated results do not certify full accessibility. See [ADR 0012](decisions/0012-technology-categories.md).

## Category explanation validation

Iteration on **2026-10-19**: `pnpm check` passed with 506 tests in 22 suites; `pnpm build` passed; 10 focused category flows and **97 Chromium flows passed in the final full run**. The 27 accessibility cases include 49 axe analyses with no violations of the selected rules, now with the guide expanded at 360 px in both languages and themes. `test:a11y` was not run separately.

The “Automatic categories” label, contextual help for all three destinations, nine categories with examples, keyboard opening without modifying the draft, visible destination, and accessible per-option descriptions are checked. An explicit choice takes precedence over catalog classification, custom names are added to the announced location, and focus returns to search. Adding, describing, and announcing use a single resolver; v1, saved assignments, and recovery are unchanged. Focused screenshots of the guide and a Spanish suggestion were reviewed, as was dark mobile with the guide open.

Independent review found no actionable issues. No dependencies or generator changes were added; results remain limited to local Chromium checks and automated analyses, without screen readers or full accessibility certification.

## Custom sections and v2 document validation

Local verification on **2026-10-19** on Windows with Node.js 24.21.0 and pnpm 11.25.0. Browser checks use the production build at `http://127.0.0.1:3000`.

The final full run recorded **114 successful Chromium flows**, including 17 new custom-section cases. The 31 accessibility cases contain 57 axe analyses with no violations of the selected rules; `test:a11y` was not run separately.

| Check        | Observed result                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------- |
| `pnpm check` | Passed: lint, types, formatting, links in 29 Markdown documents, and 589 unit tests in 24 suites. |
| `pnpm build` | Passed; the editor is dynamic and the home page/design system were pre-rendered in EN/ES.         |

The core checks strict v1/v2 schemas, migration without inference, complete mixed references, opaque IDs, immutable operations, deep duplication with new identities, and atomic failures. The adapter preserves the original v1 string, migrates only when v2 is missing, and does not write during recovery or language changes; an invalid v2 does not trigger a silent fallback.

Custom flows include creation, text, lists through the button and `- ` shortcut, Enter and selected-text paste, conversion to text, block ordering, independent copies, hiding, delete confirmation, invalid links, and review of the exact field. They also cover recovery and export, exhausted quota with in-memory continuity across languages, repeated titles or titles matching provisional labels, and long text on mobile. Keyboard dragging preserves selection and hidden positions; Escape cancels without persisting the projection. Browser composition events check that the form does not convert text or consume Enter before composition ends.

The list DOM test verifies that consecutive blocks keep independent lists and numbering from 1, even with empty blocks, untitled sections, and lists in fixed modules. The generator alternates equivalent Markdown markers without adding HTML or invisible content. Preview and download share the same safe output.

Visual review includes configuration and preview at 1600 px desktop and 360 px mobile, in both languages and themes. List items wrap to their content in the reviewed browser, and long titles do not cause horizontal overflow. Heading hierarchy, matching visible text and accessible names, duplicate regions, and navigation-label collisions were fixed.

No new dependencies were added and no README was published to GitHub. Review is limited to local Chromium; activity data still uses controlled responses. Other engines, screen readers, physical devices, the system IME candidate selector, and remote CI were not checked. Automated checks do not certify full accessibility. See [ADR 0013](decisions/0013-custom-sections.md).

### Clarification about bulleted lists

Local iteration on **2026-10-19**: the Spanish interface uses “Lista con puntos” instead of “viñetas.” Options display the `•` and `1.` symbols; EN/ES help examples explain that markers are added automatically and associate them with fields through accessible descriptions. The persisted format and output remain unchanged.

The form and its flow tests passed lint, along with `pnpm typecheck`, `pnpm build`, links in 29 documents, all 9 translation tests, and **18 focused flows** for custom sections and keyboard use. These include the new Spanish case and 8 axe analyses of editing/preview at 360 px in both languages and themes. The mobile screenshot was reviewed. The full 114-case suite recorded above belongs to the earlier closure; it was not rerun for this local correction.

## Custom visual blocks validation

Local validation on **2026-10-19** on Windows with Node.js 24.21.0 and pnpm 11.25.0. Chromium flows use the local production build and a fictional image intercepted by the test; no real external host is requested.

| Check                         | Observed result                                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                  | Passed: lint, types, formatting, links in 30 Markdown documents, and 723 unit tests in 25 suites.                                                                    |
| `pnpm build`                  | Passed; the editor is dynamic and the home page/design system were pre-rendered in EN/ES.                                                                            |
| New focused flows             | 12 passed: selection, editing, errors, recovery, output, copies, focus, keyboard, and mobile.                                                                        |
| `pnpm test:e2e`               | 127 flows passed in the final full run.                                                                                                                              |
| Automated accessibility       | 35 cases include 65 axe analyses with no violations of the executed rules. `test:a11y` was not run separately.                                                       |
| Visual and independent review | 1600 px desktop and 360 px mobile, editing and preview, both languages and themes, with no horizontal overflow. No material open issues in the reviewed integration. |

The core checks the four new variants, earlier drafts, independent duplication, and syntactic HTTPS validation without a network request. Generation preserves escaped text, independent lists, subtitle levels based on the section title, dividers, multi-paragraph quotes, and errors associated with the original field. `customImages` metadata matches the Markdown, preserves ordering and duplicates, is omitted when there are no images, and is never persisted in the profile.

Flows check all eight local samples without image requests or preloaded content, focus when adding or moving, deleting a section that contains only a divider, and literal `- ` prefixes in headings and quotes. An image needs a valid URL and description to be exported; hiding it preserves its data and prevents loading and validation. Preview, copy, and download share the generator output. Clipboard comparisons normalize Windows-specific CRLF line endings.

Tests verify no referrer or optimizer requests, invalid destinations without loading, hostile text without injected images or HTML, and a 404 response with a description and link. Editing another block or the description preserves the failure state without repeating the request; changing the URL allows the new image to load. Review fixed the paragraph and image component identities and the selector's decorative numbers, which now use SVG strokes so accessible names match visible text.

Storage, v1/v2 migration, recovery, quota, language, drag, technology, location, contact, and activity regressions remain. No new dependencies were added. Images remain hosted at the supplied URL; validation does not check DNS, availability, or file type. No README was published to GitHub, and no screen reader, physical device, other engine, or remote CI review was performed. Automated checks do not certify full accessibility. See [ADR 0014](decisions/0014-custom-visual-blocks.md).

## Explicit HTML validation

Local validation on **2026-10-19** with Node.js 24.21.0 and pnpm 11.25.0 on Windows. Flows use Chromium and the production build at `http://127.0.0.1:3000`. Images are intercepted with fictional SVGs; no real external host is requested for testing.

| Check                         | Observed result                                                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                  | Passed: lint, types, formatting, links in 31 Markdown documents, and 840 unit tests in 27 suites.                                                                                   |
| `pnpm build`                  | Passed; the editor is dynamic and the home page/design system were pre-rendered in EN/ES.                                                                                           |
| Focused HTML flows            | 14 passed: editing, examples, recovery, budget, shared output, hostile content, image errors, keyboard, and mobile.                                                                 |
| `pnpm test:e2e`               | 141 flows passed in the final full run.                                                                                                                                             |
| Automated accessibility       | 40 cases include 75 axe analyses with no violations of the executed rules. `test:a11y` was not run separately.                                                                      |
| Visual and independent review | 1600 px desktop and 360 px mobile, editing and preview, EN/ES and both themes, with no horizontal overflow. UI, HTML policy, and integration reviews found no material open issues. |

Pure tests cover the strict v2 variant, reading earlier documents, preserving source and independent copies, malformed HTML and namespaces, removed tags and attributes, entities in URLs, images and accessible names, tables/disclosures, nested controls, and per-block/document limits. UTF-16 ranges identify complete fragments, including Unicode, duplicates, and mixed ordering; a failure returns neither partial HTML nor metadata. Serialization preserves line-break semantics inside `pre` and `code`, compensating for the initial LF in `pre` without mutating the source or sanitized tree.

The pipeline test verifies `skipHtml` and exact ranges, rejecting incomplete, altered, or overlapping metadata. Exported Markdown processed without the custom plugin does not reactivate images, links, or headings from text that looks like Markdown inside HTML. The preview builds React elements from the allowed tree; it does not inject HTML strings or use a global free-form HTML parser.

Browser checks cover nine cards with local samples, initially empty code, examples inserted only by choice with replacement confirmation, EN/ES help, and inspectable exported HTML. Original source and filtered output remain separate through duplication, hiding, and recovery; the six blocks in the budget test explain the aggregate limit and allow the affected field to be focused and corrected. Copy and download match generator output, with Windows clipboard CRLF normalization.

Tests cover centered headings, linked images, tables, disclosures, and code; allowed resources load directly in the browser with lazy/async/no-referrer, without a server optimizer. Scripts, CSS, events, forms, iframes, and inline SVG do not execute code or request their resources. Invalid URLs and missing alternatives block visible output; hiding preserves data and allows the rest. A 404 preserves the link and README; changing another sentence does not repeat the failed request, while changing the URL allows the image to load again.

Review fixed fallbacks with nested controls, accessible link names after a failure, focus added inside links, and outer heading hierarchy affected by headings in a closed `details`. Navigation retains its action name and associates status as a description; visible order and status remain outside the button content so its accessible name matches. The full regression includes pointer/emulated-touch/keyboard dragging, Escape, storage, languages, technologies, contacts, location, and activity.

Three AST utilities with pinned direct versions and HAST types were added: `hast-util-from-html` 2.0.3, `hast-util-sanitize` 5.0.2, `hast-util-to-html` 9.0.5, and `@types/hast` 3.0.5. The known peer warning in the toolchain remains; no services or accounts were added. This delivery does not include the README importer. Review does not include a real GitHub publication, screen readers, physical devices, other engines, or remote CI; automated checks do not certify full accessibility. See [ADR 0015](decisions/0015-explicit-profile-html.md).

## Editor reflow and navigation validation

Local review on **2026-10-19** with Node.js 24.21.0, pnpm 11.25.0, and Chromium against the production build. Split titles and overlapping navigation states were fixed: the title has more room, status and number follow document flow, and ordering controls sit below. The handle remains mounted even when its row is hidden; unmounting it caused the drag library to apply a disabled-button role to the entire entry.

| Check           | Observed result                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`    | Passed: lint, types, formatting, links in 31 Markdown documents, and 840 unit tests in 27 suites.                                                                               |
| `pnpm build`    | Passed; the editor is dynamic and the home page/design system were pre-rendered in EN/ES.                                                                                       |
| `pnpm test:e2e` | 193 flows passed in the final full run, including 52 new cases.                                                                                                                 |
| Reflow          | At 320, 360, 768, 1024, 1280, 1440, 1657, and 1920 px, both languages and themes showed no horizontal document overflow in the checked cases.                                   |
| Enlarged text   | 32 px root size at 320 and 1280 px, EN/ES: navigation, five fixed forms, custom sections, and preview. Text and measurements scale in rem; native browser zoom was not checked. |
| Accessibility   | Axe analyses found no violations of the executed rules; keyboard, focus, accessible names and descriptions, errors, and inclusion were reviewed.                                |

The matrix checks seven included sections, long titles with and without spaces, geometric separation between title and status, and navigation targets of at least 44 px. It verifies an invalid URL before correction, excluding the active section without disabling its checkbox, preserving text between editing and preview, and using Tab to add another section within scrollable navigation. Custom blocks adapt to their panel width; editor columns also respond to text size. Buttons, headings, legends, and long URLs wrap without widening the document.

Screenshots were inspected for the original desktop layout at 1657 px, mobile configuration at 360 px, the matrix, and enlarged text. Independent integration review found no blocking defects. The full regression retains pointer, emulated-touch, and keyboard dragging, Escape, languages, saving, export, HTML, technologies, location, and contact. The document, generation, and dependencies are unchanged.

Results apply to local Chromium and controlled data. Real screen readers, physical devices, other engines, native zoom, or resizing during an edit with active focus were not checked. Automated checks and visual review do not certify full accessibility.

## Top navigation and internal tools validation

Local iteration on **2026-10-19**. The previous review checked horizontal reflow, but not reaching fields within a phone's usable height. This iteration replaces the side-by-side layout with a top bar and collapsible organizer, reduces the mobile header, and reveals samples through “Add block.”

| Check                      | Observed result                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm check`               | Passed: lint, types, formatting, links in 32 documents, and 840 unit tests in 27 suites.                  |
| `pnpm build`               | Passed with final code. The internal design system is absent in production; EN/ES return 404.             |
| `pnpm test:e2e`            | 206 Chromium flows passed in the final full run, with no exclusions.                                      |
| New regressions            | 16 cases for top navigation, field reachability, organization, blocks, focus, and mobile touch emulation. |
| Final documentation review | `git diff --check`, `pnpm format:check`, and `pnpm docs:check` passed.                                    |

The first field is checked without scrolling the page at 320 × 568, 360 × 640, and 390 × 844 in both languages. The matrix covers widths from 320 to 1920 px, both themes, and a 32 px root size. Two contexts with `isMobile` and `hasTouch` check editing, navigation, draft preservation, and axe analyses. Initial and open-panel screenshots were reviewed. The automated rules run found no violations.

Flows include twenty sections, editing from the end of twelve blocks, a height-limited organizer, focus returning on close, consecutive selection with arrow keys, and drag cancellation. The native selector preserves focus; switching between editing and preview reveals its start. Export, storage, HTML, technology, contact, and activity regressions remain.

Changing languages preserves repeated query parameters, normal, encoded, or empty hashes, history, and focus across twelve transitions. Duplicate hashes on cached Next.js 16.4 routes were fixed using the public History API, without reloading the page or using private router state.

The design system returns 200 in EN/ES on a separate development server and 404 in production; it does not appear on the home page or public navigation. `pnpm test:e2e:ui --help` completed successfully; Playwright's graphical interface was not opened during this validation. Storybook and new dependencies were not added. See [ADR 0016](decisions/0016-top-navigation-and-internal-tools.md).

Verification is limited to local Chromium and emulation: it does not include physical devices, the mobile system keyboard, Safari, real screen readers, or native browser zoom. It does not certify full accessibility. Changes remain local, with no commit, push, or deployment.

## Horizontal section row validation

Local iteration closed on **2026-10-20** with Node.js 24.21.0, pnpm 11.25.0, and Chromium against local production. Sections remain in a single top row without opening an organizer. Each item provides a checkbox, name, and handle; a pair of arrow buttons orders the active section. Items that do not fit can be reached through horizontal scrolling within the row, without widening the page.

| Check               | Observed result                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm check`        | Passed: lint, types, formatting, links in 33 documents, and 840 unit tests in 27 suites.     |
| `pnpm build`        | Passed with final navigation and focus-restoration code.                                     |
| Final focused flows | 33 passed: navigation, first mobile field, enlarged text, ordering, focus, and cancellation. |
| `pnpm test:e2e`     | 208 flows passed in the final full run, with no exclusions (4.5 minutes).                    |

The top-navigation regression contains 18 cases and checks 320 × 568, 360 × 640, and 390 × 844; EN/ES; twenty sections in one row; long names; selection that preserves focus; inclusion and hiding without losing the focused control; emulated touch; and a 32 px root size. Actions wrap with enlarged text and do not overlap. Mobile screenshots and the 1657 px desktop layout were inspected.

Keyboard cases check one scroll step per arrow, movement beyond the initially visible area, direction reversal, opposite arrows within the same task, pick up and drop without moving, and Escape without persisting the projected order. A long edit keeps `scrollY` when picking up, moving, and canceling; focus returns to the handle without scrolling the page. Test setup uses `focus({preventScroll:true})` to isolate the gesture from native focus navigation.

Review fixed hidden text escaping the container, scrolling between pointerdown and pointerup, revealing controls with enlarged text, and restoring the library's focus. Global overflow is not hidden and the dependency is unchanged. Axe analyses found no violations of the executed rules. Independent reviews closed with no actionable findings. See [ADR 0017](decisions/0017-horizontal-section-navigation.md).

The document, persistence, and README generation are unchanged, and no dependencies were added. Automated accessibility checks are not a complete review; physical devices, Safari, the mobile system keyboard, screen readers, and native zoom remain untested. Changes remain local, with no commit, push, or deployment.

## README import with backup validation

Local delivery on **2026-10-20** with Node.js 24.21.0, pnpm 11.25.0, and Chromium against local production. It supports pasting or opening UTF-8 `.md`, reviewing sections, and confirming with a single local backup of the previous profile and original source. The panel loads on demand. See [importer usage](editor.md#import-an-existing-readme) and [ADR 0018](decisions/0018-readme-import-with-backup.md).

| Check                             | Observed result                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm check`                      | Passed: lint, types, formatting, links in 34 documents, and 909 unit tests in 29 suites. |
| `pnpm build`                      | Passed with final code.                                                                  |
| `pnpm test:e2e`                   | 229 flows passed in the full run, with no failures or retries.                           |
| Importer against the latest build | 21 flows passed in EN/ES.                                                                |

The full suite ran before extracting session cleanup into a module function to satisfy lint; behavior did not change. After the extraction, the app was rebuilt and all 21 importer cases were rerun against the final artifact. An earlier run that was intentionally interrupted is not counted as full validation.

Tests checked UTF-8 source with BOM/CRLF, cancellation and exclusions without writes, edits that invalidate the proposal, inert HTML, download and restore, protected data and v1, quota and read failures, explicit in-memory choice, language switching, debounce, and `pagehide`. Closing and reopening preserves source and selection without resuming confirmation; completing an import or restore clears that session. The full regression includes existing horizontal navigation, dragging, technologies, and export.

The four mobile accessibility cases for the importer review source, review, and confirmation at 320 × 568 in EN/ES and light/dark themes, with twelve axe analyses finding no violations. There are 22 local screenshots; desktop and mobile samples, including the backup, were inspected. Independent integration review found no blocking defects. Coverage is Chromium and emulation: physical devices, Safari, screen readers, and native zoom remain untested; this does not demonstrate full accessibility or compatibility with every README.

Input is converted into custom sections and uses the existing HTML policy. Relative paths, anchors, and incompatible formats require correction or deliberate exclusion. There is no general JSON import, automatic classification into modules, AI, or remote history. Changes remain local, with no commit, push, or deployment.

### Fix for HTML section detection

Detection was adjusted after receiving a README that combined HTML headings, a Markdown list, icon links, and statistics images. The parser now recognizes top-level HTML headings with explicit closing tags and keeps the initial header together. An H2 used as an opening sentence does not disable later splitting by H3. Uncertain structures remain grouped as HTML; fixed modules are not inferred.

Local inspection of the provided case changed it from one generic section to three sections with headings: header, links, and tools. Output retained 19 images, 18 links, and four strong-emphasis spans, with ranges covering the original exactly. The H2 opening-sentence variant and a file with BOM/CRLF were also inspected. BOM-related offset drift was fixed, and another paragraph is no longer introduced around HTML links separated by blank lines.

This fix has direct parser inspection and independent review, with lint, types, formatting, documentation links, and build passing. No test suites were added or run in this iteration. The results of 909 unit tests and 229 earlier flows belong to the previous delivery, not to a regression run for this change.

## Code blocks, source editor, and custom formatting validation

On October 20, 2026, literal code blocks, CodeMirror for HTML/code, and level/alignment controls in custom sections were integrated. The contract and its limits are recorded in [ADR 0019](decisions/0019-code-and-formatting.md); usage is covered in the [editor guide](editor.md).

Results run against the integration:

- `pnpm check`: lint, types, formatting, links in 35 Markdown files, and 993 unit tests in 35 suites passed.
- `pnpm build`: production build passed with final product changes.
- `pnpm install --frozen-lockfile`: reproducible install passed, with no exceptions to the minimum package-age window.
- Focused Chromium flows: 41/41 passed, with 15 new cases and 26 HTML/visual-block regressions.
- Full responsive group: 52/52 passed, from 320 to 1920 px, EN/ES, light/dark themes, and text at 200%.
- Full Chromium regression: 244/244 in 4.8 minutes against the same production build. Since that build, only the responsive expectation changed from nine to ten options; the product did not change.

Tests verified literal code without execution or image requests, local highlighting, focus and Tab, indentation and HTML closing tags, source with BOM/CRLF, copying/downloading the same Markdown, import with a language, recovery, independent duplication, and hiding. History covers both editing modes, paste, and line-break-only changes. Formatting preserves earlier defaults and the explicitly chosen level when an optional title is removed.

Review fixed lost undo history when switching modes or pasting, normalization when copying snippets, a heading level without a title, and accessible-name and scroll-area issues. Keyboard and axe checks were retained; local code groups do not create duplicate landmarks. The responsive regression needed its selector expectation updated from nine to ten options to include Code, while preserving the other assertions.

Desktop and mobile were visually reviewed in both themes and languages: the first field was reachable at 320 × 640, navigation was horizontal, and code scrolled within its container. The axe scenarios run found no violations. Calculated contrast for syntax colors exceeds 5.72:1 on the light surface and 7.32:1 on the dark surface. Automated review and screenshots do not replace a full screen reader assessment or tests on physical phones.

The build manifests and loaders keep CodeMirror and grammars out of the editor's initial JavaScript; highlighting is requested on demand. This bundle inspection is not a network performance measurement or a comparison with an earlier version. Full visual parity with GitHub and authenticated activity configuration were not verified; their existing operational requirements remain.

## Highlighting, Presentation, and clear action validation

On October 20, 2026, highlighting coverage was fixed, the explicit example was changed to JSON, visual formatting was extended to Presentation, and a confirmed “Clear README” action was added. The v1 schema remains closed; v2 preserves absent options during recovery. See [ADR 0020](decisions/0020-presentation-formatting.md) and the [editor guide](editor.md).

- `pnpm check`: 1,121 tests in 40 suites, lint, types, formatting, and links in 36 Markdown files passed.
- `pnpm build`: production build passed.
- `pnpm install --frozen-lockfile`: passed, with no exceptions to the minimum package-age window.
- Focused Chromium flows: 53/53 passed against the final build.
- Full Chromium regression: 264/264 passed in 5.4 minutes against that same build, with no exclusions or retries.

Pure tests cover all catalog languages, aliases, C#, JSONC, PHP with/without a tag, and lexical highlighting of GraphQL. Color does not validate or execute code. Markdown and PHP use official CodeMirror grammars loaded lazily; other languages reuse pinned packages and local modes.

Independent review checked protected storage, pending edits, compatibility, escaping, and the shared HTML budget. The semantic hierarchy of a small first heading in the preview was also fixed without changing its level or exported Markdown. The notice for clearing only in memory is shown as a note and announced through one stable region.

The first regression found that the global button added 24 px and left part of the first custom field outside the 320 × 568 viewport. Mobile header spacing was made more compact while keeping 44 px buttons and the desktop layout. EN/ES cases and screenshots were rerun against the corrected build without relaxing the first-field check.

Screenshots were inspected for C# on desktop, centered Presentation on mobile, and the clear button at 320 × 568. Tests use isolated contexts and do not clear the user's actual draft. Automated accessibility review does not replace a full assessment with screen readers or physical devices.

## Project files and recovery validation

On October 20, 2026, downloading and opening complete JSON projects, inert review, confirmation, and a backup independent from the active profile were added. See [ADR 0021](decisions/0021-project-files-and-recovery.md) and the [Project flow](editor.md#save-and-open-projects).

- `pnpm check`: 1,202 tests in 42 suites, lint, types, formatting, and links in 37 documents passed.
- `pnpm build`: passed with final backup protection and mobile review.
- Focused Chromium flows: 63/63 passed against the final build.
- Final full Chromium regression: 297/297 passed in 4.8 minutes, with no exclusions or automatic retries.

The 4 MiB UTF-8, depth and complexity contracts, v1 migration, field/source preservation, and recovery were reviewed. Independent review found two issues that were fixed: an accepted compact file could exceed the limit when saved again with indentation, and the in-memory notice could promise a backup that did not exist. Output uses compact formatting when needed, and the notice now conditions recovery on availability. The complexity limit is also applied before validating a corrupted local backup.

Visual review found the fixed bar overlapping long project reviews. While Project is open, the row keeps its normal position; when it closes, the editor behavior returns. The mobile test checks that review/confirmation headings are reachable before interacting.

Validation uses fictional profiles in isolated contexts and local production on port 3100. Credentials and the card origin are empty only in that process to avoid real authenticated queries; environment files and the service on port 3000 are not changed. Early failed attempts due to browser cache or sandbox network permissions occurred before navigation and are excluded as product evidence. No dependencies or services were added.

The first full run finished with 296/297 cases passing: Chromium reported `ERR_NO_BUFFER_SPACE` while loading a chunk, and that context did not hydrate. The case passed in isolation without changes; then the entire suite was rerun, with 297/297 passing against the same product. Assertions preserve write order and full content, comparing JSON objects rather than property order.

The 33 new cases cover downloading the current document, reviewable opening, confirmation, backup and restore, v1, UTF-8 and incompatible files, inert review, quotas, protected storage, pending saves, and late reads. Desktop and mobile EN/ES screenshots, light/dark themes, the first field at 320 × 568, and review/confirmation focus without overlap were checked; executed axe analyses found no violations. This evidence is from Chromium and emulation; physical devices, Safari, and a full screen reader assessment remain. The local draft does not sync tabs, and the previous profile must fit the contract to be backed up. Changes are local, with no commit, push, or deployment in this delivery.

## Token owner activity validation

On October 20, 2026, the owner view rejection was fixed using `isViewer`, while preserving accepted scopes and public filters. See [ADR 0022](decisions/0022-token-owner-public-activity.md).

- `pnpm test src/server/github src/core/activity`: 112 tests passed across five suites. They include a confirmed owner, incorrect identity, missing flag, broad or unverifiable credentials, and exclusion of candidates and private/internal repositories from both views.
- `pnpm lint`, `pnpm typecheck`, and `pnpm build`: passed. Focused formatting, documentation links, and diff whitespace review also passed.
- Real authenticated query: HTTP 200 for the owner using their own token and for a public control account. The snapshot omits `isViewer` and `userViewType`.
- All three owner cards returned HTTP 200, passive SVG, and `ready` state.
- Chromium in Spanish with isolated storage: query succeeded, options were initially unchecked, three images loaded, and there were no page errors. Browser requests for activity and cards do not include the provider's authentication header.

The local server was restarted with development configuration. `APP_URL` remains empty: querying and preview work, while copy and download with cards remain blocked until a public HTTPS origin is configured. This check does not publish the application or modify the actual draft; routine tests keep controlled responses and do not require the real credential.

## Customizable card family validation

On October 20, 2026, Overview, monthly activity, and two designs adapted from GitHub Stats Extended were added, with optional theme, palette, layout, and width. See [ADR 0023](decisions/0023-customizable-activity-cards.md). No dependencies, services, scopes, or credentials were added.

- `pnpm lint`, `pnpm typecheck`, and `pnpm build`: passed. Type generation and build must run outside the Windows sandbox to load the existing SWC binding.
- Focused Prettier, links in 39 documents, and `git diff --check`: passed.
- Local inspection with real public data: 42 combinations of seven cards, three layouts, and two themes returned HTTP 200, `ready` state, and passive SVGs. No text extended beyond the viewBox. Screenshots of Overview, monthly activity, and both Extended designs were inspected.
- Routes rejected invalid language, theme, palette, or size, duplicate parameters, and an arbitrary URL with HTTP 400.
- Isolated Chromium: seven options initially off; the four new cards could be selected, customized, loaded, saved, and recovered. Reset removed only `appearance` and retained username and selections. No page errors or provider authentication headers appeared in browser requests.
- EN/ES review on desktop and an emulated 390 × 844 phone: no horizontal overflow; controls were reachable by scrolling, and Tab moved from theme to palette. The username field started below the viewport when the long section opened, so the entire form is not claimed to be visible without scrolling. This is not a physical-device test or a complete accessibility audit.

The full MIT license from the pinned Extended revision was preserved, and contract and SVG changes were reviewed independently. No test cases were added to the suites, and the full unit or E2E suites were not run for this expansion; focused local scripts and static checks do not replace them. `APP_URL` is still needed to export cards from a public origin; the local integration uses the existing development token.

## Public Extended suite and MIT validation

On October 20, 2026, adaptations expanded to all five Extended families: statistics, languages, repositories, Gists, and WakaTime. The changes added 18 counters, an optional ranking that is off by default, five language layouts, filters, weights, 79 themes, and advanced appearance options. Scope and differences are recorded in the [compatibility matrix](github-stats-extended.md) and [ADR 0024](decisions/0024-extended-public-suite-and-mit.md). The owner authorized MIT with `Copyright (c) 2026 Juan Nicolas Herrera`; the license, metadata, and notices were added without new dependencies.

- `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm docs:check`, and `pnpm build`: passed. Links in 42 Markdown documents were checked. Types and build must run outside the Windows sandbox to load SWC. An initial formatting check caught the matrix while it was still being edited; it was formatted, and the final check passed.
- `pnpm licenses:check` and generation during the build: passed for 597 installed versions and 224 runtime dependency roots. 2,326,553 bytes of notices were retained. There are 20 warnings for packages without a root license/notice file, with context available in the inventory; this is not a completed legal review or a binary artifact ready for redistribution. See the [open-source distribution guide](open-source.md).
- Real queries using the development token: basic statistics and selection of all 18 counters for `juannh`, including historical data and ranking, returned HTTP 200. A public repository, public Gist, and public WakaTime statistics returned valid snapshots. Missing or partial results retain their state; this query does not verify every filter or account.
- Focused inspection of 13 SVG variants and all 79 themes: HTTP 200 and `ready` state, with no active resources, text outside the viewBox, or detected text overlap in the variants. Screenshots of statistics, language ring, and repository cards with all five contribution counters were reviewed.
- Six different public repositories requested concurrently returned six `ready` cards after adding the shared queue. Eight invalid inputs—unknown or duplicate parameters, null weights, arbitrary destinations, contributions without a username, and WakaTime alias `current`—returned HTTP 400. An old React identifier was rejected due to a redirect; it was retried with the current identifier without relaxing identity validation or allowing redirects.
- Isolated Chromium: 20 checks passed in EN/ES. They include ranking off, no queries on open/input, editing options in a different order without losing images, invalid lists/gradients that preserve valid configuration, save/recovery, and three resources without a GitHub profile username. No page errors or provider Authorization headers appeared in browser requests.

Independent review fixed canonical option serialization, visible defaults, removal of the optional relationship filter, dates and states for repository contributions and their text alternative. Immediate rejection of a fifth query was replaced by a bounded shared queue, and each card was limited to its own data to avoid queries for another disabled card. Final review of these changes found no new actionable issues.

Mobile review used 390 × 844 emulation, with no horizontal overflow and deep controls reachable by keyboard. The initial field started at `y=931`, below the viewport, measured before focus or scrolling; scrolling down is required. Resource screenshots on desktop and mobile focus were inspected. Full accessibility or coverage of physical devices, Safari, or screen readers is not claimed.

No unit or E2E suites were added or run for this expansion. Temporary scripts and screenshots are in ignored `work/`; focused checks do not replace a full regression. `APP_URL` remains empty in development: local preview and queries are available, while copy/download with cards are blocked until a public HTTPS origin is configured. The actual draft was not modified, and no commit, push, or deployment was made.

## Resolved notices and card updates validation

On October 20, 2026, the previous state was published first in `6df0e2817f7d953731ea56897c58011c561ee020`, as requested. Then the twenty dependencies missing a root notice and the card that appeared to disappear when counters were added or removed were reviewed.

The review retains 27 official copies and a catalog of 62 exact name/version pairs, including platform variants. The twenty missing notices in the installed tree have documented resolutions, and the checker finishes with zero warnings and zero issues for 597 versions and 224 runtime roots. The inventory is 2,403,835 bytes. Three upstreams do not provide an original copyright line: their declarations and context are preserved with separate reference terms, without inventing rights holders. `keyv@4.5.4` is identified as a local remnant absent from the current lockfile. See the [package-by-package resolutions](open-source.md#resolving-missing-file-notices).

The checker requires no network and fails when a new absence has not been reviewed for the exact version, source/context hashes change, npm integrity differs, or a license is incompatible with the reviewed version. Five local negative probes confirmed these rejections. Git preserves the original bytes and whitespace of notices through specific attributes; third-party text style was not corrected, and dependencies and the lockfile were not modified.

Real reproduction with `juannh`, ranking enabled, and four selection changes returned HTTP 200 and valid URLs. The image became blank while the new response loaded. The fix keeps the last image for the same identity, indicates that an update is in progress, and switches to the new loaded node without a second download. It discards late responses and the previous image when the username, type, or destination changes. Failures have an accessible retry. Markdown always keeps the URL from the current configuration.

- `pnpm check`: license checks, lint, type generation, TypeScript, formatting, links in 42 Markdown files, and 1,280 tests in 46 suites passed.
- `pnpm build`: production build passed, including generation of the final inventory.
- Five focused E2E flows passed with controlled responses: add/remove down to one counter, selection order, ranking, recovery, out-of-order responses, returning to a prior configuration, one download even with `no-store`, errors, retry, and separation of profile and resource identities.
- The initial production checkpoint regression passed all 297 flows. The full regression for the corrected build finished with 302/302 passing in 6.5 minutes, with no exclusions or automatic retries.
- Four focused visual flows in production: EN/ES, 1440 × 1000 desktop, and 390 × 844 emulated mobile. Eight update/error screenshots were inspected: previous image visible, readable messages without overflow, retry reachable with Tab/Enter and visible focus, and no page errors.

Independent review found that UI messages inherited the README language when it differed from the editor. The editor language was applied to the state and button while preserving the content language; both EN/ES cross-language cases are covered. No other actionable issues remained in code or license closure.

Checks use isolated contexts and local production on port 3100, with credentials and public origin empty only in that process. They do not alter the actual draft or development configuration. Screenshots and probes are in ignored `work/`. Linux was not run, and a container or native-component closure was not certified; the catalog does verify its current variants against official sources. Emulation and automated checks do not replace physical devices or a full screen reader assessment.

## Incremental queries and rapid changes validation

On October 20, 2026, the Extended cache was optimized by field and effective filters. The preview batches changes for 400 ms, preserves the valid image, and keeps the current document and Markdown. Initial loading and retry remain immediate. A case where the first image completed during another selection and could remain permanently “Loading” on return was also fixed. See [ADR 0025](decisions/0025-activity-data-cache-and-preview-batching.md).

Measurements with controlled GitHub responses:

- Initial statistics, removing/reordering counters, changing the icon, and enabling ranking: three requests total, all from the initial load; later edits do not add GitHub requests.
- Adding merged PRs to that coverage: one additional search query, without repeating identity, repository, or earlier counter requests.
- Initial languages, five layouts, hiding, formatting and weights, then stars: two requests total from the initial load.
- Four simultaneous requests with overlapping selections: four calls total.
- Three rapid browser changes: one additional final SVG request; none in between or before 400 ms after the last change. Returning to an already loaded configuration before the delay adds no requests.

Checks run:

- Final `pnpm check`: license checks, lint, type generation, TypeScript, formatting, links in 43 Markdown documents, and 1,310 tests in 48 suites passed. It includes 26 new Extended cases, one additional queue case, and three for the year shown in SVG.
- `pnpm build`: production build passed.
- Ten focused E2E flows passed: bursts, cancellation on return or hide, minimum of one counter, recovery, ordering, late responses, success/error before initial load, immediate retry, and identity/language separation.
- Four focused visual flows in local production, EN/ES, 1440 × 1000 desktop/390 × 844 emulated mobile: no overflow or page errors, previous image visible, keyboard retry, and visible focus. Screenshots of Spanish mobile during update and English desktop with error/focus were inspected.
- Local smoke test with real public data for `juannh`: four JSON selections, a statistics card, and a language card returned HTTP 200; SVGs reported `ready` and retained cache headers. Individual localhost timings are not considered a benchmark.

Server regressions cover null/partial coverage, original freshness and age, 24-hour window, filters, periods, eviction from the combined 512-entry limit, nonexistent users, A→B→A token rotation, and late success after global credential invalidation. The queue and network inherit the remaining duration of the 60-second Extended request; different UTC periods are not mixed. Independent review found no open issues.

The first full production regression finished with 307/307 flows passing in 7.3 minutes. Later review added two server cases: UTC year changing while waiting in the queue and data expiring during that wait. The plan is recalculated when work starts. Three pure EN/ES cases also verify that the implicit commit year comes from the time interval even if another counter has an earlier date; an explicitly selected year takes precedence. All 36 focused tests in these areas passed.

The final build passed the full regression again: 307/307 flows in 7.1 minutes, with no exclusions or automatic retries. The four visual flows and real local smoke test were also repeated successfully.

Production tests use port 3100 with the token and public origin empty only in that process, isolated contexts, and controlled responses. The real smoke test uses the existing development server without revealing its credential or changing the draft. No dependencies were added. Local cache and quotas remain per-process and do not replace shared infrastructure.

For future deployment, [Vercel Hobby](https://vercel.com/docs/plans/hobby) and its [function limits](https://vercel.com/docs/functions/limitations) were checked: the free plan requires non-commercial personal use and has quotas; Fluid allows up to 300 seconds, while a Hobby function without Fluid defaults to 10 seconds and can be configured up to 60. Card configuration and combined duration for resources and contributions must be reviewed before publishing. GitHub App and production infrastructure are deferred to a later stage.

## Visual selection and explicit query validation

On October 20, 2026, automatic queries for new configurations were replaced with selection through ten local CSS thumbnails and “Search and show cards.” The basic search for suggested contributions became a separate optional action. The README language moved to the configuration header above the form. See [ADR 0026](decisions/0026-explicit-card-loading-and-local-samples.md).

`ReadmeResult.activityCards?` derives the exact URLs alongside the Markdown. The editor approves the latest batch of canonical local routes in memory only; new changes show samples without linking to the endpoint. Replacing, restoring, or clearing the profile revokes that approval. The document and export conditions do not change.

Checks run:

- `pnpm check`: license checks, lint, type generation, TypeScript, formatting, links in 45 Markdown documents, and 1,317 tests in 50 suites passed. Seven new cases protect exact/missing metadata, literal code, and URL validation/deduplication.
- `pnpm build`: production build passed.
- 24 focused activity E2E flows passed, plus two repetitions with geometry and accessible-name assertions during loading. They cover ten selected types with no prior queries, final batch, recovery, changes to counters/language/destinations, optional search, a project with identical URLs, deletion and selecting the same card again, errors, retry, late responses, and identities.
- Six new language E2E cases: EN/ES at 320 × 568, 390 × 844, and 1440 × 1000. Before focus or interaction, the full control was measured within the viewport and above the title; focus, HTML language, saving, no queries, and no overflow were checked. An initial static check found a test variable shadowing `document`; its name was fixed and the final check passed.
- Four visual selection/loading/error/retry flows passed in development and production, EN/ES and desktop/emulated mobile. The approved sample measured 308 px in a 390 px viewport; there were no page errors or overflow. Spanish screenshots of desktop selection and mobile loading were inspected.
- Smoke test with `juannh` and the existing development credential in an isolated context: no card or JSON requests before apply; one SVG returned HTTP 200 with `ready` afterward, without an additional basic query or provider authorization header in the browser.

Independent review found a link without a name while the first image remained hidden and a possible collapsed sample width. An accessible name and a validated width capped by the container were added; tests with a held response checked both. Stubs use controlled data; initial failures in two network assertions were adjusted to allow legitimate browser reuse without relaxing the requirement that a new configuration wait for the button.

The first full regression found nine geometry failures: seven from overflow with text enlarged to 200%, and two because the first custom field was partly outside 320 × 568. The language group width was capped and the mobile header was made more compact: the position counter remains accessible to screen readers and actions beside the title use named icons with 44 px targets. All eight focused flows for forms with enlarged text, the other thirteen language/navigation/project cases, and four repetitions at 320 × 568 and with 200% navigation passed while retaining the original viewport assertions. The Spanish screenshot shows the entire first field before any interaction. The final `pnpm check` passed again with 1,317 tests.

The final build passed 316/316 local production flows in 7.2 minutes, with no exclusions or automatic retries. The four visual flows and real smoke test with `juannh` were repeated successfully. Final code review, mobile screenshots, and hosting guide review found no actionable issues. Measurements are from Chromium and emulated phones; they are not a Vercel load test or a full accessibility assessment.

Production tests use temporary port 3100, with token and origin empty only in that process. The actual draft is not changed and no dependencies are added. The [API, credentials, and hosting guide](github-api-and-hosting.md) retains the official sources consulted and distinguishes visitors, the shared PAT quota, per-process cache, and Hobby quotas; no GitHub App or production infrastructure was created.

## Centralized search and independent scrolling validation

On October 20, 2026, an in-memory cache for public data was integrated into the editor. Search groups JSON sources, loads only missing or expired coverage, and shows progress by data item and card. Preview generates local SVG images with the same pure renderers as public routes; changing appearance, language, order, or a covered selection does not make SVG or JSON requests. Markdown retains its current dynamic URLs and export conditions. See [ADR 0027](decisions/0027-browser-activity-data-cache.md).

The cache preserves original dates, queried null/partial data, and keys based on effective dependencies, without using localStorage. It has 30-minute freshness, earlier results capped at 24 hours, a limit of 512 entries and 8 MiB of data, a memo of up to 100 SVGs, and three simultaneous JSON requests per editor. Resetting or replacing the document cancels and invalidates earlier generation. A five-second clock difference is tolerated; larger future dates are rejected. No endpoints, dependencies, or credentials were added.

Configuration and preview have independent native scrolling on desktop when there is enough height. Phones, enlarged text, and short screens retain natural document flow. Scrollbars use design tokens and rounded thumbs; forced colors retain their native appearance. See [ADR 0028](decisions/0028-independent-editor-scroll.md).

Checks run before the full regression:

- `pnpm check`: license checks, lint, types, formatting, links in 47 documents, and 1,350 tests in 51 suites passed. The 33 new cache cases cover batching, missing data, visual options, original freshness, UTC/years, nulls, memory, sizes, concurrency, errors, retries, and cancellation.
- `pnpm build`: final production build passed.
- 33 focused activity E2E flows: 31 in the latest combined run and two new ones repeated after fixing their mocks. They include ten families, five first-party cards using one JSON request, combined Extended, customization without HTTP, TTL, clear/import/project, late responses, partial errors, retrying only the failed source, and retrying Blob decoding without querying the provider. The skeleton uses `skeleton-pulse` when motion is allowed and `none` when reduced motion is requested.
- Seven scroll E2E flows and two mobile repetitions passed: independent wheel/PageDown, focus on deep fields, 320 × 568 measured before interaction, 200% text, short height, and forced colors. Spanish desktop and phone screenshots with the first field fully visible were inspected.
- Isolated real smoke test with `juannh`: four initial cards through two JSON requests; theme and palette changes required no additional network call; adding followers requested only that counter in a third JSON request. Zero HTTP SVG requests, zero provider Authorization in the browser, zero page errors, and snapshots stayed outside the draft. A screenshot of both columns after editing was inspected.

Independent review fixed three cases: repository metadata remains visible if contributions fail; earlier generation responses no longer invalidate a later recovery; and the memo removes counters whose stale supplement exceeds 24 hours even if their references do not change. Regressions for these races and expiry passed. Some initial E2E attempts used expired dates, assumed ranking had not loaded followers, or scrolled only the window; they were adjusted to the contracts and independent scrolling. The Blob failure is held until explicitly released to account for both Strict Mode effects in development.

The first full regression finished with 331/332 passing; the only failure expected Ctrl+Home to scroll the window after download, when focus was in the column. The check now verifies the top of the column and resets the page only for the screenshot; it passed along with the equivalent copy/download flow. Visual review also found that scrolling a selected heading into view could crop the language control on desktop: returning to the full header was unified when switching sections or selecting one again, preserving focus and mobile behavior. Thirteen focused scroll/language flows and two active-navigation repetitions with header measurements passed. Subsequent `pnpm check` and build passed again.

Four visual flows on the final build, EN/ES and 1440 × 1000 desktop/390 × 844 emulated mobile, checked progressive loading, error, focus and retry with Enter, later success, and no overflow/page errors. Each flow made three controlled JSON requests and zero HTTP SVG requests. Spanish mobile loading, Spanish desktop error with focus, and a real query with both columns were inspected.

The full regression on the final build finished with **332/332 passing in 6.4 minutes**, with no exclusions or automatic retries. The four visual flows and real `juannh` smoke test were repeated successfully. The temporary instance confirmed `not_configured` without a token and was shut down afterward; the development editor continued to return HTTP 200.

Test production uses port 3100 with token and public origin empty only in that process; the real smoke test uses the existing development server without reading its secret or altering the actual draft. Chromium and phone heights are emulated; this does not certify full accessibility, physical-device behavior, or Vercel capacity under heavy traffic.

## Search for an account before choosing cards

The October 20, 2026 review asked to place Search below the username and load data before choosing components. [ADR 0029](decisions/0029-account-first-activity-search.md) was implemented: the first action prepares basic and Extended data by default, even without cards; later selections reuse coverage and batch missing data for 300 ms. A new username requires Search. Selected and applied resources can load after the first action; a new repository-contribution author requires an explicit search. The publication notice moved to the export area, retaining its export block and the option to exclude cards without clearing their configuration.

Checks run:

- `pnpm check`: license checks, ESLint, types, formatting, links in 48 documents, and **1,360 tests in 52 suites** passed. The first type-generation attempt hit a Windows sandbox block on the native SWC cache; it passed when repeated outside the sandbox without changing dependencies.
- `pnpm build`: production build passed.
- **37/37 activity E2E flows** passed against development, followed by **2/2 focused cases**. The resulting activity suite has 38 cases: search without cards in EN/ES, button geometry, data ready when selecting, grouped automatic fetches for missing data, a different account with no queries until Search, errors without loops, partial results without cards, and the notice in export with copy/download blocked.
- Three additional flows passed: Spanish screenshots at 1440 × 1000 desktop and 390 × 844 emulated mobile with loading and cards; a real `juannh` query from zero cards using Enter. Two JSON requests prepare the data; selecting four cards adds no requests; followers adds one JSON request for that counter. Zero HTTP SVG requests, zero provider Authorization in the browser, zero page errors, and snapshots outside the draft. Screenshots were reviewed.

The full local production regression finished with **336/337 passing in 7.1 minutes**. The contact case failed before editing, while waiting for the editor to enable. The trace identified a failed download of runtime `turbopack-3-ry682tkyiqk.js` with `net::ERR_NO_BUFFER_SPACE`: 16 HTTP 200 requests, one failed script without an HTTP response, zero recorded application errors, and zero API queries. The page remained at the initial HTML; the trace does not establish the precise cause of resource exhaustion. The same case was rerun three times with the same build and server: **3/3 passed in 13.4 seconds**, without code changes or longer waits. Evidence of the environment failure is retained and is not presented as a clean full run.

The changes retain the documented per-process cache, shared quota, and infrastructure limitations; no Git publication or deployment was performed.

## Preload all 18 counters

The follow-up clarification asked to load all counters during Search, including those not selected. Earlier preloading covered only six default metrics. [ADR 0030](decisions/0030-all-profile-counters-prefetch.md) was implemented: all 18 counters, basic data, and languages are prepared for the current period and filters, even without cards. Independent destinations retain their explicit selection. Successful results with null, partial, or truncated data are reported without retrying when checkboxes are selected.

Checks run:

- **52 focused cache and session tests**: coverage of all counters, filters/year without selection, no network traffic from checkboxes/order/ranking, grouped new scopes, and no continuous retries. Includes maximum visual settings with Unicode names whose full URL exceeds the limit: seeds retain only data filters, remain valid, and do not lose scope. The derived percentage is also marked partial when merged PRs exceed total PRs.
- `pnpm check`: license checks, lint, types, formatting, links in 49 documents, and **1,369 tests in 52 suites** passed. One attempt coincided with notice regeneration by `pnpm build`; it was rerun sequentially after that write finished and passed. The notices file, manifest, and lockfile did not change.
- **40/40 activity E2E flows passed in 1.9 minutes** in the final rerun. The earlier run had a role-order comparison incompatible with the API's canonical sorting; it was changed to set equality and the full suite was repeated. Checks cover selecting all 18, hiding/showing, configuration before cards, visible unavailable values, and partial states without cards.
- Isolated real query with `juannh`: two JSON requests prepare basic and Extended data; the last requests 17 physical fields and calculates the derived percentage. Selecting all 18 and toggling merged PRs, percentage, and followers adds no JSON or HTTP SVG requests. Zero provider Authorization in the browser, zero page errors, and snapshots outside the draft. A screenshot of both columns was reviewed. The observed time used existing development caches; it is not a cold-start or production-capacity measurement.
- Final `pnpm build` passed after adjusting percentage partiality. The real smoke test was repeated against final code and passed in 5.6 seconds, with no additional requests when selecting counters. Final formatting, links, and diff checks passed; the development editor remains functional.

Preloading moves more work to the first search. External cost depends on batching, pagination, scopes, and caches; two JSON requests do not mean two GitHub calls. Official GitHub/Vercel sources were reviewed again in the [API and hosting guide](github-api-and-hosting.md), distinguishing tab RAM, per-process RAM, and SVG CDN caching. No distributed cache or load test for thousands of users was added.

## Browser IndexedDB activity cache

The follow-up clarification asked to preserve the first load in the browser, including across reloads. [ADR 0031](decisions/0031-browser-persistent-activity-cache.md) was implemented using native IndexedDB, separate from ProfileDocument, localStorage, and backups. Validated public data is saved with canonical keys, identity, filters, and original dates; errors, network authorizations, credentials, SVGs, and Blobs are not saved. Operations are asynchronous, and saved state requires a completed transaction. The cache remains fresh for 30 minutes and is retained for at most 24 hours, without mixing UTC periods/days. The editor can continue in memory when storage is blocked or over quota.

Checks run:

- **92/92 focused tests across five suites**: cache, session, codec, coordinator, and IndexedDB adapter. They cover entry/byte limits, tampered data, identity/scope, timestamps, loading before Search, batched writes, commit, blocked/quota states, late reads, reset during writes, and the Strict Mode dispose/resume cycle. The model, credentials, and server limits were not changed.
- **49/49 activity E2E flows passed in 2.4 minutes** against development: the previous 40 plus nine new cases for real IndexedDB, reload and navigation without queries, new scopes and TTL that wait for Search, user isolation, purge on clear, blocked storage, quota, and tampered records. ESLint, TypeScript, formatting, and focused diff checks passed.
- `pnpm check`: license checks, lint, types, formatting, links in 50 documents, and **1,409 tests in 55 suites** passed.
- Isolated real public smoke test with `juannh` in the Spanish interface: two initial JSON requests; IndexedDB saved about 31 KiB. Reload restored three cards; adding the calendar and selecting all 18 counters produced four ready cards with **zero additional queries**. Zero HTTP SVG requests, zero provider Authorization in the browser, zero page errors, and snapshots outside the draft. A screenshot of both columns was inspected. This size was observed for that account and does not imply anything about other profiles or traffic capacity.
- Final `pnpm build` passed; formatting, links in 50 documents, and diff were reviewed after documenting results. The development server remains available and the real smoke test did not alter the user's draft.

Data is reused in the same browser and origin; it is not synced across devices. The first query and new scopes still go through the server. The browser may remove this disposable cache according to its policy. Persisted caching does not configure production infrastructure or remove provider quotas.
