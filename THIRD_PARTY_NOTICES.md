# Third-party resources

## GitHub Stats Extended: cards, themes, and optional ranking

The local `extended-stats` and `extended-languages` cards, implemented in `src/core/activity/render-extended-card.ts` and `render-extended-profile.ts`, adapt the SVG composition from [GitHub Stats Extended](https://github.com/stats-organization/github-stats-extended/tree/0506c4c0e0acab7be096be48d0d59d50852d811f), pinned to commit `0506c4c0e0acab7be096be48d0d59d50852d811f`. Their sources are [stats.ts](https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/packages/core/src/cards/stats.ts) and [top-languages.ts](https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/packages/core/src/cards/top-languages.ts) under `packages/core/src/cards/`. The colors in `src/core/activity/extended-themes.ts` adapt that revision's [theme catalog](https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/packages/core/src/themes/index.ts). The formula in `src/core/activity/activity-rank.ts` adapts [calculateRank.ts](https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/packages/core/src/calculateRank.ts), with provenance retained in its header.

The code is distributed under the MIT License, copyright (c) 2020 Anurag Hazra, Abhijit Gupta, martin-mfg. The complete license and its notices are preserved in [public/licenses/github-stats-extended.txt](public/licenses/github-stats-extended.txt), based on the [license at the pinned revision](https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/LICENSE). It permits using, modifying, and distributing the code with the required notices and without warranty.

The adaptation uses public-data queries, translations, and passive rendering in this application. The ranking formula is available only by explicit choice and is identified as an activity formula that does not measure skill; if its required data is unavailable or partial, that limitation is reported. Visual and query options are validated locally. The source project’s packages and backend are not installed or incorporated, and its hosted service is not called. Repository and Gist cards are implemented locally from public metadata; they do not add a license for renderer code copied from that project. Cards are served from the GitHub Profile Generator deployment. The name identifies the design’s origin and does not imply endorsement or parity with the entire original suite. See [ADR 0023](docs/decisions/0023-customizable-activity-cards.md) and the [distribution guide](docs/open-source.md).

## Geist and Geist Mono fonts

The application includes [Geist](https://github.com/vercel/geist-font) and Geist Mono through `@fontsource-variable/geist@5.3.0` and `@fontsource-variable/geist-mono@5.3.0`, without modifying their font files. The packages and revisions are pinned in `package.json` and `pnpm-lock.yaml`; their distribution metadata comes from [Fontsource](https://github.com/fontsource/font-files).

Both fonts are under the SIL Open Font License 1.1, copyright 2024 The Geist Project Authors. The complete texts and notices from the installed packages are preserved in [public/licenses/geist.txt](public/licenses/geist.txt) and [public/licenses/geist-mono.txt](public/licenses/geist-mono.txt). The application’s code license does not replace the OFL or change the terms for the fonts or their derivatives.

## Interface icons · Lucide and Feather

The interface icons come from [lucide-react 1.59.0](https://github.com/lucide-icons/lucide). The package declares ISC, copyright (c) 2026 Lucide Icons and Contributors, and identifies icons derived from Feather under MIT, copyright (c) 2013-present Cole Bemis. Its complete file, including the original list of derived icons and both notices, is preserved in [public/licenses/lucide.txt](public/licenses/lucide.txt). These interface icons are separate from the brand collections in the catalog.

## Installed dependencies and their notices

The [public dependency inventory](public/licenses/dependencies.txt) preserves the complete license texts and notices found in the installed dependency tree, including those bundled inside packages that incorporate other libraries. It includes development tools and optional packages for the platform listed in its heading; this does not mean every package is included in browser JavaScript. For each text, it records the name, version, declared license, source, and original file.

The October 20, 2026 review resolved twenty missing root notices using official sources for the exact versions: files in pinned repositories, complete notices in source code or READMEs, licenses linked by the authors, and supplementary official terms. [scripts/license-sources.json](scripts/license-sources.json) maps those packages and their verified native variants to 27 copies in [public/licenses/supplemental/](public/licenses/supplemental/), along with URLs, revisions, npm integrity, and SHA-256. The texts and original declarations are kept together, distinguishing a source notice from a general license reference.

`stable-hash@0.0.5`, `server-only@0.0.1`, and `client-only@0.0.1` declare MIT without providing an original copyright line. Their complete original context is preserved, including the code and manifest for both marker packages, along with the SPDX MIT template as a separate reference. The catalog marks them `not supplied upstream`; it does not attribute these packages to an assumed rights holder or fill in the template fields. `keyv@4.5.4` is a reviewed local remnant with its official file and all files checked, marked `installed-tree-only`; the current lockfile uses `5.6.0`. The [open-source guide](docs/open-source.md) explains each case and its limitations.

It is generated without additional dependencies or network requests using `pnpm licenses:generate` and checked with `pnpm licenses:check`. The check fails when a new missing notice has no reviewed resolution, evidence text changes, or package integrity differs from the pinned value. The process, inventory limitations, and preparation of sources, bundles, and binaries are described in [docs/open-source.md](docs/open-source.md). MIT for the project’s own code does not relicense these components. Notices for native wrappers do not certify the complete set of components in their binaries. The current installation also includes terms such as MPL-2.0, CC-BY-4.0, and those applicable to sharp/libvips binaries; review the target artifact and its obligations before redistribution.

## Country and territory flags · flag-icons

The 249 SVGs in `public/country-flags/` come from [flag-icons 7.3.2](https://github.com/lipis/flag-icons/tree/fe15c16e7463d0c66d6c5730e9d0e832438d98e1), pinned to commit `fe15c16e7463d0c66d6c5730e9d0e832438d98e1`. They are copied without modifications from `flags/4x3/{code}.svg` for two-letter entries marked `iso: true` in the [source catalog](https://github.com/lipis/flag-icons/blob/fe15c16e7463d0c66d6c5730e9d0e832438d98e1/country.json). The codes represent countries and territories; selection does not infer nationality or location and does not use geolocation.

The collection is distributed under the MIT License, copyright (c) 2013 Panayiotis Lipiridis. The complete license is preserved in [public/country-flags/LICENSE.txt](public/country-flags/LICENSE.txt).

The English and Spanish names were generated once using `Intl.DisplayNames` from Node.js 24.21.0, ICU 78.3, and CLDR 48.0. They are stored as static data in `src/core/location/country-names.ts`; the editor does not download catalogs or rely on the browser’s regional names during use. The README uses only flag URLs pinned to the same commit; the preview uses their local equivalents. Flags are displayed as images so their appearance does not depend on system emoji support.

## Contact icons · Simple Icons

The 13 SVGs in `public/contact-icons/` come from [Simple Icons 11.15.0](https://github.com/simple-icons/simple-icons/tree/0af835e2949a9222965522780e5e0810d3c53382), pinned to commit `0af835e2949a9222965522780e5e0810d3c53382`. Its CC0-1.0 license is preserved in [public/contact-icons/LICENSE.txt](public/contact-icons/LICENSE.txt). Names and marks belong to their respective owners; inclusion identifies them and does not imply endorsement.

## Devicon

248 SVGs in `public/technology-icons/` come from [Devicon](https://github.com/devicons/devicon), pinned to [commit 6a37858047b0e8d9c9c0e68f4a071fc410652e89](https://github.com/devicons/devicon/commit/6a37858047b0e8d9c9c0e68f4a071fc410652e89). React and React Native share the React original; SvelteKit uses the Svelte family mark. Local names may differ, but SVG contents are preserved.

The catalog in `src/core/technologies/index.ts` maps each local file to its public URL pinned to the same commit. Devicon is not queried when searching for or selecting tools in the editor.

Devicon is distributed under the MIT License. The complete copy is preserved in [public/technology-icons/LICENSE.txt](public/technology-icons/LICENSE.txt).

Names, logos, and marks belong to their respective owners and are used for identification. Their inclusion does not imply endorsement; each owner’s trademark policies apply, as stated by the original project.

### Devicon MIT License

```text
The MIT License (MIT)

Copyright (c) 2015 konpa

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Simple Icons: technologies and AI tools

82 SVGs in the technology catalog come from [Simple Icons](https://github.com/simple-icons/simple-icons), pinned to [commit c71c69e3a27e4436936b831c72643e6513b9f49b](https://github.com/simple-icons/simple-icons/commit/c71c69e3a27e4436936b831c72643e6513b9f49b). They include AI tools, ORMs, interfaces, authentication, data, infrastructure, quality, and design. The TanStack Query, Router, Table, Form, and Start entries share the TanStack mark; they are not presented as logos unique to each library. Actix Web uses the Actix mark, and the Oxlint/Oxfmt aliases refer to the Oxc family.

The contents are copied without modifications from `icons/{slug}.svg`; local names are mapped to the originals through `src/core/technologies/index.ts`. JetBrains AI uses the JetBrains family mark; it is not presented as a logo unique to the assistant. Monochrome SVGs retain the collection’s original color and are displayed on a light background in the editor.

Simple Icons publishes the collection under CC0 1.0 Universal. The complete copy is preserved in [public/technology-icons/LICENSE-SIMPLE-ICONS.txt](public/technology-icons/LICENSE-SIMPLE-ICONS.txt). Logos remain the marks of their owners; the catalog license does not replace their guidelines. See the [legal notice for the pinned collection](https://github.com/simple-icons/simple-icons/blob/c71c69e3a27e4436936b831c72643e6513b9f49b/DISCLAIMER.md).

## Lobe Icons: AI tools

28 SVGs in the technology catalog come from [Lobe Icons](https://github.com/lobehub/lobe-icons), pinned to [commit 8a1b2821bb768c484fe8da20c5e1838b6bf551a9](https://github.com/lobehub/lobe-icons/commit/8a1b2821bb768c484fe8da20c5e1838b6bf551a9). They are `antigravity`, `cerebras`, `chatgpt`, `cline`, `codex`, `cohere`, `crewai`, `deepseek`, `dify`, `firecrawl`, `fireworks`, `gemini-cli`, `groq`, `junie`, `langfuse`, `langsmith`, `llamaindex`, `lm-studio`, `mastra`, `mcp`, `openai`, `openrouter`, `qwen`, `replicate`, `roo-code`, `v0`, `vllm`, and `windsurf`.

The contents are copied without modifications from `packages/static-svg/icons/{asset}.svg`. ChatGPT and OpenAI share the OpenAI mark; Codex uses its own Codex SVG. Mappings and pinned URLs are in `src/core/technologies/index.ts`. Product names, marks, and logos belong to their owners; their presence identifies a tool and does not imply endorsement or integration with it.

Lobe Icons is distributed under the MIT License, copyright (c) 2023 LobeHub. The complete copy with its copyright notice is preserved in [public/technology-icons/LICENSE-LOBE-ICONS.txt](public/technology-icons/LICENSE-LOBE-ICONS.txt).

In total, the technology catalog contains 358 entries and 358 local SVGs. Searching for and selecting tools does not query these providers or load a remote icon package. The exported README references only the pinned URLs for those entries.

### Catalog expansion criteria

The expansion adds frameworks, libraries, ORMs, authentication, data platforms, infrastructure, and AI tools with identities verifiable in the pinned collections. Categories are editable editorial suggestions; they do not represent usage rankings, technical recommendations, or skill levels.

Families and features were checked against primary documentation, including [Drizzle ORM](https://orm.drizzle.team/docs/overview), [TypeORM](https://typeorm.io/docs/getting-started/), [Knex.js](https://knexjs.org/), [TanStack](https://tanstack.com/), [Hono](https://hono.dev/), [Pydantic](https://docs.pydantic.dev/latest/), [Better Auth](https://better-auth.com/docs/introduction), [Qdrant](https://qdrant.tech/documentation/), and [Temporal](https://docs.temporal.io/). The catalog preserves the paths and contents of existing icons. Logos are not invented for tools missing from the approved sources; those tools remain available as custom text.

## CodeMirror and Lezer: code editing and highlighting

The application uses [CodeMirror 6](https://github.com/codemirror/dev) to edit source code and [Lezer](https://github.com/lezer-parser/highlight) for local parsing and highlighting. Direct packages and exact versions are listed in `package.json`; the full dependency tree is pinned in `pnpm-lock.yaml`. It includes state, view, language, commands, HTML/JavaScript/JSON/Python/Markdown/PHP grammars, selected legacy modes, and highlight. They load on demand in the browser and do not send source code to a service.

These packages are distributed under the MIT License by Marijn Haverbeke and other contributors. Each installed package retains its `LICENSE` file with the complete notices and terms; the licenses are also published in their official repositories. This installation does not change the repository’s minimum package-age window. Highlighting does not change the license of content a person writes or the policy for allowed HTML.

### Preserved MIT notices

CodeMirror (`@codemirror/*`), copied from the pinned package:

```text
MIT License

Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

Lezer (`@lezer/highlight`), copied from the pinned package:

```text
MIT License

Copyright (C) 2018 by Marijn Haverbeke <marijn@haverbeke.berlin> and others

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
