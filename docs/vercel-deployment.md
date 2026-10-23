# Vercel Hobby with a PAT and no login

People using the editor enter a public username and click **Search data**. They do not sign up or authorize an App: the PAT belongs to the server operator. This first deployment does not need a GitHub App, OAuth, a database, or additional services.

External references checked on October 20, 2026. Hobby allows personal, non-commercial use and has quotas; the repository's MIT license does not determine the hosting terms. See [Hobby](https://vercel.com/docs/plans/hobby) and [API, caches, and hosting](github-api-and-hosting.md).

## Branches and environments

| Branch | Vercel environment | Use                                                                             |
| ------ | ------------------ | ------------------------------------------------------------------------------- |
| `main` | Production         | Stable public release and card URLs for READMEs.                                |
| `dev`  | Preview            | Pre-production environment for testing changes before merging them into `main`. |

The branch name `dev` is lowercase. In **Project Settings → Environments → Production → Branch Tracking**, select `main`. Pushes to `dev` create Previews; a paid Custom Environment is not needed. Select the Production Branch in Vercel, not in `vercel.json`. See [Production and Preview branches](https://vercel.com/docs/git).

Workflow: develop on a working branch, open a PR to `dev`, review its Preview, then open a PR from `dev` to `main`. Keep `dev` after the merge. CI checks pushes to both branches and PRs. Publication approval, creation of remote branches, and branch protection rules are managed in GitHub; this configuration does not publish changes by itself.

A Preview may require an authenticated Vercel session. Being able to open it while signed in does not establish anonymous access. Keep Deployment Protection enabled; do not expose a protected Preview just to test README images.

## 1. Validate the version

With Node 24 and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm licenses:generate
pnpm check
pnpm build
pnpm test:e2e:cards
```

Review the notices diff after `licenses:generate`: the installed dependency inventory can vary between Windows and Linux. The last suite uses provider fixtures and a dummy token in a separate local production server. It checks all ten families, URLs, HTTP responses, and rendering; it does not use the PAT or prove that remote Camo works. Keep your regular browser profile.

The reviewed version must be pushed to the repository connected to Vercel. Keep `.env*.local`, keys, and private plans out of Git. `.vercelignore` also excludes them from CLI uploads. Configure credentials in the hosting dashboard.

## 2. Create the project

1. In a Hobby account, choose **Add New → Project** and import the repository. If it belongs to an organization, review the restrictions in [Vercel limits](https://vercel.com/docs/limits).
2. Keep **Framework Preset: Next.js** and the project root as the **Root Directory**.
3. Choose **Node.js 24.x**, also required by `package.json`. See [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
4. [vercel.json](../vercel.json) sets `corepack pnpm install --frozen-lockfile`, `pnpm build`, and Fluid Compute. Keep Next.js's automatic output; this is not a static export.
5. Add `ENABLE_EXPERIMENTAL_COREPACK=1` to Production and Preview to respect `packageManager`. See [Corepack](https://vercel.com/docs/builds/configure-a-build#corepack).
6. Verify **Production → Branch Tracking: main**. Use deployments from `dev` for pre-production.

Functions have explicit time budgets of 75 seconds for profile JSON/cards and 150 seconds for Extended resources. A repository with contributions can first wait for a resource and then for statistics, for up to roughly 120 seconds across chained budgets. Network and queue limits remain in place. Hobby with Fluid supports up to 300 seconds according to the [duration documentation](https://vercel.com/docs/functions/configuring-functions/duration).

## 3. Environment variables

In **Project → Settings → Environment Variables**:

| Variable                       | Production (`main`)                                                              | Preview of `dev`                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`                 | Dedicated classic PAT with only `public_repo`, like the one that works locally.  | PAT dedicated to tests if you need real searches; leaving it empty allows manual editing and sample data. |
| `APP_URL`                      | Explicit, stable HTTPS origin; when empty, the Vercel Production domain is used. | Leave empty for samples; to test exports, use a public HTTPS pre-production origin.                       |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1`.                                                                             | `1`.                                                                                                      |

Unfiltered Preview variables apply to all Preview branches. Explicitly limit `GITHUB_TOKEN` and the test origin to `dev` if you want them available only on that branch. If you reuse a PAT across environments, they share the same account quota. See [environments](https://vercel.com/docs/deployments/environments) and [branch-specific variables](https://vercel.com/docs/environment-variables).

`GITHUB_TOKEN` is server-only: never use `NEXT_PUBLIC_`, URLs, or README content. `public_repo` also permits writes on GitHub, but this client performs reads only and filters public data; it rejects additional scopes and unverifiable credentials.

`APP_URL` must be an origin such as `https://your-project.vercel.app`, with no path, query, or fragment. It takes precedence in every environment. If a non-empty value is invalid, it must be corrected; it is not silently replaced. The app does not infer it from `Host`, `VERCEL_URL`, or `VERCEL_BRANCH_URL`.

When `APP_URL` is empty and `VERCEL_ENV` is exactly `production`, the app uses `https://` plus `VERCEL_PROJECT_PRODUCTION_URL`, after validating the domain and the existing public-origin policy. Vercel defines this value as the shortest production domain, either a custom domain or a `vercel.app` domain, available at build time and runtime without a scheme. Enable **Environment Variables → Enable access to System Environment Variables**. The editor reads this value per request; after changing Vercel configuration, run **Redeploy**. See the official [system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables) and [ADR 0036](decisions/0036-production-card-origin.md).

This fallback is not enabled in Preview, development, self-hosted servers, or merely because `NODE_ENV=production`; those environments need an explicit `APP_URL` to export cards. Without a valid origin, data available in the browser can still render the preview, but it cannot provide a URL that GitHub can load. README copy and download remain disabled while cards are included; the JSON project and manual contributions without cards can still be exported.

Search indexing is a separate choice. Vercel Production is indexable only when a valid public origin is available; Preview and local environments remain `noindex`, even when `APP_URL` is set. A self-hosted production build defaults to `noindex`; set `PUBLIC_SITE_INDEXING_ENABLED=true` only when it serves the stable public site over HTTPS.

On `dev`, you can use the branch alias assigned by Vercel as the test origin if it is public. If you point its `APP_URL` at Production, you will be testing the images from `main`, even when the editor is a pre-production build. Do not present that as a test of the new `dev` routes.

## 4. Anonymous access

The effective origin, whether explicit or resolved from Production, and `/cards/...` must respond without a session, cookies, a password, or authentication redirects. Review **Deployment Protection**. You can protect Previews if you do not need to check their images from GitHub; a protected URL cannot be used for that test. Validating the origin syntax does not verify availability or anonymous access.

On October 22, 2026, the `dev` Preview for commit `7b44bdc` was marked **Ready** in Vercel and `/en` opened in a Vercel-authenticated browser session. Anonymous `HEAD` requests to `/en` and `/en/social-preview` returned `302` redirects to Vercel SSO and `X-Robots-Tag: noindex`. This records authenticated access and the observed anonymous redirects only. It does not establish anonymous behavior for `/cards/...`, Production availability, or rendering by GitHub or Camo. Keep SSO enabled and treat the Preview as protected; no card route or remote README image was tested.

Cards are outside `/en` and `/es`; the language goes in `?locale=en` or `?locale=es`. Do not add rewrites to the editor. Responses include `image/svg+xml`, a passive CSP, `nosniff`, public caching, and `X-Activity-State`.

GitHub uses Camo and needs public access to the image. Working in your session or on localhost is not enough. See the [official image troubleshooting guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls).

## 5. Check deployed cards

Without a token or visitor cookies:

```sh
pnpm cards:check --origin https://your-project.vercel.app --username juannh
```

This checks the seven profile cards. To include options and resources you actually exported, download the README from the editor:

```sh
pnpm cards:check --origin https://your-project.vercel.app --readme ./README-exported.md
```

The file is read locally. Only card images from the specified origin are requested; icons and resources from other servers are ignored. The tool checks anonymous GET/HEAD requests, passive SVG, dimensions, caching, and state. `unavailable` fails even when the response is HTTP 200; `stale` is reported as old data. A successful result checks the URLs; it does not publish content or test Camo.

To test the same paths against a local build:

```sh
pnpm cards:check --origin https://your-project.vercel.app --readme ./README-exported.md --local-origin http://127.0.0.1:3100
```

`--local-origin` only allows loopback and replaces the transport. It does not check DNS, HTTPS, Vercel, the CDN, or GitHub.

## 6. Review in GitHub

1. In the deployed editor, search for the user, choose cards, and download the README.
2. Paste the Markdown into a README edit on GitHub and use **Preview** before saving.
3. Check images, language, colors, and counters. Repositories/Gists must exist and be public; WakaTime requires public statistics.
4. If an image is missing, open its URL in a private window and run `cards:check` with the file. A protection page or an `unavailable` SVG is not a ready card.
5. After saving, check the public view. Camo may show an older version; an immediate update is not guaranteed.

Editor mockups and IndexedDB snapshots are not included in the Markdown. Current cards are dynamic server/CDN images; static SVG export is not available yet. The browser cache speeds up editing, but it does not serve images to people reading the README.

## 7. Observe usage

Review function usage, CPU, and transfer in Vercel, and remaining quota on GitHub. Repeating the same URL lets you observe `x-vercel-cache`; retention is best effort. Avoid random query parameters to force reloads: they create new cache keys.

Each new profile and each refresh of published cards can consume quota even after the author closes the editor. Server caches and limits are per process; they are not coordinated globally across instances. This setup is a starting point for measurement, not a guarantee of users per hour or unlimited capacity. Distributed controls will be evaluated using measured traffic.

## Validation of this setup

Run on October 20, 2026, on Windows, with Node 24 and the production build:

- `pnpm check`: no pending license notices; lint, types, formatting, links in 53 documents, 1,415 Vitest tests, and 28 card-checker tests passed.
- `pnpm build`: passed. SWC needed access to its native cache outside the Windows sandbox; no permissions or dependencies were changed.
- `pnpm test:e2e:cards`: 19 cases passed with controlled providers. Ten families in EN/ES, 20 URLs and 20 decoded images, passive XML, and invalid inputs.
- Real PAT, public read-only requests, and an isolated browser: downloaded a README with eight cards, 18 counters, and one public repository; eight images decoded with no page errors or `Authorization` header sent by the browser.
- `cards:check` on that file: eight URLs passed GET/HEAD checks, `ready` state, passive SVG, and cache headers. Transport was explicitly replaced with loopback; the example domain was not contacted.
- Checked for the literal token in the 54 files under `.next/static`: not found. This is a scoped check of the reviewed build, not a security certification.

Vercel listed the Production deployment from `main` at commit `8aaa13b` as **Ready** on October 20, 2026, with the stable domain `readme-generator-ashy.vercel.app`. On October 22, 2026 (Buenos Aires), anonymous `HEAD` requests to `/en` returned `200`; `/en/social-preview`, `/robots.txt`, and `/sitemap.xml` returned `404`. This confirms the listed public response statuses and indicates that this Production deployment does not yet contain the P11/P12 routes. It does not verify the current deployment's Linux installation, CDN behavior, card routes, or image rendering by GitHub/Camo. This Production deployment is separate from the SSO-protected `dev` Preview described above; do not infer that their routes or access behavior match. Recheck steps 5 and 6 against the candidate deployment before relying on those paths.
