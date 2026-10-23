# Changelog

This project follows [Semantic Versioning](https://semver.org/). Release tags use the `v` prefix; the application version is recorded in `package.json`.

## [1.0.0] - 2026-10-23

First stable source release of GitHub Profile Generator.

### Added

- A bilingual English and Spanish editor for optional profile sections, custom content, technology catalogs, project links, and contributions.
- A live README preview with matching copy and download output, plus local browser drafts.
- JSON project import and export, README Markdown import with review and recovery backups, and profile recovery guidance.
- Ten optional public activity card types, including locally rendered cards adapted from GitHub Stats Extended.
- A manual workflow that needs no account or credentials. GitHub activity lookup is optional and requires server-side configuration.
- Public product, privacy, contributor, architecture, development, and deployment documentation.

### Distribution

- This release is distributed as source through GitHub. The application deploys as a Next.js web app; it is not published to the npm registry (`private` remains `true`).
- Production and pre-production branch roles, deployment requirements, and post-deployment card checks are documented in [the Vercel guide](docs/vercel-deployment.md).
- Third-party notices and platform-specific license review are documented in [the open-source guide](docs/open-source.md). No standalone binary, container, or npm package is included.
