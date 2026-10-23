# ADR 0001: A Next.js application with responsibility boundaries

- Status: accepted for the initial foundation.
- Date: 2026-10-19.
- Product: GitHub Profile Generator.

## Context

The product will compose profile READMEs through nine optional modules. It needs an accessible, visual interface, initial local saving, and export. In the future, it may query GitHub and provide AI assistance, operations that may require secrets, usage controls, and server-side execution.

The current delivery prepares the project, bilingual visual kit, and documentation. The editor and versioned profile document have not yet been implemented.

## Decision

Keep one repository and one Next.js App Router application with strict TypeScript, Node.js 24, and pnpm. Pin exact versions in the manifest and lockfile. Use Server Components by default and small client boundaries for interaction.

Organize by responsibility: `app` composes routes; `components/ui` provides primitives; `features` coordinates user flows; `modules` presents sections; `core` will contain contracts and pure generation; `server` will host server-only services. Create code when a concrete need justifies it, without adding generic layers in advance.

Build a kit with tokens, Tailwind CSS, Radix primitives, shadcn-style components, CVA variants, Lucide, and `next-themes`. Keep English as the default language and Spanish as a complete alternative with `next-intl` and localized routes.

Future AI assistance will propose changes to the profile document and reuse the existing generator. The foundation does not install providers or expose AI endpoints. Credentials for any integration will remain in server-only code.

## Alternatives considered

| Alternative                                  | Advantage                                             | Reason for the decision                                                                                                  |
| -------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Static SPA with a backend added later        | A simple initial editor and static deployment.        | Next.js was already chosen to keep the interface and future integrations in one application.                             |
| Separate frontend and API                    | Separate deployment and scaling.                      | The current foundation does not need that additional operational burden. Reconsider if real requirements arise.          |
| Monorepo with shared packages from the start | Distributable separation of contracts and components. | A single consumer does not need to publish or manage multiple packages. Internal boundaries allow extracting them later. |
| Free-form README generation with AI          | Immediate writing flexibility.                        | The product needs structured editing, predictable output, and review of suggestions; generation will be deterministic.   |

## Consequences

- The UI and future services can evolve within one application.
- Client/server boundaries require explicit attention to imports and serialized data.
- The model and generator can be tested without a browser or providers.
- The bilingual kit allows visual decisions to be validated before the editor.
- Initial local persistence does not provide cross-device synchronization.
- A GitHub profile remains subject to the format GitHub accepts; editor customization must respect that output.

## Future review

Review this decision if there are multiple model consumers, independent asynchronous execution, persistent synchronization, or separate deployment requirements. Document a new decision that supersedes this one and explains its evidence; do not change the structure solely in anticipation of growth.

See [architecture](../architecture.md).
