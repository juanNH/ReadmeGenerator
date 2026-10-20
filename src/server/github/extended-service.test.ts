import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtendedDataOptions } from "./extended-data-plan";
import { fixtureNow, githubResponse } from "./test-fixtures";

vi.mock("server-only", () => ({}));

const identity = { login: "octocat", userViewType: "PUBLIC", isViewer: false };
const repository = {
  nameWithOwner: "octocat/project",
  owner: { login: "octocat" },
  isPrivate: false,
  visibility: "PUBLIC",
  isFork: false,
};
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
    restrictedContributionsCount: 3,
    contributionCalendar: { totalContributions: 18 },
    commitContributionsByRepository: [{ repository, contributions: { totalCount: 7 } }],
    issueContributionsByRepository: [],
    pullRequestContributionsByRepository: [],
    pullRequestReviewContributionsByRepository: [],
    repositoryContributions: { pageInfo: { hasNextPage: false }, nodes: [] },
  };
}
function fixtureFetch() {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    if (String(input).includes("/search/commits"))
      return githubResponse({ total_count: 99, incomplete_results: false });
    const body = JSON.parse(String(init?.body)) as {
      query: string;
      variables: Record<string, unknown>;
    };
    const { query, variables } = body;
    if (query.includes("ExtendedIdentity"))
      return githubResponse({
        data: {
          user: {
            ...identity,
            login: variables.login,
            name: "Octo Cat",
            followers: { totalCount: 4 },
            ...(query.includes("current:") ? { current: collection() } : {}),
            ...(query.includes("contributionYears:")
              ? { contributionYears: { contributionYears: [2026] } }
              : {}),
          },
        },
      });
    if (query.includes("ExtendedRepositories"))
      return githubResponse({
        data: {
          user: {
            ...identity,
            login: variables.login,
            repositories: {
              totalCount: 1,
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  ...repository,
                  stargazerCount: 5,
                  languages: {
                    pageInfo: { hasNextPage: false },
                    edges: [{ size: 100, node: { name: "TypeScript", color: "#3178c6" } }],
                  },
                },
              ],
            },
          },
        },
      });
    if (query.includes("ExtendedPublicSearches"))
      return githubResponse({
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
      return githubResponse({
        data: {
          user: {
            ...identity,
            login: variables.login,
            value: { ...collection(), totalCommitContributions: 9 },
          },
        },
      });
    if (query.includes("ExtendedHistory"))
      return githubResponse({
        data: {
          user: {
            ...identity,
            login: variables.login,
            year0: collection(),
          },
        },
      });
    throw new Error(`Unexpected fixture query: ${query.slice(0, 80)}`);
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(fixtureNow);
  vi.stubEnv("GITHUB_TOKEN", "fixture-public-token");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Extended source coverage cache", () => {
  it("reuses a superset, order changes, rank presentation and previously loaded dependencies", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    expect(await getExtendedProfile("octocat", { stats: {} })).toMatchObject({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await getExtendedProfile("@Octocat", { stats: { items: ["reviews", "commits"] } });
    await getExtendedProfile("octocat", {
      stats: { items: ["commits", "reviews"], rankIcon: "github" },
    });
    const rank = await getExtendedProfile("octocat", {
      stats: { items: ["commits"], showRank: true },
    });
    expect(rank.success && rank.data.stats.followers.value).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("adds just one missing search without repeating identity, repositories or previous counters", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat", { stats: {} });
    const result = await getExtendedProfile("octocat", {
      stats: { items: ["stars", "pullRequests", "mergedPullRequests"] },
    });
    expect(result.success && result.data.stats.mergedPullRequests.value).toBe(6);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const body = JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body));
    expect(body.query).toContain("ExtendedPublicSearches");
    expect(Object.values(body.variables)).toEqual(["is:public  author:octocat type:pr is:merged"]);
  });

  it("retains aliases and computes merged percentage from its served dependencies", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat", { stats: { items: ["pullRequests", "issues"] } });
    await getExtendedProfile("octocat", {
      stats: { items: ["authoredPullRequests", "authoredIssues"] },
    });
    const result = await getExtendedProfile("octocat", {
      stats: { items: ["mergedPullRequestPercentage"] },
    });
    expect(result.success && result.data.stats.mergedPullRequestPercentage).toEqual({
      value: 60,
      scope: "lifetime",
      partial: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("treats every language layout, count, format, hidden set and weight as presentation", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat", { languages: {} });
    for (const layout of ["normal", "compact", "donut", "donut-vertical", "pie"] as const)
      expect(
        await getExtendedProfile("octocat", {
          languages: {
            layout,
            count: 20,
            format: "bytes",
            hidden: ["TypeScript"],
            hideProgress: true,
            hideValues: true,
            sizeWeight: 0.5,
            countWeight: 0.5,
          },
        }),
      ).toMatchObject({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await getExtendedProfile("octocat", { stats: { items: ["stars"] } })).toMatchObject({
      success: true,
      data: { stats: { stars: { value: 5 } } },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shares the repository source when stats and languages are requested together", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await getExtendedProfile("octocat", { stats: {} });
    await getExtendedProfile("octocat", { languages: {} });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reuses current collection and history siblings without extra requests", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat", { stats: { items: ["commits"] } });
    await getExtendedProfile("octocat", {
      stats: { items: ["reviews", "repositoriesContributedTo"] },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await getExtendedProfile("octocat", { stats: { items: ["allTimeContributions"] } });
    const result = await getExtendedProfile("octocat", {
      stats: { items: ["allTimeRepositoriesContributedTo"] },
    });
    expect(result).toMatchObject({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("deduplicates overlapping in-flight supersets and only searches remaining fields", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    const results = await Promise.all([
      getExtendedProfile("octocat", { stats: {} }),
      getExtendedProfile("octocat", { stats: { items: ["commits"] } }),
      getExtendedProfile("octocat", { stats: { items: ["pullRequests", "mergedPullRequests"] } }),
      getExtendedProfile("octocat", { stats: { items: ["mergedPullRequestPercentage"] } }),
    ]);
    expect(results.every((result) => result.success)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("retains zero and known null/partial coverage instead of retrying on every click", async () => {
    const fetchMock = fixtureFetch();
    fetchMock.mockImplementationOnce(async () =>
      githubResponse({ data: { user: { ...identity, name: null, followers: { totalCount: 0 } } } }),
    );
    fetchMock.mockImplementationOnce(async () => githubResponse({ data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    const options: ExtendedDataOptions = { stats: { items: ["followers", "issues"] } };
    const first = await getExtendedProfile("octocat", options);
    expect(first).toMatchObject({
      success: true,
      data: {
        stats: { followers: { value: 0, partial: false }, issues: { value: null, partial: true } },
      },
    });
    expect(await getExtendedProfile("octocat", options)).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("normalizes filter set order/case/empty arrays while preserving real data filters", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat", {
      stats: { items: ["issues"], owners: ["Alpha", "BETA"] },
    });
    await getExtendedProfile("octocat", {
      stats: {
        items: ["issues"],
        owners: ["beta", "alpha"],
        repositories: [],
        excludeRepositories: [],
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await getExtendedProfile("octocat", { stats: { items: ["issues"], owners: ["different"] } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("isolates commit periods but reuses unrelated counters and ignores unused year", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat", { stats: { items: ["commits", "pullRequests"] } });
    await getExtendedProfile("octocat", {
      stats: { items: ["pullRequests"], commitsPeriod: "year", year: 2020 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const yearly = await getExtendedProfile("octocat", {
      stats: { items: ["commits"], commitsPeriod: "year", year: 2020 },
    });
    expect(yearly).toMatchObject({ success: true, data: { stats: { commits: { value: 9 } } } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await getExtendedProfile("octocat", {
      stats: { items: ["commits"], commitsPeriod: "period", year: 2020 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("keeps original metric ages when a new counter is loaded and refreshes only expired fields", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat", { stats: { items: ["pullRequests"] } });
    vi.setSystemTime(new Date(fixtureNow.getTime() + 29 * 60_000));
    const mixed = await getExtendedProfile("octocat", {
      stats: { items: ["pullRequests", "issues"] },
    });
    expect(mixed.success && mixed.data.fetchedAt).toBe(fixtureNow.toISOString());
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.setSystemTime(new Date(fixtureNow.getTime() + 31 * 60_000));
    const refreshed = await getExtendedProfile("octocat", {
      stats: { items: ["pullRequests", "issues"] },
    });
    expect(refreshed.success && refreshed.data.fetchedAt).toBe(
      new Date(fixtureNow.getTime() + 29 * 60_000).toISOString(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("serves stale covered data after transient failure but not after 24 hours", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    const options = { stats: { items: ["pullRequests"] as const } };
    await getExtendedProfile("octocat", { stats: { items: [...options.stats.items] } });
    fetchMock.mockRejectedValue(new Error("offline"));
    vi.setSystemTime(new Date(fixtureNow.getTime() + 31 * 60_000));
    expect(
      await getExtendedProfile("octocat", { stats: { items: [...options.stats.items] } }),
    ).toMatchObject({ success: true, stale: true });
    vi.setSystemTime(new Date(fixtureNow.getTime() + 25 * 60 * 60_000));
    expect(
      await getExtendedProfile("octocat", { stats: { items: [...options.stats.items] } }),
    ).toEqual({ success: false, code: "unavailable" });
  });

  it("does not turn missing uncached data into zero or a successful stale superset", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat", { stats: { items: ["pullRequests"] } });
    fetchMock.mockRejectedValue(new Error("offline"));
    // Optional source failure is a known unavailable metric, never a real zero.
    const result = await getExtendedProfile("octocat", {
      stats: { items: ["pullRequests", "issues"] },
    });
    expect(result).toMatchObject({
      success: true,
      data: { stats: { issues: { value: null, partial: true } } },
    });
  });

  it("invalidates every cached field when the public identity disappears", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat", { stats: { items: ["pullRequests"] } });
    fetchMock.mockResolvedValue(githubResponse({ data: { user: null } }));
    expect(await getExtendedProfile("octocat", { stats: { items: ["reviews"] } })).toEqual({
      success: false,
      code: "not_found",
    });
    expect(await getExtendedProfile("octocat", { stats: { items: ["pullRequests"] } })).toEqual({
      success: false,
      code: "not_found",
    });
  });

  it("invalidates coverage on token replacement and removal", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat", { languages: {} });
    vi.stubEnv("GITHUB_TOKEN", "replacement-public-token");
    await getExtendedProfile("octocat", { languages: {} });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    vi.stubEnv("GITHUB_TOKEN", "");
    expect(await getExtendedProfile("octocat", { languages: {} })).toEqual({
      success: false,
      code: "not_configured",
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("fetches followers without paging repositories even when roles and exclusions are supplied", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    expect(
      await getExtendedProfile("octocat", {
        stats: { items: ["followers"], roles: ["OWNER"], excludeRepositories: ["project"] },
      }),
    ).toMatchObject({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await getExtendedProfile("octocat", { stats: { items: ["followers"], owners: ["different"] } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps stats role filters distinct and only varies repository counters with includeOwn", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat", {
      stats: { items: ["commits", "repositoriesContributedTo"] },
    });
    const withOwn = await getExtendedProfile("octocat", {
      stats: { items: ["commits", "repositoriesContributedTo"], includeOwnRepositories: true },
    });
    expect(withOwn).toMatchObject({
      success: true,
      data: { stats: { repositoriesContributedTo: { value: 1 } } },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const request = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(request.query).toContain("ExtendedIdentity");
    await getExtendedProfile("octocat", { stats: { items: ["commits"], roles: ["OWNER"] } });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("keeps partial repository coverage and exposes a future year as unavailable", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => {
      const response = await original(input, init);
      const body = JSON.parse(String(init?.body));
      if (body.query.includes("ExtendedRepositories")) {
        const json = await response.json();
        json.data.user.repositories.nodes[0].languages.pageInfo.hasNextPage = true;
        return githubResponse(json);
      }
      return response;
    });
    const { getExtendedProfile } = await import("./extended-service");
    const first = await getExtendedProfile("octocat", { languages: {} });
    expect(first).toMatchObject({ success: true, data: { languages: { truncated: true } } });
    expect(await getExtendedProfile("octocat", { stats: { items: ["stars"] } })).toMatchObject({
      success: true,
      data: { stats: { stars: { value: 5, partial: true } } },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      await getExtendedProfile("octocat", {
        stats: { items: ["commits"], commitsPeriod: "year", year: 2100 },
      }),
    ).toMatchObject({
      success: true,
      data: { stats: { commits: { value: null, partial: true } } },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("isolates credential generations even if a previous token is selected again", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    let resolveOld!: (value: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    const { getExtendedProfile } = await import("./extended-service");
    const options: ExtendedDataOptions = { stats: { items: ["followers"] } };
    const old = getExtendedProfile("octocat", options);
    vi.stubEnv("GITHUB_TOKEN", "token-b");
    expect(await getExtendedProfile("octocat", options)).toMatchObject({ success: true });
    vi.stubEnv("GITHUB_TOKEN", "fixture-public-token");
    expect(await getExtendedProfile("octocat", options)).toMatchObject({ success: true });
    resolveOld(
      githubResponse({
        data: { user: { ...identity, name: null, followers: { totalCount: 100 } } },
      }),
    );
    expect(await old).toEqual({ success: false, code: "not_configured" });
    expect(await getExtendedProfile("octocat", options)).toMatchObject({
      success: true,
      data: { stats: { followers: { value: 4 } } },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("discards concurrent successes after another user invalidates the same credential", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    let resolveOld!: (value: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    fetchMock.mockImplementationOnce(async () => new Response(null, { status: 401 }));
    const { getExtendedProfile } = await import("./extended-service");
    const options: ExtendedDataOptions = { stats: { items: ["followers"] } };
    const old = getExtendedProfile("octocat", options);
    expect(await getExtendedProfile("another", options)).toEqual({
      success: false,
      code: "not_configured",
    });
    resolveOld(
      githubResponse({
        data: { user: { ...identity, name: null, followers: { totalCount: 100 } } },
      }),
    );
    expect(await old).toEqual({ success: false, code: "not_configured" });
    await vi.advanceTimersByTimeAsync(10 * 60_000 + 1);
    expect(await getExtendedProfile("octocat", options)).toMatchObject({
      success: true,
      data: { stats: { followers: { value: 4 } } },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("bounds followers across repeated overlapping work and retains the original queue deadline", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    let releaseInitial!: (value: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseInitial = resolve;
        }),
    );
    const { getExtendedProfile } = await import("./extended-service");
    const initial = getExtendedProfile("octocat", { stats: { items: ["followers"] } });
    const waiting = getExtendedProfile("octocat", { stats: { items: ["issues"] } });
    await vi.advanceTimersByTimeAsync(58_000);
    const { enqueuePublicLookup } = await import("./public-lookup-queue");
    let releaseBlockers!: () => void;
    const blocker = new Promise<void>((resolve) => {
      releaseBlockers = resolve;
    });
    const blockers = Array.from({ length: 4 }, () =>
      enqueuePublicLookup(
        () => blocker,
        () => {},
      ),
    );
    releaseInitial(
      githubResponse({ data: { user: { ...identity, name: null, followers: { totalCount: 4 } } } }),
    );
    await initial;
    // Fill the slot vacated by the initial lookup before the follower is queued.
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(2000);
    expect(await waiting).toMatchObject({ success: false, code: "rate_limited" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    releaseBlockers();
    await Promise.all(blockers);
  });

  it("does not merge temporal metrics from different UTC intervals into a stale snapshot", async () => {
    vi.setSystemTime(new Date("2026-10-19T23:59:50Z"));
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat", {
      stats: { items: ["commits"], commitsPeriod: "year", year: 2020 },
    });
    vi.setSystemTime(new Date("2026-10-20T00:00:10Z"));
    await getExtendedProfile("octocat", { stats: { items: ["reviews"] } });
    fetchMock.mockResolvedValue(new Response(null, { status: 429 }));
    const result = await getExtendedProfile("octocat", {
      stats: { items: ["commits", "reviews"], commitsPeriod: "year", year: 2020 },
    });
    expect(result).toMatchObject({ success: false, code: "rate_limited" });
  });

  it("uses the temporal metric's interval when older snapshot metadata is served stale", async () => {
    vi.setSystemTime(new Date("2026-10-19T23:59:50Z"));
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat", { languages: {} });
    vi.setSystemTime(new Date("2026-10-20T00:00:10Z"));
    await getExtendedProfile("octocat", { stats: { items: ["reviews"] } });
    fetchMock.mockResolvedValue(new Response(null, { status: 429 }));
    const result = await getExtendedProfile("octocat", {
      stats: { items: ["reviews"] },
      languages: {},
    });
    expect(result).toMatchObject({
      success: true,
      stale: true,
      data: { fetchedAt: "2026-10-19T23:59:50.000Z", period: { to: "2026-10-20" } },
    });
  });

  it("evicts old coverage within the combined 512-field/failure memory budget", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    const options: ExtendedDataOptions = { stats: { items: ["followers"] } };
    await getExtendedProfile("octocat", options);
    for (let index = 0; index < 256; index += 1) {
      await vi.advanceTimersByTimeAsync(1100);
      expect(await getExtendedProfile(`fixture-user-${index}`, options)).toMatchObject({
        success: true,
      });
    }
    expect(fetchMock).toHaveBeenCalledTimes(257);
    await vi.advanceTimersByTimeAsync(1100);
    await getExtendedProfile("octocat", options);
    expect(fetchMock).toHaveBeenCalledTimes(258);
  });

  it("replans the implicit commit year when queue waiting crosses New Year in UTC", async () => {
    vi.setSystemTime(new Date("2026-12-31T23:59:50Z"));
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { enqueuePublicLookup } = await import("./public-lookup-queue");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const blockers = Array.from({ length: 4 }, () =>
      enqueuePublicLookup(
        () => gate,
        () => {},
      ),
    );
    const { getExtendedProfile } = await import("./extended-service");
    const result = getExtendedProfile("octocat", {
      stats: { items: ["commits"], commitsPeriod: "year" },
    });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(fetchMock).not.toHaveBeenCalled();
    release();
    await Promise.all(blockers);
    expect(await result).toMatchObject({
      success: true,
      stale: false,
      data: {
        fetchedAt: "2027-01-01T00:00:10.000Z",
        period: { to: "2027-01-01" },
        stats: { commits: { value: 9 } },
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const yearRequest = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(yearRequest.query).toContain("ExtendedYear");
    expect(yearRequest.variables.from).toBe("2027-01-01T00:00:00Z");
    expect(yearRequest.variables.to).toBe("2027-01-01T00:00:10.000Z");
  });

  it("refreshes retained counters that expire while an incremental lookup waits in the queue", async () => {
    const fetchMock = fixtureFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getExtendedProfile } = await import("./extended-service");
    await getExtendedProfile("octocat", { stats: { items: ["pullRequests"] } });
    vi.setSystemTime(new Date(fixtureNow.getTime() + 29 * 60_000 + 50_000));
    const { enqueuePublicLookup } = await import("./public-lookup-queue");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const blockers = Array.from({ length: 4 }, () =>
      enqueuePublicLookup(
        () => gate,
        () => {},
      ),
    );
    const result = getExtendedProfile("octocat", { stats: { items: ["pullRequests", "issues"] } });
    await vi.advanceTimersByTimeAsync(20_000);
    release();
    await Promise.all(blockers);
    expect(await result).toMatchObject({
      success: true,
      stale: false,
      data: {
        fetchedAt: new Date(fixtureNow.getTime() + 30 * 60_000 + 10_000).toISOString(),
        stats: { pullRequests: { value: 10 }, issues: { value: 2 } },
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const search = JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body));
    expect(Object.values(search.variables)).toHaveLength(2);
  });
});
