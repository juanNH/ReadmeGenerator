# ADR 0036: Stable Card Origin in Vercel Production

## Status

Accepted on October 20, 2026. Extends configuration resolution from [ADR 0010](0010-github-activity.md) and [ADR 0032](0032-vercel-hobby-anonymous-pat.md).

## Context

Editor cards are rendered with temporary browser data. A working preview does not prove that there is a public URL for README images. The previous configuration used only `APP_URL`: in a public Vercel deployment without that variable, the preview could work while export remained blocked.

Vercel documents `VERCEL_PROJECT_PRODUCTION_URL` as a stable production domain, custom or `vercel.app`, without a scheme and available at build and runtime. It also provides it in Preview, so the variable alone does not identify the current environment. Official source reviewed on October 20, 2026: [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables).

## Decision

- Keep explicit `APP_URL` as the first option in all environments. A non-empty but invalid value blocks the origin; do not hide the problem with another address.
- Only when `APP_URL` is missing or empty and `VERCEL_ENV` is exactly `production`, prepend `https://` to the bare domain in `VERCEL_PROJECT_PRODUCTION_URL` and validate it with the existing `normalizeActivityBaseUrl` policy.
- Do not use `Host`, request data, `VERCEL_URL`, `VERCEL_BRANCH_URL`, `NODE_ENV`, or temporary deployment domains as fallbacks. Preview and local environments keep explicit configuration.
- Resolve on the server during the editor request. Only the validated public origin reaches the browser; secrets and infrastructure variables remain on the server.
- Keep a single Markdown output and `activity_not_configured` when no valid origin is available. Do not export local paths or Blob URLs. The UI explains that rendering the preview and hosting cards for GitHub require different resources.
- Keep manual contributions and project JSON independent of this requirement. Excluding cards preserves their options and allows manual text to be exported.

## Alternatives and Consequences

Always requiring `APP_URL` is portable and remains available, but duplicates configuration in Production when Vercel already knows the stable domain. Using an ephemeral domain or inferring one from the request can produce temporary links, protected links, or links controlled by a visitor. Removing the export block would produce images GitHub cannot resolve.

Resolution does not query the network and does not test DNS, availability, anonymous access, Camo, or credentials. The operator must enable Vercel system variables, keep `/cards/...` routes public, and verify them according to the [deployment guide](../vercel-deployment.md). A custom domain or a change to Vercel's selected domain may require setting `APP_URL` to control the exported origin. Already downloaded READMEs retain their URLs.
