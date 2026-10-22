# ADR 0011: Optional countries and contact configured per entry

- Status: accepted.
- Date: 2026-10-19.

## Context

Location needs to suggest countries and add their flags. The system must also display a flag when the platform does not support the emoji. Contact needs to create an entry first and configure its service and address within it, while preserving custom labels, multiple websites, and repeated providers.

## Decision

- Retain the v1 contract: location is text, and each link contains `id`, `label`, and `url`.
- Selecting a country stores its Unicode flag and name in `location`. A static catalog of 249 countries and territories provides EN/ES names and flag-icons SVGs pinned to a commit. Only a flag followed by the exact EN/ES name of the same country becomes a decorative 20 × 15 image, beside the escaped name. All other values, including custom locations with emoji, remain free text to preserve their accessible meaning.
- Autocomplete searches names in both languages and codes, supports keyboard input and custom text, and does not use geolocation. Changing the interface language preserves the saved value.
- Contact creates an entry with the selector focused. The person chooses a service, website, or email and tabs to the URL, without focus changes while moving through options. The selector is a temporary suggestion that does not replace data; on recovery, it is derived from the URL. The icon is always resolved from the validated domain. A custom label remains in optional details.

## Alternatives and consequences

Using only emoji reduces assets, but flag display depends on the system. Adding a country or provider field would require versioning and migrating a contract that already represents the choice; keeping it as text and deriving the brand avoids that migration. The preview recognizes only exact catalog markup and resolves local SVGs, preserving the same Markdown for copy and download.

Flag assets add approximately 1.64 MB to the repository and are requested only when displayed; the README references their pinned source. The catalog and MIT license must be maintained. Earlier locations do not gain a country from a name match and are not rewritten. Nationality, skill, or activity is not inferred from these choices. See [third-party resources](../../THIRD_PARTY_NOTICES.md).
