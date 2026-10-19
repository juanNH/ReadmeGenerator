import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { activityPeriod, fetchGitHubActivity, GitHubActivityError } from "./client";
import { activityFixture, fixtureNow, githubResponse, languagesFixture } from "./test-fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
});

function respond(...responses: Response[]) {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("GitHub public activity client", () => {
  it("uses a rolling 365-day UTC period across leap years", () => {
    expect(activityPeriod(fixtureNow)).toEqual({ from: "2025-10-20", to: "2026-10-19" });
    expect(activityPeriod(new Date("2024-03-01T23:59:59Z"))).toEqual({
      from: "2023-03-03",
      to: "2024-03-01",
    });
  });

  it("maps real public calendar, summary, languages and recent candidates", async () => {
    const fetchMock = respond(
      githubResponse(activityFixture()),
      githubResponse(languagesFixture()),
    );
    const snapshot = await fetchGitHubActivity("octocat", "fixture-token", fixtureNow);
    expect(snapshot.summary).toEqual({ commits: 7, pullRequests: 2, issues: 1, reviews: 3 });
    expect(snapshot.calendar.total).toBe(5);
    expect(snapshot.calendar.weeks[0]?.days[1]?.level).toBe(2);
    expect(snapshot.languages.items[0]).toEqual({
      name: "TypeScript",
      bytes: 150,
      color: "#3178c6",
    });
    expect(snapshot.highlights.map((item) => item.kind)).toEqual(["issue", "pull-request"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/graphql");
    expect(options.redirect).toBe("error");
    expect(options.cache).toBe("no-store");
    expect(JSON.parse(options.body as string).variables).toEqual({
      login: "octocat",
      from: "2025-10-20T00:00:00Z",
      to: fixtureNow.toISOString(),
    });
  });

  it.each(["read:user", "repo", "user", "read:org", "public_repo, repo", "public_repo, read:user"])(
    "rejects broad classic token scopes: %s",
    async (scope) => {
      const fetchMock = respond(githubResponse(activityFixture(), { "x-oauth-scopes": scope }));
      await expect(
        fetchGitHubActivity("octocat", "fixture-token", fixtureNow),
      ).rejects.toMatchObject({
        code: "not_configured",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("accepts exactly the documented public_repo scope for public repository fields", async () => {
    respond(
      githubResponse(activityFixture(), { "x-oauth-scopes": "public_repo" }),
      githubResponse(languagesFixture(), { "x-oauth-scopes": "public_repo" }),
    );
    const snapshot = await fetchGitHubActivity("octocat", "fixture-token", fixtureNow);
    expect(snapshot.languages.repositoriesAnalyzed).toBe(1);
    expect(snapshot.highlights).toHaveLength(2);
  });

  it("normalizes OAuth header casing and surrounding scope whitespace", async () => {
    respond(
      Response.json(activityFixture(), { headers: { "X-OAuth-Scopes": " PUBLIC_REPO " } }),
      Response.json(languagesFixture(), { headers: { "X-OAUTH-SCOPES": " public_repo " } }),
    );
    const snapshot = await fetchGitHubActivity("octocat", "fixture-token", fixtureNow);
    expect(snapshot.username).toBe("octocat");
  });

  it("rejects credentials without verifiable OAuth scopes", async () => {
    respond(Response.json(activityFixture()));
    await expect(fetchGitHubActivity("octocat", "fixture-token", fixtureNow)).rejects.toMatchObject(
      {
        code: "not_configured",
      },
    );
  });

  it("rejects a private user view even with empty reported scopes", async () => {
    const activity = activityFixture();
    activity.data.user.userViewType = "PRIVATE";
    respond(githubResponse(activity));
    await expect(fetchGitHubActivity("octocat", "fixture-token", fixtureNow)).rejects.toMatchObject(
      {
        code: "unavailable",
      },
    );
  });

  it("keeps publicized restricted counts anonymous and excludes private candidates", async () => {
    const activity = activityFixture();
    activity.data.user.contributionsCollection.restrictedContributionsCount = 3;
    activity.data.user.contributionsCollection.issueContributions.nodes[0]!.issue.repository.isPrivate = true;
    activity.data.user.contributionsCollection.pullRequestContributions.nodes[0]!.isRestricted = true;
    respond(githubResponse(activity), githubResponse(languagesFixture()));
    const result = await fetchGitHubActivity("octocat", "fixture-token", fixtureNow);
    expect(result.calendar.includesPrivateCounts).toBe(true);
    expect(result.highlights).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("community/project");
  });

  it("filters private, fork and non-owned repositories defensively", async () => {
    const languages = languagesFixture();
    const repository = languages.data.user.repositories.nodes[0]!;
    languages.data.user.repositories.nodes.push(
      { ...repository, isPrivate: true },
      { ...repository, visibility: "INTERNAL" },
      { ...repository, isFork: true },
      { ...repository, owner: { login: "someone-else" } },
    );
    respond(githubResponse(activityFixture()), githubResponse(languages));
    const result = await fetchGitHubActivity("octocat", "fixture-token", fixtureNow);
    expect(result.languages.repositoriesAnalyzed).toBe(1);
    expect(result.languages.items[0]?.bytes).toBe(150);
  });

  it("paginates at most 300 repositories and discloses truncation", async () => {
    const pages = [1, 2, 3].map((page) => {
      const languages = languagesFixture();
      const repository = languages.data.user.repositories.nodes[0]!;
      languages.data.user.repositories.nodes = Array.from({ length: 100 }, () => repository);
      languages.data.user.repositories.totalCount = 301;
      languages.data.user.repositories.pageInfo = { hasNextPage: true, endCursor: `page-${page}` };
      return githubResponse(languages);
    });
    const fetchMock = respond(githubResponse(activityFixture()), ...pages);
    const result = await fetchGitHubActivity("octocat", "fixture-token", fixtureNow);
    expect(result.languages.repositoriesAnalyzed).toBe(300);
    expect(result.languages.repositoriesTotal).toBe(301);
    expect(result.languages.truncated).toBe(true);
    expect(result.languages.items[0]?.bytes).toBe(45_000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body).variables.after).toBe("page-1");
  });

  it("marks a per-repository language limit and discards unsafe colors", async () => {
    const languages = languagesFixture();
    languages.data.user.repositories.nodes[0]!.languages.pageInfo.hasNextPage = true;
    languages.data.user.repositories.nodes[0]!.languages.edges[0]!.node.color =
      "url(https://bad.test)";
    respond(githubResponse(activityFixture()), githubResponse(languages));
    const result = await fetchGitHubActivity("octocat", "fixture-token", fixtureNow);
    expect(result.languages.truncated).toBe(true);
    expect(result.languages.items[0]?.color).toBe(null);
  });

  it("does not turn a language provider failure into an empty successful language list", async () => {
    respond(githubResponse(activityFixture()), githubResponse({ data: { user: {} } }));
    await expect(
      fetchGitHubActivity("octocat", "fixture-token", fixtureNow),
    ).rejects.toBeInstanceOf(GitHubActivityError);
  });

  it("treats zero activity as successful data", async () => {
    const activity = activityFixture();
    const collection = activity.data.user.contributionsCollection;
    collection.totalCommitContributions = 0;
    collection.totalPullRequestContributions = 0;
    collection.totalIssueContributions = 0;
    collection.totalPullRequestReviewContributions = 0;
    collection.contributionCalendar.totalContributions = 0;
    collection.contributionCalendar.weeks = [];
    collection.pullRequestContributions.nodes = [];
    collection.issueContributions.nodes = [];
    const languages = languagesFixture();
    languages.data.user.repositories.totalCount = 0;
    languages.data.user.repositories.nodes = [];
    respond(githubResponse(activity), githubResponse(languages));
    const result = await fetchGitHubActivity("octocat", "fixture-token", fixtureNow);
    expect(result.calendar.total).toBe(0);
    expect(result.summary.commits).toBe(0);
    expect(result.languages.items).toEqual([]);
  });

  it("recognizes not-found GraphQL errors returned with HTTP 200", async () => {
    respond(githubResponse({ errors: [{ type: "NOT_FOUND" }], data: { user: null } }));
    await expect(fetchGitHubActivity("octocat", "fixture-token", fixtureNow)).rejects.toMatchObject(
      {
        code: "not_found",
      },
    );
  });

  it("honors HTTP and GraphQL quota reset information", async () => {
    respond(githubResponse({ errors: [{ type: "RATE_LIMITED" }] }, { "retry-after": "120" }));
    await expect(fetchGitHubActivity("octocat", "fixture-token", fixtureNow)).rejects.toMatchObject(
      {
        code: "rate_limited",
        retryAt: "2026-10-19T12:02:00.000Z",
      },
    );
  });

  it("fails closed for oversized upstream responses", async () => {
    respond(githubResponse(activityFixture(), { "content-length": "3000000" }));
    await expect(fetchGitHubActivity("octocat", "fixture-token", fixtureNow)).rejects.toMatchObject(
      {
        code: "unavailable",
      },
    );
  });

  it("maps network and timeout failures to unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Timeout", "TimeoutError")));
    await expect(fetchGitHubActivity("octocat", "fixture-token", fixtureNow)).rejects.toMatchObject(
      {
        code: "unavailable",
      },
    );
  });

  it("rejects highlight URLs outside the fixed GitHub content policy", async () => {
    const activity = activityFixture();
    activity.data.user.contributionsCollection.issueContributions.nodes[0]!.issue.url =
      "https://github.com.evil.test/community/project/issues/2";
    respond(githubResponse(activity), githubResponse(languagesFixture()));
    await expect(fetchGitHubActivity("octocat", "fixture-token", fixtureNow)).rejects.toMatchObject(
      {
        code: "unavailable",
      },
    );
  });
});
