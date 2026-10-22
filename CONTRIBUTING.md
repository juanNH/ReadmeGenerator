# Contributing

GitHub Profile Generator is a visual editor for GitHub profile READMEs, with a preview, export, local import, and project files you can use to continue editing later. Before proposing a change, review the [product definition](docs/product.md) and [architecture](docs/architecture.md). Public documentation describes the features that are available and their limits; development planning stays private. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md). For suspected security vulnerabilities, use the private reporting process in [SECURITY.md](SECURITY.md), not a public issue.

## Getting started

Use Node.js `24.21.0` and pnpm `11.25.0`. The [development guide](docs/development.md) covers installation, commands, and what each check verifies.

Create a branch for your change and keep each proposal focused on one goal. The [branching guide](docs/branching.md) explains prefixes, how to create a branch, and the pull request workflow. Discuss scope expansions or decisions that change the product before implementing them.

## Change guidelines

- Write repository documentation in English and keep code names in English.
- Keep English as the default interface language and Spanish as a fully supported option, with separate message catalogs and a working language selector. Update both translations when changing interface text.
- Reuse the visual system and its patterns before adding new variants.
- Support keyboard navigation, visible focus, clear labels, and understandable states.
- Keep every profile section optional. Hiding a section must preserve its data.
- Preserve the manual, no-account workflow and distinguish self-described skills from public activity metrics.
- Mark features that are not available yet as planned rather than presenting them as implemented.
- Add dependencies and adapt third-party projects only after verifying active maintenance in official sources. Pin the revision of copied resources and preserve their source, licenses, and notices.

Changes to profile contracts and generated output need behavior tests. For visual or interaction changes, also review the browser, keyboard behavior, and relevant states. Choose checks that cover the change without duplicating tests that merely mirror its implementation.

## License for contributions

The project's original code is released under [MIT](LICENSE), with a copyright notice for Juan Nicolas Herrera. By submitting your own code, you offer it under the same license and confirm that you are authorized to contribute it. You retain ownership of your contribution; no separate rights assignment is requested.

When reusing code, fonts, icons, data, or other resources, preserve their original notices and document the source, version or commit, license, and modifications in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The project's MIT license does not replace the licenses for those materials or grant trademark rights. Do not copy code with unknown terms or replace another party's notices with the project's copyright.

For dependency or third-party resource changes, follow the [licensing and distribution procedure](docs/open-source.md), regenerate the notices, and review the diff. You do not need an additional account or a separate agreement to contribute.

## Validating a proposal

```sh
pnpm check
pnpm build
```

If you changed dependencies or distributed resources, also run `pnpm licenses:generate` and `pnpm licenses:check`. Review inventory warnings and the notices included in the relevant distribution artifact.

For changes that affect screens or components, add the checks that apply:

```sh
pnpm test:e2e
pnpm test:a11y
```

State which checks you ran and their results. If a check could not be completed, explain why. Do not report a command as passing if you did not run it.

## Pull requests

Use the repository template to explain:

- The problem and its observable outcome.
- The scope of the change and the agreed goal, without attaching private planning.
- The checks you ran and their results.
- The accessibility impact and, where relevant, visual evidence.
- Risks, limitations, or pending decisions that affect review.

Conventional commit messages such as `feat:`, `fix:`, or `docs:` are recommended to keep the history readable. Restrictive commit-message hooks are not required.

## Issues

Use the bug report template to provide reproducible steps, the expected result, and the actual result. For a feature request, describe the person's need and an observable success criterion. Avoid including personal data, credentials, or information from private repositories in examples.
