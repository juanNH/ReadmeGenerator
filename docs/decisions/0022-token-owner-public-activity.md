# ADR 0022: Public activity for the token owner

- Status: accepted for implementation.
- Date: 2026-10-20.
- Product: GitHub Profile Generator.

## Context

The integration in [ADR 0010](0010-github-activity.md) requires a dedicated classic PAT whose scopes can be verified and are narrowly limited. The client rejected any response whose `userViewType` was `PRIVATE`. When querying their own account with their token, GitHub can return that view and block a valid public-activity query.

`UserViewType` describes the view available to the viewer; it does not indicate whether a profile has a privacy setting enabled. `isViewer` identifies whether the queried account matches the authenticated account. GitHub documents that private and internal contributions require the `read:user` scope, which this client excludes, and that `restrictedContributionsCount` can be nonzero only when the person has chosen to share that count.

## Decision

Validate `isViewer` as a boolean and require `user.login` to match the requested username, case-insensitively. Accept `userViewType: PUBLIC`; accept `PRIVATE` only when `isViewer` is true. Continue rejecting other `PRIVATE` views. Do not use this enum to infer or promise detection of a profile’s privacy setting.

Check `x-oauth-scopes` in each response first: it must be present and empty, or exactly `public_repo`. Keep rejecting `repo`, `read:user`, additional permissions, and unverifiable credentials, including fine-grained tokens. The owner exception does not relax this boundary.

Keep the filters for public, non-fork repositories owned by the user and for eligible public candidates, as well as full snapshot validation. Do not carry `isViewer`, `userViewType`, or private fields into the public contract. Keep only the anonymous restricted-contribution counts that the person has made public.

This fix does not change `ActivitySnapshot`, `ProfileDocument`, routes, dependencies, caching, or README generation. `GITHUB_TOKEN` remains server-only, and exporting cards still requires the public HTTPS origin configured in `APP_URL`.

## Alternatives considered

- Reject every `PRIVATE` view: keeps blocking queries for the token owner without distinguishing the scope of data from the authenticated view.
- Accept any `PRIVATE` view: broadens acceptance beyond this fix and removes the explicit owner check.
- Add `read:user` or `repo`: conflicts with the public-data policy and permits access to information this product must not publish.
- Use another token or an external provider: adds configuration or a dependency to resolve a case the current client can validate.

## Consequences and limits

The same accepted credential can query the owner and other accounts with a public view. The public-data guarantee combines verified scopes, the documented semantics of contributions, and per-item filters; it does not rely on `userViewType` alone.

Incomplete responses, a different user, an invalid `isViewer`, or a `PRIVATE` view for another account fail closed. Changes to GitHub semantics will require reviewing this policy. This decision does not claim that an authenticated query, deployment, or tests have already been run; evidence is recorded in [development](../development.md).

## Sources

- [GitHub GraphQL: User, isViewer, and UserViewType](https://docs.github.com/en/graphql/reference/users): identity of the queried account and authenticated view.
- [GitHub GraphQL: ContributionsCollection](https://docs.github.com/en/graphql/reference/users#contributionscollection): scope of private/internal contributions and shared restricted-contribution counts.
- [GitHub scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps): permission scopes and the scopes header.
