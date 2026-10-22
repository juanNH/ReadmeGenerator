# ADR 0003: Versioned profile document and strict validation

- Status: accepted.
- Date: 2026-10-19.
- Scope: pure contracts and operations in `src/core/`.

## Context

The profile needs incomplete drafts and optional modules that are independent of public activity. External inputs require runtime validation in addition to types, without adding a framework, browser, storage, or services to the core.

## Decision

Use Zod `4.6.7` as a direct dependency and infer types with `z.infer`, avoiding duplicate interfaces and validators. The official documentation explains [inference and `safeParse` results](https://zod.dev/basics).

Define `ProfileDocument` with `schemaVersion: 1`, `contentLocale`, `data`, `moduleOrder`, and `visibility`. All modules are present: optionality is represented by empty data and visibility. The order includes each module exactly once, including hidden modules.

Keep one canonical JSON shape: `""` for empty text, `[]` for collections, and `null` for incomplete selections. The parser does not add defaults or coerce values. The caller supplies identifiers and language; values are not generated from the clock or randomness.

Reject unknown keys, including nested keys, with `z.strictObject`, documented in the [official API](https://zod.dev/api). Do not silently discard data. Reject incompatible versions and do not anticipate migrations without real formats to transform.

Adapt errors to domain codes and paths. Operations receive already-valid documents, validate their arguments, and return new documents while sharing unchanged branches. The factory creates independent structures.

## Alternatives

| Alternative                          | Consequence                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| Separate types and manual validation | Avoids the dependency, but duplicates the contract and makes divergence more likely. |
| Discard unknown keys                 | Can lose information while making the input appear valid.                            |
| Open objects                         | Allow data outside the versioned contract.                                           |
| Omit modules or empty fields         | Introduces multiple representations of the same draft.                               |
| Anticipate migrations                | Adds rules without previous formats or evidence of use.                              |

## Consequences and review

Zod is an explicit dependency of the core. Inputs outside the contract require explicit adapters. Consumers must treat documents as immutable and must not assume deep freezing.

Structural validation accepts incomplete text, dates, and links; it does not guarantee safe export. The editor, persistence, generator, and integrations are still absent.

Review this decision when the schema evolves, persisted formats require migration, or concrete adaptation requirements arise. See [profile model](../profile-model.md) and [architecture](../architecture.md).
