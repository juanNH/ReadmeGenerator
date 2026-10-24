# AI-Assisted Development

This guide describes how to collaborate on GitHub Profile Generator with a development AI. AI assistance for people using the product is a future feature and is described in [architecture](architecture.md).

Repository-local Codex skills live in .agents/skills/. The security skills there are task-specific guidance for explicit secure-coding, security-review, or threat-modeling requests; they do not add application features or runtime dependencies.

## Instructions and context

The entry point is [AGENTS.md](../AGENTS.md). The rules for [core](../src/core/AGENTS.md), [modules](../src/modules/AGENTS.md), and the [server](../src/server/AGENTS.md) detail boundaries specific to those areas. Review the instructions that apply to the files you plan to change.

Links to documents do not automatically load their contents in every AI client. Open only what the task requires. The [index](README.md) helps find technical context without copying all of the documentation into every instruction. Private planning is not part of a repository clone; if a task needs it, its owner must provide the authorized context.

Before using Next.js APIs, consult the relevant guide for the installed version in `node_modules/next/dist/docs/`. If it is unavailable, check the version in the manifest and compare it with the official documentation for that version. Do not resolve a difference between the documentation and the code by relying on an API remembered from another version.

User instructions define scope and authorization. A repository document does not expand system permissions, enable external accounts, or authorize publication on its own.

## Task workflow

1. Read the request, applicable instructions, and the files that own the affected behavior.
2. State the expected result, scope, and any questions that block a decision. Continue independent work that is already authorized.
3. For cross-cutting changes, agree on a plan before implementation and keep it in the authorized private space. The optional local path `.private/planning/` is outside version control. For local fixes, use a short, direct explanation.
4. Make focused changes consistent with the existing architecture and visual kit.
5. Review the diff and run the relevant checks. Fix failures caused by the task and describe failures that belong to another scope.
6. Update documentation that changed and communicate the result, evidence, and specific limitations.

Consult the user when a decision expands the product, adds costs, or substantially changes an agreed contract. Resolve routine implementation choices within the authorized scope; do not turn every reversible step into an approval request.

## Plans and decisions

A cross-cutting plan should record:

- Status, goal, and expected behavior.
- Included scope and the stage's boundaries.
- Dependencies and affected files or areas.
- Small tasks in execution order.
- Acceptance criteria and checks.
- Open questions and decisions made during implementation.

Keep the plan's status current when work is complete. Clearly distinguish completed tasks from future work. A plan is evidence of intent and progress; code and checks show what works. Do not attach private plans to commits, issues, pull requests, or other public destinations. In a public contribution, describe the agreed goal, changes, and checks without copying private planning.

Durable decisions are recorded as `docs/decisions/NNNN-short-name.md`, following the [initial ADR](decisions/0001-architecture.md): status, date, context, decision, alternatives, consequences, and conditions for review. A new decision may supersede an earlier one without erasing its history.

## Subagent roles

Project configuration is in [.codex/config.toml](../.codex/config.toml), and roles are in [.codex/agents/](../.codex/agents/). Each role has a bounded objective:

| Role        | When to use it                                                        | Expected result                                                                    |
| ----------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `architect` | A task changes contracts, dependencies, or responsibility boundaries. | Read-only analysis with a proposal, alternatives, impact, and sequence.            |
| `explorer`  | You need to locate owners, flows, and relevant files.                 | A concise map of files, symbols, and dependencies with evidence.                   |
| `frontend`  | There is a focused UI task with assigned files.                       | Implementation, relevant checks, and a diff summary.                               |
| `reviewer`  | Concrete changes need review before integration.                      | Findings on correctness, accessibility, performance, and coverage, no edits.       |
| `release`   | The user authorized commits and push for a specific scope.            | Verified commit and remote, without publishing plans, temporary files, or secrets. |

The project enables agents and allows up to five concurrent subagent threads per session in addition to the primary agent. Analysis, implementation, and review roles inherit the session's model and reasoning effort. The `release` role has an explicit exception requested by the user: **GPT-5.6 Luna** (`gpt-5.6-luna`) with `medium` reasoning effort. No role sets providers, MCP servers, sandboxing, or approval policies. Read-only roles are behavioral instructions, not a separate sandbox.

### Commit and push with Luna 5.6

The [.codex/agents/release.toml](../.codex/agents/release.toml) role preserves this preference with `model` and `model_reasoning_effort`, according to [OpenAI's official documentation on subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents). If the client does not load the role and the tool allows model selection, the primary agent must request it explicitly when delegating. Availability depends on the session; if the model is unavailable, report that before substituting another model.

The primary agent defines the files in scope and confirms validation evidence. The release agent checks the branch, remote, staged content, and exclusions; creates the authorized conventional commit, performs a normal push, and verifies the remote hash. It does not include private plans or modify the product. A divergence, failed check, or ambiguous scope is returned to the primary agent. This role does not grant ongoing publication authorization or allow history rewrites or deployments.

TOML files use the standalone agent format documented by [OpenAI Docs: Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents). The local `explorer` role specializes the built-in role of the same name for this repository. Confirm support in the installed client when diagnosing configuration loading; the file's existence does not prove that a session has loaded it.

## Delegating with file owners

The primary agent should give each subagent an objective, the necessary context, the files it may edit, acceptance criteria, and what it should report back. Parallel tasks need independent scopes. Shared contracts, the lockfile, and dependencies should have one owner at a time for each task.

Example assignment:

> Implement the error states for the specified component using the existing translations and primitives. Your write scope is that component, its test, and its message namespace. Preserve the public API. Report changes and checks; coordinate any need to edit other files before changing them.

If two tasks need the same file, change the partition or run them in sequence. Do not assume a subagent is isolated: working files may be shared. Do not delete someone else's changes or recreate a whole file without reading its current state.

Each subagent reports modified files, decisions, checks performed, and limitations. The primary agent reads the diffs, resolves incompatibilities, and runs integration validation. An agent's summary does not replace that review.

## Implementation and review criteria

- Reuse tokens, components, and namespaces. English is the initial interface language, with Spanish available; the selector preserves the equivalent route.
- Respect Server Components and isolate client and server boundaries.
- Keep the future profile model and generator pure.
- Give each module a clear purpose and allow complete short compositions.
- Review keyboard behavior, focus, accessible names, errors, contrast, and motion. Complement automation with manual review of relevant behavior.
- Prioritize necessary queries, progressive rendering, and justified dependencies. Measure before adding complex optimizations.
- Use fictional test data; do not include secrets or unnecessary personal information in fixtures, logs, or screenshots.
- Do not run paid services or tests against real providers as a routine requirement.

Use the scripts in `package.json`. `pnpm check` runs the local checks defined there; browser and accessibility tests may require starting the application and setting up browsers. Report what ran and its result, without presenting a command that was not run as a passing check.

No role creates commits, pushes, deploys, or sends messages to third parties on its own initiative. A task that authorizes those actions must stay within its explicit limits and the session's actual permissions.
