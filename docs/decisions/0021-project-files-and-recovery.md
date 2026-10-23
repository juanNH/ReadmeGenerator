# ADR 0021: Project Files and Independent Recovery

- Status: accepted.
- Date: 2026-10-20.

## Context

The editor keeps a local draft and can import the visible content of a README as custom sections. The Markdown file does not represent all project modules, categories, identities, formatting choices, and hidden data. The importer's downloadable JSON contains the previous profile from its latest backup; a general copy of the current project is missing.

## Decision

Offer download and opening of a local JSON file containing the complete `ProfileDocument`, with no additional envelope. Always download v2 and open strict v2 or v1 through `parseProfileDocument`, migrating in memory. Preserve the language of the content; keep the interface in its current language. Structurally valid documents can be saved even when their README needs corrections.

`src/core/project` contains the pure contract: 4 MiB measured in UTF-8, maximum depth 32, and up to 50,000 JSON values. Check the size before validating the document; precheck depth before parsing. Also check limits after migrating v1. An outer BOM is optional and counts toward the size; source inside strings retains its characters. Downloads prefer JSON indented by two spaces with a final LF. Near the limit, use compact JSON to preserve the same document without exceeding the limit, then validate it again to ensure this version can reopen it. Never truncate data.

The UI loads Project options on demand. Reading a file and reviewing its summary is inert: do not interpret HTML, load images, or query activity for the candidate. Replace the profile only after review and confirmation. Discard the file and its proposal when closing or changing the interface language; do not resume a confirmation.

The adapter keeps one previous profile in `github-profile-generator.project-backup.v1` as `{ schemaVersion: 1, previousDocument }`. The previous document must be strict v2 and downloadable under the project contract. Store the record as compact JSON with a 4 MiB + 1 KiB limit for the envelope. Write the backup before the new draft; two local-storage writes do not form a transaction.

Keep this backup separate from the Markdown backup, its original source, and the existing v1/v2 keys. Revalidate stored data before writing and protect invalid or inaccessible values. On failure, retain the active profile and require an explicit choice to continue in memory only, with the option to download recovery data. Invalidate pending reviews and saves so a debounce or `pagehide` cannot restore earlier content. Restoration requires confirmation and does not consume the backup.

## Alternatives

- Rebuild all settings from Markdown: the published file omits data and cannot be converted back exactly.
- Add configuration to README comments: this would publish hidden data unnecessarily and would not help with older files.
- Reuse the Markdown backup with an empty source or JSON: this would change that record's meaning and compatibility.
- Accounts and remote synchronization: these require services and decisions outside local portability.

## Consequences

The project preserves all authoring data, including hidden and legacy data, along with IDs and options. It contains no remote snapshots, rendering metadata, ephemeral state, or server configuration. Future versions, unknown fields, and invalid files produce errors without discarding properties to force compatibility.

There are two independent backups, depending on the operation performed. The UI must distinguish opening a project, importing a README, and restoring each previous profile. Limits protect processing and must remain compatible between download and open. No merge, history, multiple persisted projects, or AI assistance is introduced.

## Future review

Revisit whether there is a real need for a project library, merging, or synchronization. Any evolution of the format or backups requires explicit migration and preservation of incompatible records.
