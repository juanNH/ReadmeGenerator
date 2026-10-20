import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityCardUrl } from "@/core/activity";
import {
  extendedStatIds,
  extendedOptionsSchema,
  type ExtendedOptions,
  type ExtendedStatId,
} from "@/core/activity/extended-options";
import { resourceCardUrl } from "@/core/activity/resource-urls";
import { createActivityDataCache } from "./activity-data-cache";
import { createActivitySearchSession, initialActivitySources } from "./activity-search-session";

function basic(username: string) {
  return {
    username,
    fetchedAt: new Date().toISOString(),
    period: { from: "2025-10-20", to: new Date().toISOString().slice(0, 10) },
    calendar: { total: 0, weeks: [], includesPrivateCounts: false },
    summary: { commits: 0, pullRequests: 0, issues: 0, reviews: 0 },
    languages: { items: [], repositoriesAnalyzed: 0, repositoriesTotal: 0, truncated: false },
    highlights: [],
  };
}
function extended(username: string) {
  return {
    username,
    displayName: username,
    fetchedAt: new Date().toISOString(),
    period: basic(username).period,
    stats: Object.fromEntries(
      extendedStatIds.map((id) => [id, { value: 1, scope: "snapshot", partial: false }]),
    ),
    languages: { items: [], repositoriesAnalyzed: 0, repositoriesTotal: 0, truncated: false },
  };
}
function repository(target: string) {
  const [owner, name] = target.split("/");
  return {
    kind: "repository",
    target,
    owner,
    name,
    description: "Public project",
    fetchedAt: new Date().toISOString(),
    stars: 0,
    forks: 0,
    language: null,
  };
}
function ready(data: unknown) {
  return Response.json({ success: true, data, stale: false });
}
function publicFetch() {
  return vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const url = new URL(String(input), "https://local.example");
    const username = url.searchParams.get("username")!;
    return ready(
      url.pathname.endsWith("/activity")
        ? basic(username)
        : url.pathname.endsWith("/extended")
          ? extended(username)
          : repository(url.searchParams.get("target")!),
    );
  });
}
function stats(items: ExtendedStatId[], username = "sample-dev") {
  return activityCardUrl(username, "extended-stats", "en", undefined, undefined, {
    stats: { items },
  })!;
}
function requestedItems(input: unknown): ExtendedStatId[] {
  return (
    JSON.parse(new URL(String(input), "https://local.example").searchParams.get("stats") ?? "{}")
      .items ?? []
  );
}
function browserStorage(initial: unknown = undefined) {
  let snapshot = initial;
  return {
    load: vi.fn(async (): Promise<unknown> => snapshot),
    save: vi.fn(async (value: unknown) => {
      snapshot = structuredClone(value);
    }),
    clear: vi.fn(async () => {
      snapshot = undefined;
    }),
    close: vi.fn(),
    snapshot: () => snapshot,
  };
}

describe("explicit account search session", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-10-20T12:00:00Z");
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not search while mounting, typing or selecting; allows searching a valid account without cards", async () => {
    const fetcher = publicFetch();
    const session = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
    });
    session.setInputs([stats(["followers"])], "sample-dev");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetcher).not.toHaveBeenCalled();
    expect(session.state([], "sample-dev")).toMatchObject({
      canSearch: true,
      loading: false,
      needsSearch: true,
      searchState: { status: "idle" },
    });
    expect(session.state([], "")).toMatchObject({ canSearch: false });
    await session.search([], "sample-dev");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(session.state([], "sample-dev")).toMatchObject({
      canSearch: true,
      loading: false,
      needsSearch: false,
      searchState: { status: "ready", partial: false },
    });
    expect(session.getCard(activityCardUrl("sample-dev", "calendar", "es")!).status).toBe("ready");
    expect(session.getCard(stats(["stars"])).status).toBe("ready");
    expect(new Set(requestedItems(fetcher.mock.calls[1]?.[0]))).toEqual(
      new Set(extendedStatIds.filter((id) => id !== "mergedPullRequestPercentage")),
    );
    expect(
      new URL(String(fetcher.mock.calls[1]?.[0]), "https://local.example").searchParams.get(
        "languages",
      ),
    ).toBe("{}");
  });

  it("combines common and selected counters in the initial account lookup", async () => {
    const fetcher = publicFetch();
    const session = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
    });
    await session.search([stats(["followers"])], "sample-dev");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(requestedItems(fetcher.mock.calls[1]?.[0])).toContain("followers");
    expect(session.getCard(stats(["followers"])).status).toBe("ready");
  });

  it("reuses all 18 counters and rank after searching, then groups rapid year changes into one missing-only lookup", async () => {
    const fetcher = publicFetch();
    const session = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
    });
    await session.search([], "sample-dev");
    for (const id of extendedStatIds) {
      session.setInputs([stats([id])], "sample-dev", { stats: { items: [id] } });
      expect(session.getCard(stats([id])).status).toBe("ready");
      await vi.advanceTimersByTimeAsync(300);
    }
    const all = activityCardUrl(
      "sample-dev",
      "extended-stats",
      "es",
      undefined,
      { theme: "dark" },
      { stats: { items: [...extendedStatIds].reverse(), showRank: true } },
    )!;
    session.setInputs([all], "sample-dev", {
      stats: { items: [...extendedStatIds].reverse(), showRank: true },
    });
    expect(session.getCard(all).status).toBe("ready");
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher).toHaveBeenCalledTimes(2);
    session.setInputs([], "sample-dev", { stats: { commitsPeriod: "year", year: 2024 } });
    expect(session.state().loading).toBe(true);
    await vi.advanceTimersByTimeAsync(150);
    session.setInputs([], "sample-dev", { stats: { commitsPeriod: "year", year: 2025 } });
    await vi.advanceTimersByTimeAsync(299);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(new Set(requestedItems(fetcher.mock.calls[2]?.[0]))).toEqual(new Set(["commits"]));
    expect(
      JSON.parse(
        new URL(String(fetcher.mock.calls[2]?.[0]), "https://local.example").searchParams.get(
          "stats",
        )!,
      ),
    ).toMatchObject({ commitsPeriod: "year", year: 2025 });
    expect(session.state().searchState.status).toBe("ready");
  });

  it("does not fetch when appearance, language weights, count or content language change", async () => {
    const fetcher = publicFetch();
    const session = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
    });
    await session.search([], "sample-dev");
    session.setInputs(
      [
        activityCardUrl(
          "sample-dev",
          "extended-languages",
          "es",
          undefined,
          { theme: "dark" },
          {
            languages: {
              count: 9,
              countWeight: 1,
              sizeWeight: 0,
              layout: "pie",
              hidden: ["JavaScript"],
            },
          },
        )!,
      ],
      "sample-dev",
    );
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(session.state().needsSearch).toBe(false);
  });

  it("prepares every counter for the configured year and filters without selected cards or hidden resource requests", async () => {
    const fetcher = publicFetch();
    const session = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
    });
    const configuration: ExtendedOptions = {
      stats: {
        items: ["stars"],
        commitsPeriod: "year",
        year: 2024,
        owners: ["another-owner"],
        roles: ["COLLABORATOR"],
        excludeRepositories: ["internal"],
        includeOwnRepositories: true,
      },
      languages: {
        repositories: ["owner/repo"],
        roles: ["OWNER"],
        excludeRepositories: ["omit"],
        count: 12,
        hidden: ["JavaScript"],
        sizeWeight: 0,
        countWeight: 1,
      },
      repositories: ["hidden/repository"],
      gists: ["abcdef"],
      wakatimeUsername: "hidden-account",
    };
    session.setInputs([], "sample-dev", configuration);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetcher).not.toHaveBeenCalled();
    await session.search();
    expect(fetcher).toHaveBeenCalledTimes(2);
    const query = new URL(String(fetcher.mock.calls[1]?.[0]), "https://local.example");
    const requested = JSON.parse(query.searchParams.get("stats")!);
    expect(requested).toMatchObject({
      commitsPeriod: "year",
      year: 2024,
      owners: ["another-owner"],
      roles: ["COLLABORATOR"],
      excludeRepositories: ["internal"],
      includeOwnRepositories: true,
      showRank: false,
    });
    expect(new Set(requested.items)).toEqual(
      new Set(extendedStatIds.filter((id) => id !== "mergedPullRequestPercentage")),
    );
    expect(JSON.parse(query.searchParams.get("languages")!)).toEqual({
      repositories: ["owner/repo"],
      roles: ["OWNER"],
      excludeRepositories: ["omit"],
    });
    const all = activityCardUrl("sample-dev", "extended-stats", "en", undefined, undefined, {
      stats: { ...configuration.stats, items: [...extendedStatIds] },
    })!;
    expect(session.getCard(all).status).toBe("ready");
    session.setInputs([all], "sample-dev", configuration);
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("fetches only changed filter, repository ownership, year and language dependencies after activation", async () => {
    const fetcher = publicFetch();
    const session = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
    });
    await session.search([], "sample-dev");
    const filtered: ExtendedOptions = { stats: { owners: ["another-owner"] } };
    session.setInputs([], "sample-dev", filtered);
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(new Set(requestedItems(fetcher.mock.calls[2]?.[0]))).toEqual(
      new Set(
        extendedStatIds.filter((id) => id !== "followers" && id !== "mergedPullRequestPercentage"),
      ),
    );
    const own: ExtendedOptions = { stats: { ...filtered.stats, includeOwnRepositories: true } };
    session.setInputs([], "sample-dev", own);
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(new Set(requestedItems(fetcher.mock.calls[3]?.[0]))).toEqual(
      new Set(["repositoriesContributedTo", "allTimeRepositoriesContributedTo"]),
    );
    const year: ExtendedOptions = { stats: { ...own.stats, commitsPeriod: "year", year: 2024 } };
    session.setInputs([], "sample-dev", year);
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(requestedItems(fetcher.mock.calls[4]?.[0])).toEqual(["commits"]);
    session.setInputs([], "sample-dev", { ...year, languages: { owners: ["language-owner"] } });
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher).toHaveBeenCalledTimes(6);
    const languageQuery = new URL(String(fetcher.mock.calls[5]?.[0]), "https://local.example");
    expect(languageQuery.searchParams.has("stats")).toBe(false);
    expect(JSON.parse(languageQuery.searchParams.get("languages")!)).toEqual({
      owners: ["language-owner"],
    });
  });

  it("prepares maximum valid filters and oversized visual language options without null URLs or hidden resource requests", async () => {
    const fetcher = publicFetch();
    const session = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
    });
    const owners = Array.from(
      { length: 20 },
      (_, index) => `${String(index).padStart(2, "0")}${"a".repeat(37)}`,
    );
    const repositories = owners.map(
      (owner, index) => `${owner}/${String(index).padStart(2, "0")}${"r".repeat(98)}`,
    );
    const excludeRepositories = owners.map(
      (_, index) => `${String(index).padStart(2, "0")}${"e".repeat(98)}`,
    );
    const filters = {
      owners,
      repositories,
      excludeRepositories,
      roles: ["OWNER", "ORGANIZATION_MEMBER", "COLLABORATOR"] as (
        "OWNER" | "ORGANIZATION_MEMBER" | "COLLABORATOR"
      )[],
    };
    const configuration: ExtendedOptions = {
      stats: {
        ...filters,
        commitsPeriod: "year",
        year: 2100,
        includeOwnRepositories: true,
        showRank: true,
        rankIcon: "percentile",
      },
      languages: {
        ...filters,
        hidden: owners.map((_, index) => `${String(index).padStart(2, "0")}${"界".repeat(98)}`),
        layout: "donut-vertical",
        count: 20,
        format: "bytes",
        sizeWeight: 1,
        countWeight: 1,
        hideValues: true,
        hideProgress: true,
      },
    };
    expect(extendedOptionsSchema.safeParse(configuration).success).toBe(true);
    expect(
      activityCardUrl("sample-dev", "extended-languages", "en", undefined, undefined, {
        languages: configuration.languages,
      }),
    ).toBeNull();
    const seed = initialActivitySources("sample-dev", configuration);
    expect(seed).toHaveLength(3);
    expect(seed.every((source) => typeof source === "string" && source.length <= 12_000)).toBe(
      true,
    );
    await session.search([], "sample-dev", configuration);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(session.state().searchState).toMatchObject({ status: "ready", partial: false });
    const params = new URL(String(fetcher.mock.calls[1]?.[0]), "https://local.example")
      .searchParams;
    const expectedFilters = { ...filters, roles: [...filters.roles].sort() };
    expect(JSON.parse(params.get("languages")!)).toEqual(expectedFilters);
    expect(JSON.parse(params.get("stats")!)).toMatchObject({
      ...expectedFilters,
      commitsPeriod: "year",
      year: 2100,
      includeOwnRepositories: true,
      showRank: false,
    });
  });

  it("requires a new explicit search for an unsearched account", async () => {
    const fetcher = publicFetch();
    const session = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
    });
    await session.search([], "sample-dev");
    session.setInputs([stats(["followers"], "another-dev")], "another-dev");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(session.state().searchState.status).toBe("idle");
    expect(session.state().needsSearch).toBe(true);
    expect(session.getCard(stats(["followers"], "another-dev")).status).toBe("idle");
    await session.search();
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(session.state().searchState.status).toBe("ready");
  });

  it("loads newly chosen public resources only after an explicit search and supports resources without a GitHub username", async () => {
    const fetcher = publicFetch();
    const session = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
    });
    const first = resourceCardUrl("repository", "owner/first", "en")!;
    session.setInputs([first], "");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetcher).not.toHaveBeenCalled();
    expect(session.state().canSearch).toBe(true);
    await session.search();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const second = resourceCardUrl("repository", "owner/second", "en")!;
    session.setInputs([first, second], "");
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[1]?.[0])).toContain("target=owner%2Fsecond");
  });

  it("keeps another repository contribution author unqueried until explicitly searched", async () => {
    const fetcher = publicFetch();
    const session = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
    });
    await session.search([], "sample-dev");
    const source = resourceCardUrl("repository", "owner/repo", "en", undefined, undefined, {
      contributionUsername: "another-dev",
      contributionStats: ["authoredIssues"],
    })!;
    session.setInputs([source], "sample-dev");
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(String(fetcher.mock.calls[2]?.[0])).toContain("/api/github/resource?");
    expect(session.getCard(source)).toMatchObject({
      status: "ready",
      supplement: { status: "idle" },
    });
    await session.search();
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(String(fetcher.mock.calls[3]?.[0])).toContain("username=another-dev");
    expect(session.getCard(source)).not.toHaveProperty("supplement");
  });

  it("shows errors and partial results without cards and never retries failed dependencies through selection edits", async () => {
    const fetcher = publicFetch();
    fetcher.mockImplementation(async (input) =>
      String(input).includes("/activity?")
        ? ready(basic("sample-dev"))
        : Response.json({ success: false, code: "unavailable" }, { status: 503 }),
    );
    const session = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
    });
    await session.search([], "sample-dev");
    expect(session.state().searchState).toMatchObject({
      status: "error",
      code: "unavailable",
      partial: true,
    });
    session.setInputs([stats(["stars"])], "sample-dev");
    await vi.advanceTimersByTimeAsync(1_000);
    session.setInputs(
      [
        activityCardUrl(
          "sample-dev",
          "extended-stats",
          "es",
          undefined,
          { theme: "dark" },
          { stats: { items: ["stars"] } },
        )!,
      ],
      "sample-dev",
    );
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    fetcher.mockImplementation(async () => ready(extended("sample-dev")));
    session.setInputs([], "sample-dev", { stats: { commitsPeriod: "year", year: 2024 } });
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(requestedItems(fetcher.mock.calls[2]?.[0])).toEqual(["commits"]);
  });

  it.each(["null metric", "partial metric", "truncated languages"] as const)(
    "reports successful but partial %s without selected cards or automatic retries",
    async (kind) => {
      const fetcher = publicFetch();
      fetcher.mockImplementation(async (input) => {
        const url = new URL(String(input), "https://local.example");
        const username = url.searchParams.get("username")!;
        const profile = extended(username);
        const data =
          kind === "truncated languages"
            ? { ...profile, languages: { ...profile.languages, truncated: true } }
            : {
                ...profile,
                stats: {
                  ...profile.stats,
                  allTimeContributions: {
                    value: kind === "null metric" ? null : 1,
                    scope: "lifetime",
                    partial: kind === "partial metric",
                  },
                },
              };
        return ready(url.pathname.endsWith("/activity") ? basic(username) : data);
      });
      const session = createActivitySearchSession({
        cache: createActivityDataCache({ fetch: fetcher }),
      });
      await session.search([], "sample-dev");
      expect(session.state().searchState).toMatchObject({ status: "ready", partial: true });
      expect(session.state().needsSearch).toBe(false);
      for (const id of extendedStatIds) {
        session.setInputs([stats([id])], "sample-dev", { stats: { items: [id] } });
        expect(session.getCard(stats([id])).status).toBe("ready");
        await vi.advanceTimersByTimeAsync(300);
      }
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(session.state().searchState).toMatchObject({ status: "ready", partial: true });
    },
  );

  it.each([
    [0, 1],
    [2, 3],
  ])(
    "reports an unavailable derived merge percentage with %i pull requests and %i merged requests",
    async (pullRequests, mergedPullRequests) => {
      const fetcher = publicFetch();
      fetcher.mockImplementation(async (input) => {
        const url = new URL(String(input), "https://local.example");
        const username = url.searchParams.get("username")!;
        const profile = extended(username);
        const data = {
          ...profile,
          stats: Object.fromEntries(
            extendedStatIds.map((id) => [
              id,
              {
                value:
                  id === "pullRequests"
                    ? pullRequests
                    : id === "mergedPullRequests"
                      ? mergedPullRequests
                      : 0,
                scope: "lifetime",
                partial: false,
              },
            ]),
          ),
        };
        return ready(url.pathname.endsWith("/activity") ? basic(username) : data);
      });
      const session = createActivitySearchSession({
        cache: createActivityDataCache({ fetch: fetcher }),
      });
      await session.search([], "sample-dev");
      expect(session.state().searchState).toMatchObject({ status: "ready", partial: true });
      expect(session.state().needsSearch).toBe(false);
      const percentage = stats(["mergedPullRequestPercentage"]);
      expect(session.getCard(percentage)).toMatchObject({ status: "ready", partial: true });
      expect(session.getCard(stats(["stars"]))).not.toHaveProperty("partial");
      session.setInputs([stats([...extendedStatIds])], "sample-dev");
      await vi.advanceTimersByTimeAsync(300);
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it("cancels the debounce on reset and requires activation again", async () => {
    const fetcher = publicFetch();
    const session = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
    });
    await session.search([], "sample-dev");
    session.setInputs([], "sample-dev", { stats: { commitsPeriod: "year", year: 2024 } });
    session.reset();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(session.state().searchState.status).toBe("idle");
    session.setInputs([stats(["followers"])], "sample-dev");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("cancels work removed during debounce and does not load hidden resources", async () => {
    const fetcher = publicFetch();
    const session = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
    });
    await session.search([], "sample-dev");
    session.setInputs([resourceCardUrl("repository", "owner/removed", "en")!], "sample-dev");
    await vi.advanceTimersByTimeAsync(150);
    session.setInputs([], "sample-dev");
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(session.state().loading).toBe(false);
  });

  it("persists a successful search, restores all counters without HTTP, and leaves new scopes waiting for Search", async () => {
    const disk = browserStorage();
    const fetcher = publicFetch();
    const first = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
      storage: disk,
    });
    await first.search([], "sample-dev");
    expect(first.state()).toMatchObject({ storageState: "saved", hasStoredData: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(disk.snapshot()).toMatchObject({ version: 1 });
    await first.dispose();
    expect(disk.clear).not.toHaveBeenCalled();
    const second = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
      storage: disk,
    });
    second.setInputs([], "sample-dev");
    second.mount();
    await vi.advanceTimersByTimeAsync(0);
    expect(second.state()).toMatchObject({
      storageState: "saved",
      hasStoredData: true,
      needsSearch: false,
      searchState: { status: "ready" },
    });
    const all = stats([...extendedStatIds]);
    second.setInputs([all], "sample-dev");
    await vi.advanceTimersByTimeAsync(300);
    expect(second.getCard(all).status).toBe("ready");
    expect(fetcher).toHaveBeenCalledTimes(2);
    second.setInputs([], "sample-dev", { stats: { commitsPeriod: "year", year: 2024 } });
    await vi.advanceTimersByTimeAsync(300);
    expect(second.state().needsSearch).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await second.search();
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(requestedItems(fetcher.mock.calls[2]?.[0])).toEqual(["commits"]);
  });

  it("keeps expired captures visible as stale after reload without refreshing or rejuvenating them", async () => {
    const disk = browserStorage();
    const fetcher = publicFetch();
    const first = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
      storage: disk,
    });
    await first.search([], "sample-dev");
    const original = structuredClone(disk.snapshot());
    await first.dispose();
    await vi.advanceTimersByTimeAsync(31 * 60_000);
    const second = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
      storage: disk,
    });
    second.setInputs([], "sample-dev");
    second.mount();
    await vi.advanceTimersByTimeAsync(0);
    expect(second.getCard(stats(["stars"]))).toMatchObject({ status: "ready", stale: true });
    expect(second.state()).toMatchObject({ needsSearch: true, searchState: { status: "ready" } });
    second.setInputs([stats([...extendedStatIds])], "sample-dev");
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(disk.snapshot()).toEqual(original);
  });

  it("waits for pending browser restoration before deciding whether Search needs HTTP", async () => {
    const priorCache = createActivityDataCache({ fetch: publicFetch() });
    await createActivitySearchSession({ cache: priorCache }).search([], "sample-dev");
    let finish: ((value: unknown) => void) | undefined;
    const disk = browserStorage();
    disk.load.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const fetcher = publicFetch();
    const current = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
      storage: disk,
    });
    const searching = current.search([], "sample-dev");
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).not.toHaveBeenCalled();
    expect(current.state().loading).toBe(true);
    finish!(priorCache.exportRecord());
    await searching;
    expect(fetcher).not.toHaveBeenCalled();
    expect(current.state()).toMatchObject({
      storageState: "saved",
      searchState: { status: "ready" },
    });
  });

  it("ignores a late read after reset and handles StrictMode cleanup without purging the browser cache", async () => {
    const priorCache = createActivityDataCache({ fetch: publicFetch() });
    await createActivitySearchSession({ cache: priorCache }).search([], "sample-dev");
    const disk = browserStorage(priorCache.exportRecord());
    const fetcher = publicFetch();
    const current = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
      storage: disk,
    });
    current.setInputs([], "sample-dev");
    current.mount();
    current.unmount();
    current.mount();
    await vi.advanceTimersByTimeAsync(0);
    expect(disk.load).toHaveBeenCalledTimes(1);
    expect(disk.clear).not.toHaveBeenCalled();
    expect(disk.close).not.toHaveBeenCalled();
    expect(current.state().hasStoredData).toBe(true);
    current.unmount();
    await vi.advanceTimersByTimeAsync(0);
    expect(disk.close).toHaveBeenCalledTimes(1);
    expect(disk.clear).not.toHaveBeenCalled();
    let finish: ((value: unknown) => void) | undefined;
    disk.load.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const next = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
      storage: disk,
    });
    next.mount();
    await vi.advanceTimersByTimeAsync(0);
    await next.reset();
    finish!(priorCache.exportRecord());
    await vi.advanceTimersByTimeAsync(0);
    expect(next.state([], "sample-dev")).toMatchObject({
      hasStoredData: false,
      searchState: { status: "idle" },
    });
    expect(disk.snapshot()).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps a successful search functional in RAM when saving is blocked or quota is exhausted", async () => {
    const disk = browserStorage();
    disk.save.mockRejectedValue(new Error("quota"));
    const fetcher = publicFetch();
    const current = createActivitySearchSession({
      cache: createActivityDataCache({ fetch: fetcher }),
      storage: disk,
    });
    await current.search([], "sample-dev");
    expect(current.state()).toMatchObject({
      storageState: "memory",
      hasStoredData: true,
      searchState: { status: "ready" },
    });
    expect(current.getCard(stats([...extendedStatIds])).status).toBe("ready");
    current.setInputs([stats([...extendedStatIds])], "sample-dev");
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
