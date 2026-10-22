# ADR 0037: Project Description, Cover, and Single Link

- Status: Accepted.
- Date: 2026-10-21.

## Context

Separate contribution and technology fields repeated information that fits in a short description and made each card in the editor longer. Projects should remain easy to share even without a public repository. Showing several secondary links adds controls and content that the person does not want in the card.

## Decision

The form presents a name, description, an optional URL for the title, and an optional image. Description help invites the person to explain what the project does, what their contribution or role was, and which technologies were used. Remove the separate role and technology controls from new edits, but retain both fields in the v2 model so existing JSON files do not lose information. The generator incorporates those legacy values into the description text.

The v2 model adds `titleUrl?: string` to store the single destination used for the title; v1 remains closed. Older v2 profiles retain their `links` collection unchanged. If they do not yet have `titleUrl`, the app uses the first useful link as the destination when generating and materializes it in `titleUrl` when that project is edited. Legacy secondary links remain in JSON but are not included in the README. Social links are added under Contact.

Each project is output in this order: title, description, and preview image. The title links to the one configured URL. The image uses the public HTTPS contract from ADR 0033 and appears below the description.

Image help recommends a direct public HTTPS URL, a horizontal 16:9 image of about 960 × 540 px for display at up to 480 px, less than 1 MB for static images, and brief, subtle GIFs below approximately 2–3 MB. These are tips for the user, not limits the editor can verify. The editor does not upload, resize, compress, or inspect remote files.

The form provides one URL field for the title destination. It does not show rows of secondary links; social links are added under Contact. Help details and controls retain labels, errors, and keyboard navigation.

## Alternatives Considered

- Delete `links` when saving the new format: rejected because it would erase data in existing v2 JSON profiles and make recovery incompatible.
- Upload or compress image files in the editor: rejected because it requires storage, more dependencies, and an additional privacy policy.

## Consequences

Older profiles retain their `links` arrays when imported and downloaded as JSON; the README uses only the primary destination and omits the other URLs. When a project is edited, its destination is saved in `titleUrl`. New projects have a single URL for the title. External images remain dependent on their server, and GitHub determines their final appearance.

See [Profile Model](../profile-model.md), [Editor](../editor.md), and [ADR 0033](0033-project-showcase.md).
