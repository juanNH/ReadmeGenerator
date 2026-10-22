# ADR 0012: Editable categories and named icons

- Status: accepted.
- Date: 2026-10-19.

## Context

A row of unnamed icons makes tools harder to recognize, and the selection order mixes areas. The profile should remain brief: it should not require an explanation for each technology or a résumé-like structure. Existing v1 drafts already retain groups, names, and custom contexts.

## Decision

Expand the local catalog from 259 to 358 tools using already-pinned icon sources and no new dependencies. Include frameworks, ORMs, authentication, data, infrastructure, quality, and AI. This selection is editorial, not a usage ranking. Provenance and shared brand marks are listed in [third-party resources](../../THIRD_PARTY_NOTICES.md).

Use nine suggested categories: languages, frontend, backend, mobile and desktop, data and messaging, cloud and DevOps, testing and quality, AI and automation, and tools and design. Core resolves names and aliases; classification is not saved as another contract. When adding, a person can choose a suggested category, an existing category, or none. Creating, renaming, ordering, moving tools, and editing notes are secondary actions. Removing a category deletes only its title. Title editing uses an ephemeral draft and applies on blur or Enter, allowing an empty category to be renamed without unmounting the focused field.

Retain `ProfileDocument` v1. Do not reorganize on recovery, language changes, or README generation. Titles are personal content; suggestions use the interface language when created. “Organize by category” is explicit, explains that titles will be replaced, and confirms when titles already exist. It preserves recovered tools, contexts, and duplicates. Operations are pure and immutable, receive a function for new IDs, and resolve local ID collisions when collections are combined. Unnamed empty internal groups are hidden without deleting data and do not affect visible order.

Export each recognized tool with a decorative 20 × 20 icon and escaped visible name. Custom tools remain text, and notes retain their content. The preview recognizes only exact catalog tokens and remains compatible with earlier 32 × 32 tokens. Free-form HTML and arbitrary images are not enabled.

## Alternatives and consequences

- Icons only: compact, but each brand must be recognized; names are added for readability and accessibility.
- Always regroup: consistent order, but overwrites personal choices; suggestions and explicit organization are used instead.
- Add a new category schema: would let the source be recorded, but would duplicate the existing contract; v1 groups are reused without migration.
- Not every product has an icon available in the pinned sources. Custom text is allowed, and shared family marks are documented.
- Editor icons are local; exported icons depend on availability of the pinned URLs. The application does not integrate the selected tools.

## Selection sources

The expansion was checked against official documentation: [Drizzle](https://orm.drizzle.team/docs/overview), [TypeORM](https://typeorm.io/docs/getting-started/), [Knex](https://knexjs.org/), [TanStack](https://tanstack.com/), [Hono](https://hono.dev/), [Pydantic](https://docs.pydantic.dev/latest/), [Qdrant](https://qdrant.tech/documentation/), [Temporal](https://docs.temporal.io/), [OpenRouter](https://openrouter.ai/docs/quickstart), [Firecrawl](https://docs.firecrawl.dev/), and [vLLM](https://docs.vllm.ai/en/latest/). These references establish each tool's purpose; they do not establish its popularity.
