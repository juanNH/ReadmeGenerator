# ADR 0044: README Round-Trip Metadata and Guided Import

- Status: accepted.
- Date: 2026-10-23.
- Supersedes the custom-only mapping decision in ADR 0018 and the rejection of README recovery metadata in ADR 0021.

## Context

The generated README is the file people publish and share, but visible Markdown does not identify the fixed modules that produced it and omits hidden profile data and editor settings. The existing project JSON preserves the complete `ProfileDocument`, but requiring a README and a second JSON file does not provide the desired one-file download/import flow. Arbitrary README files also vary too much for reliable classification from headings alone.

## Decision

- Keep `ProfileDocument` v2 as the persisted model and the existing project JSON flow as a separate full-fidelity option. Do not add manifest fields to the profile model.
- Append one exact, versioned HTML-comment manifest to app-generated Markdown. The manifest records emitted section identities, order, UTF-16 ranges, and a body fingerprint. It contains no hidden profile values by default. The fingerprint detects changed source only; it is not an authenticity check.
- Offer an explicit export choice to include the complete validated v2 profile snapshot in that same README. Clearly disclose that this includes hidden and retired data and is readable in the raw public source even though GitHub hides the comment from its rendered Markdown. Do not include the snapshot unless selected.
- Bound the visible README body to 100,000 UTF-16 code units and the complete manifest-bearing file to 200,000 units. Never truncate. If a requested full snapshot cannot fit or validate, block that export and direct the person to the separate project JSON option.
- On import, recognize only the exact terminal manifest syntax and validate it as untrusted data before using it. A matching full snapshot offers exact restoration from the same `.md`; after edits to the visible body, let the person choose between restoring the captured snapshot and importing the current Markdown. Structural metadata may guide section-to-module routing only when the body matches. Invalid, unsupported, or absent metadata produces a notice and falls back to the normal Markdown review without discarding the source.
- For ordinary or edited README files, use deterministic module-specific adapters supported by both heading aliases and content structure. Show the proposed destination, recognized fields, and conversion notices. Consume a heading used to identify a fixed module instead of duplicating it as a custom title. Ambiguous, repeated, partially supported, or unknown content remains recoverable as custom content or requires an explicit choice.
- Preserve the existing local-only analysis, HTML/URL policies, source ranges, inert review, explicit replacement confirmation, backup-before-write behavior, and protected-storage handling. Do not add AI, network calls, raw Markdown blocks, services, or dependencies.

## Alternatives

- Put the full snapshot in every README by default: rejected because hidden profile values would be exposed in public raw source without an explicit choice.
- Keep JSON as the only exact recovery route: retained as an option, but insufficient for the requested one-file README round trip.
- Infer fixed modules from titles alone: rejected because titles are ambiguous and do not establish that the content maps to the module's fields.
- Send arbitrary Markdown to an AI service: rejected because deterministic local conversion and explicit review meet the need without adding uncertainty, accounts, or network data handling.

## Consequences

People who opt in can download one README and later restore the exact captured profile by importing that same file. The opt-in README can expose data not displayed on the GitHub profile; the interface must explain this before export. People who decline the snapshot can still reimport the visible structure, while project JSON remains the complete alternative. Edited, third-party, stale, or unsupported Markdown is best-effort and must state what was recognized, converted, or retained as custom content. Future active modules need an import adapter when their data shape changes.

The manifest is part of the generated Markdown consumed by preview, copy, and download. It is not authored HTML and does not broaden the custom HTML allowlist. Older README files without the marker continue through the existing parser and review flow.

## Review conditions

Revisit the manifest version and size limits when the profile contract or README importer limits change. Never treat the public comment as secret storage or accept an unsupported snapshot without preserving the original file for review.
