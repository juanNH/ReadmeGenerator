# ADR 0032: Vercel Hobby with a PAT and Anonymous Cards

## Status

Accepted on October 20, 2026.

## Context

A free deployment is needed while preserving current statistics and access without registration. Browser caching helps with editing, but exported READMEs contain image URLs hosted by this application. The user sets `main` for production and `dev` for preproduction. There is not yet a Vercel project or domain on which to check Camo.

## Decision

- Keep the current classic PAT and its public-scope restrictions. Do not add a GitHub App, login, or storage services.
- Configure Next.js, Corepack/pnpm with an immutable lockfile, and Fluid in `vercel.json`. Keep Node 24 as a project requirement.
- Limit functions to 75 seconds for JSON/profile requests and 150 seconds for resources. The second budget allows chaining a resource and repository contributions; it does not raise provider limits.
- Use Vercel Production for `main` and Preview for `dev`. Configure the production branch and environment variables in the dashboard. CI checks both branches and pull requests.
- Keep explicit HTTPS `APP_URL`, standalone SVGs, and anonymous public routes with caching. Exclude private files from CLI uploads through `.vercelignore`.
- Provide a checker for card URLs and the downloaded README. HTTP 200 is not enough: `unavailable` is a failure. Separate deterministic/local tests from a public check through GitHub.

## Alternatives and Consequences

A GitHub App would require verifying queries and implementing another credentials provider; it has not been shown to replace every current family directly. OAuth conflicts with the required anonymous access. Exporting a static image would remove server dependency when viewing it, but that is not the delivered format.

The initial deployment allows usage to be measured within Hobby's terms and quotas. Cache and RAM limits remain per process; they do not guarantee global consumption or users per hour. The stable domain, credentials, and public access must be configured before images in GitHub/Camo can be considered verified. A local build does not certify Linux installation or Vercel infrastructure.

The `APP_URL` resolution is extended in [ADR 0036](0036-production-card-origin.md): Production may use Vercel's stable domain when the explicit variable is empty. Syntactic validation does not replace checking anonymous access to cards.

See the [deployment guide](../vercel-deployment.md) and [API and hosting guide](../github-api-and-hosting.md).
