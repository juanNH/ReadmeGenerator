# ADR 0002: Reproducible versions and lint compatibility

- Status: accepted with a known limitation.
- Date: 2026-10-19.

## Decision

Keep Next.js 16.4.2 and React 19.3.1, stable versions checked when the foundation was started. Use Node.js 24.21.0 and pnpm 11.25.0, available in the project environment. Pin direct dependencies to their installed versions; the lockfile pins transitive dependencies. CI installs with `--frozen-lockfile`.

The foundation uses ESLint 10.13.0 and runs the Next.js, TypeScript, and accessibility rules. ESLint 9, originally selected by the scaffold, is now listed as deprecated in the registry. Keep version 10 to retain a maintained core.

## Compatibility limitation

Three transitive plugins from `eslint-config-next` still declare peer ranges through ESLint 9: `eslint-plugin-import` 2.32.0, `eslint-plugin-jsx-a11y` 6.10.2, and `eslint-plugin-react` 7.37.5. pnpm reports this warning. Do not ignore it or alter their declarations with overrides.

The delivered code passes lint, which demonstrates the rules and inputs that were run; it does not mean the plugins declare full support for ESLint 10. If a rule actually fails, review a minimal case and the official update before disabling checks. Revisit this point when updating Next.js or those plugins, and record when the warning disappears.

## Checks

- Keep formatting, types, translation contracts, and browser tests independent from lint.
- Review grouped updates to Next/React/configuration through PRs; Dependabot prepares these changes when the repository runs GitHub Actions.
- CI actions are pinned to verified commits and have read permissions. Local configuration does not enable branch protection rules or publish the project.
- In pnpm, allow only the native build scripts used by the installed toolchain; do not indiscriminately enable all dependency scripts.

Execution evidence is recorded in [development](../development.md).
