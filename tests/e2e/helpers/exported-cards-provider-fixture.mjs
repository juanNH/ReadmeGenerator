/**
 * Explicit, local-only provider fixtures for the real Next.js /cards HTTP routes.
 * Load in an isolated test server with NODE_OPTIONS=--import=<this file>.
 * These responses are fabricated test data, never evidence of a GitHub/Camo run.
 * No public network destination is allowed to fall through to the real fetch.
 */
if (
  process.env.EXPORTED_ACTIVITY_FIXTURES !== "1" ||
  process.env.GITHUB_TOKEN !== "fixture-public-token"
) {
  throw new Error(
    "Exported-card fixtures require their explicit flag and exact non-secret fixture token.",
  );
}

const originalFetch = globalThis.fetch;
const gistId = "abcdef1234567890";
const identity = (login) => ({ login, userViewType: "PUBLIC", isViewer: false });
const pageInfo = { hasNextPage: false, endCursor: null };
const repository = (owner = "fixture-dev", name = "sample") => ({
  nameWithOwner: `${owner}/${name}`,
  owner: { login: owner },
  isPrivate: false,
  visibility: "PUBLIC",
  isFork: false,
});
const languageConnection = () => ({
  pageInfo: { hasNextPage: false },
  edges: [
    { size: 700, node: { name: "TypeScript", color: "#3178c6" } },
    { size: 300, node: { name: "CSS", color: "#663399" } },
  ],
});

function collection() {
  return {
    totalCommitContributions: 7,
    totalIssueContributions: 2,
    totalPullRequestContributions: 10,
    totalPullRequestReviewContributions: 3,
    totalRepositoryContributions: 1,
    totalRepositoriesWithContributedCommits: 1,
    totalRepositoriesWithContributedIssues: 0,
    totalRepositoriesWithContributedPullRequests: 0,
    restrictedContributionsCount: 0,
    contributionCalendar: { totalContributions: 23 },
    commitContributionsByRepository: [
      { repository: repository("fixture-community", "shared"), contributions: { totalCount: 7 } },
    ],
    issueContributionsByRepository: [],
    pullRequestContributionsByRepository: [],
    pullRequestReviewContributionsByRepository: [],
    repositoryContributions: { pageInfo: { hasNextPage: false }, nodes: [] },
  };
}

function response(data, github = true, status = 200) {
  return Response.json(data, {
    status,
    headers: github
      ? {
          "x-oauth-scopes": "public_repo",
          "x-ratelimit-remaining": "4999",
          "x-exported-cards-fixture": "local-only",
        }
      : { "x-exported-cards-fixture": "local-only" },
  });
}

function graphql(query, variables) {
  const login = variables.login ?? "fixture-dev";
  if (login === "missing-fixture") return response({ data: { user: null } });
  if (query.includes("ProfileActivity")) {
    const date = new Date().toISOString().slice(0, 10);
    return response({
      data: {
        user: {
          ...identity(login),
          contributionsCollection: {
            restrictedContributionsCount: 0,
            totalCommitContributions: 7,
            totalPullRequestContributions: 2,
            totalIssueContributions: 1,
            totalPullRequestReviewContributions: 3,
            contributionCalendar: {
              totalContributions: 13,
              weeks: [
                {
                  contributionDays: [
                    { date, contributionCount: 13, contributionLevel: "THIRD_QUARTILE" },
                  ],
                },
              ],
            },
            pullRequestContributions: { nodes: [] },
            issueContributions: { nodes: [] },
          },
        },
      },
    });
  }
  if (query.includes("ProfileLanguages"))
    return response({
      data: {
        user: {
          repositories: {
            totalCount: 1,
            pageInfo,
            nodes: [{ ...repository(login), languages: languageConnection() }],
          },
        },
      },
    });
  if (query.includes("ExtendedIdentity"))
    return response({
      data: {
        user: {
          ...identity(login),
          name: "Local provider fixture",
          followers: { totalCount: 4 },
          ...(query.includes("current:") ? { current: collection() } : {}),
          ...(query.includes("contributionYears:")
            ? { contributionYears: { contributionYears: [new Date().getUTCFullYear()] } }
            : {}),
        },
      },
    });
  if (query.includes("ExtendedRepositories"))
    return response({
      data: {
        user: {
          ...identity(login),
          repositories: {
            totalCount: 1,
            pageInfo,
            nodes: [{ ...repository(login), stargazerCount: 5, languages: languageConnection() }],
          },
        },
      },
    });
  if (query.includes("ExtendedPublicSearches"))
    return response({
      data: Object.fromEntries(
        Object.entries(variables).map(([key, value]) => [
          key.replace("q", "count"),
          {
            issueCount: String(value).includes("is:merged")
              ? 6
              : String(value).includes("type:pr")
                ? 10
                : 2,
          },
        ]),
      ),
    });
  if (query.includes("ExtendedYear"))
    return response({ data: { user: { ...identity(login), value: collection() } } });
  if (query.includes("ExtendedHistory")) {
    const years = [...query.matchAll(/(year\d+):/g)].map((match) => match[1]);
    return response({
      data: {
        user: {
          ...identity(login),
          ...Object.fromEntries(years.map((year) => [year, collection()])),
        },
      },
    });
  }
  if (query.includes("ExtendedDiscussions"))
    return response({
      data: {
        user: {
          ...identity(login),
          started: {
            pageInfo,
            nodes: [
              { id: "fixture-discussion", repository: repository("fixture-community", "shared") },
            ],
          },
          answered: {
            pageInfo,
            nodes: [
              {
                id: "fixture-answer",
                discussion: {
                  id: "fixture-discussion",
                  repository: repository("fixture-community", "shared"),
                },
              },
            ],
          },
        },
      },
    });
  if (query.includes("PublicGist"))
    return response({
      data: {
        node: {
          __typename: "Gist",
          id: "G_fixture",
          name: gistId,
          isPublic: true,
          owner: { login: "fixture-dev" },
          stargazerCount: 3,
          forks: { totalCount: 1 },
          files: [{ language: { name: "TypeScript", color: "#3178c6" } }],
        },
      },
    });
  throw new Error("Unsupported GraphQL operation in exported-card local fixtures.");
}

globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) return originalFetch(input, init);
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  );
  if (
    url.origin === "https://profiles.example.com" &&
    (url.pathname.startsWith("/cards/github/") || url.pathname.startsWith("/cards/extended/"))
  ) {
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    if (method !== "HEAD" || headers.has("authorization") || headers.has("cookie"))
      throw new Error("The export check must use anonymous HEAD requests in local fixtures.");
    return originalFetch(new URL(`${url.pathname}${url.search}`, "http://127.0.0.1:3200"), init);
  }
  if (url.hostname === "api.github.com") {
    if (headers.get("authorization") !== "Bearer fixture-public-token")
      throw new Error("The local fixture server accepts only its explicit non-secret token.");
    if (url.pathname === "/graphql") {
      const body = JSON.parse(String(init?.body));
      return graphql(body.query, body.variables ?? {});
    }
    if (url.pathname.startsWith("/search/commits"))
      return response({ total_count: 11, incomplete_results: false });
    if (url.pathname === "/repos/fixture-dev/sample")
      return response({
        full_name: "fixture-dev/sample",
        name: "sample",
        owner: { login: "fixture-dev" },
        private: false,
        visibility: "public",
        description: 'Local provider fixture <script>alert("fixture")</script> & text',
        stargazers_count: 5,
        forks_count: 2,
        language: "TypeScript",
      });
    if (url.pathname === `/gists/${gistId}`)
      return response({
        id: gistId,
        node_id: "G_fixture",
        public: true,
        description: "Local public Gist fixture",
        owner: { login: "fixture-dev" },
        comments: 2,
        files: {
          "fixture.ts": {
            filename: "fixture.ts",
            content: "PRIVATE_RAW_FIXTURE_MUST_NOT_ESCAPE",
            raw_url: "https://gist.githubusercontent.com/never-fetch-this",
          },
        },
      });
    if (url.pathname.includes("missing-fixture"))
      return response({ message: "Local fixture not found" }, true, 404);
    throw new Error("Unsupported GitHub endpoint in exported-card local fixtures.");
  }
  if (
    url.hostname === "api.wakatime.com" &&
    url.pathname === "/api/v1/users/fixture-coder/stats/last_7_days"
  ) {
    if (headers.has("authorization"))
      throw new Error("GitHub authorization must never reach WakaTime.");
    return response(
      {
        data: {
          username: "fixture-coder",
          user_id: "fixture-public-account",
          range: "last_7_days",
          is_coding_activity_visible: true,
          is_language_usage_visible: true,
          is_up_to_date: true,
          total_seconds_including_other_language: 3600,
          languages: [{ name: "TypeScript", total_seconds: 3600, percent: 100 }],
        },
      },
      false,
    );
  }
  throw new Error(
    "The exported-card fixture server blocked an unexpected external network destination.",
  );
};
