import { describe, expect, it, vi } from "vitest";
import { activityCardUrl } from "@/core/activity";
import type { ActivitySnapshot } from "@/core/activity/activity-types";
import {
  extendedStatIds,
  type ExtendedStatId,
  type ExtendedStatsOptions,
} from "@/core/activity/extended-options";
import type { ExtendedProfileSnapshot } from "@/core/activity/extended-types";
import { resourceCardUrl } from "@/core/activity/resource-urls";
import { createActivityDataCache } from "./activity-data-cache";

const initialTime = Date.parse("2026-10-20T12:00:00Z");
function basic(username = "sample-dev", now = initialTime): ActivitySnapshot {
  return {
    username,
    fetchedAt: new Date(now).toISOString(),
    period: { from: "2025-10-20", to: new Date(now).toISOString().slice(0, 10) },
    calendar: { total: 0, weeks: [], includesPrivateCounts: false },
    summary: { commits: 0, pullRequests: 0, issues: 0, reviews: 0 },
    languages: { items: [], repositoriesAnalyzed: 0, repositoriesTotal: 0, truncated: false },
    highlights: [],
  };
}
function extended(username = "sample-dev", now = initialTime): ExtendedProfileSnapshot {
  return {
    username,
    displayName: username,
    fetchedAt: new Date(now).toISOString(),
    period: basic(username, now).period,
    stats: Object.fromEntries(
      extendedStatIds.map((id) => [
        id,
        {
          value: id === "stars" ? 13 : 2,
          scope: id === "reviews" || id === "commits" ? "period" : "lifetime",
          partial: false,
        },
      ]),
    ) as ExtendedProfileSnapshot["stats"],
    languages: {
      items: [{ name: "TypeScript", bytes: 100, repositoryCount: 2, color: "#3178c6" }],
      repositoriesAnalyzed: 2,
      repositoriesTotal: 2,
      truncated: false,
    },
  };
}
function resource(target = "owner/repo", now = initialTime) {
  const [owner, name] = target.split("/");
  return {
    kind: "repository",
    target,
    owner,
    name,
    description: "Public project",
    fetchedAt: new Date(now).toISOString(),
    stars: 1,
    forks: 0,
    language: null,
  };
}
function success(data: unknown, stale = false) {
  return Response.json({ success: true, data, stale });
}
function stats(
  items: ExtendedStatId[],
  options: ExtendedStatsOptions = {},
  username = "sample-dev",
) {
  return activityCardUrl(username, "extended-stats", "en", undefined, undefined, {
    stats: { ...options, items },
  })!;
}
function requestedStats(input: unknown): ExtendedStatsOptions {
  return JSON.parse(
    new URL(String(input), "https://local.example").searchParams.get("stats") ?? "{}",
  );
}

describe("centralized browser activity data", () => {
  it("does not fetch while reading sources and rejects arbitrary resources", () => {
    const fetcher = vi.fn<typeof fetch>();
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    const source = activityCardUrl("sample-dev", "summary", "en")!;
    expect(cache.getCard(source)).toEqual({ status: "idle" });
    expect(cache.state([source])).toMatchObject({ loading: false, needsSearch: true });
    expect(cache.state([`https://host.example${source}`, `${source}&other=true`])).toMatchObject({
      needsSearch: false,
      total: 0,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("loads all five own cards from one public snapshot and preserves genuine zeros", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(success(basic()));
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    const sources = ["calendar", "summary", "languages", "panorama", "monthly"].map((card) =>
      activityCardUrl("sample-dev", card as "summary", "en")!,
    );
    await cache.search(sources);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]?.[0])).toBe("/api/github/activity?username=sample-dev");
    expect(sources.map((source) => cache.getCard(source).status)).toEqual(Array(5).fill("ready"));
    const ready = cache.getCard(sources[1]!);
    expect(ready.status === "ready" && ready.svg).toContain("Commits: 0");
    expect(cache.state(sources)).toEqual({
      loading: false,
      needsSearch: false,
      completed: 1,
      total: 1,
    });
  });

  it("reuses all public data across appearance and content language edits without redrawing unchanged cards", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(success(basic()));
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    const source = activityCardUrl("sample-dev", "summary", "en")!;
    await cache.search([source]);
    expect(cache.getCard(source)).toBe(cache.getCard(source));
    const updated = activityCardUrl("sample-dev", "summary", "es", undefined, {
      theme: "dark",
      width: 900,
    })!;
    expect(cache.getCard(updated)).toMatchObject({ status: "ready", stale: false });
    expect(cache.state([updated]).needsSearch).toBe(false);
    await cache.search([updated]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("groups compatible stats and languages and sends only their data dependencies", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => success(extended()));
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    const first = stats(["stars", "commits"]);
    const languages = activityCardUrl(
      "sample-dev",
      "extended-languages",
      "en",
      undefined,
      { theme: "dark" },
      { languages: { count: 3, hidden: ["JavaScript"], sizeWeight: 0, countWeight: 1 } },
    )!;
    await cache.search([first, languages]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetcher.mock.calls[0]?.[0]), "https://local.example");
    expect(JSON.parse(url.searchParams.get("stats")!)).toEqual({
      items: ["stars", "commits"],
      showRank: false,
    });
    expect(JSON.parse(url.searchParams.get("languages")!)).toEqual({});
    expect(cache.getCard(first).status).toBe("ready");
    expect(cache.getCard(languages).status).toBe("ready");
    const restyled = activityCardUrl(
      "sample-dev",
      "extended-languages",
      "es",
      undefined,
      undefined,
      { languages: { count: 10, sizeWeight: 1, countWeight: 0, layout: "pie", hideValues: true } },
    )!;
    expect(cache.getCard(restyled).status).toBe("ready");
    await cache.search([restyled]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("queries only a newly added counter, preserves older timestamps and treats requested null as covered", async () => {
    let now = initialTime;
    const firstData = extended();
    firstData.stats.stars = { value: null, partial: true, scope: "snapshot" };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        success(now === initialTime ? firstData : extended("sample-dev", now)),
      );
    const cache = createActivityDataCache({ fetch: fetcher, now: () => now });
    const first = stats(["stars"]);
    await cache.search([first]);
    expect(cache.state([first]).needsSearch).toBe(false);
    now += 29 * 60_000;
    const second = stats(["followers", "stars"]);
    await cache.search([second]);
    expect(requestedStats(fetcher.mock.calls[1]?.[0]).items).toEqual(["followers"]);
    now += 2 * 60_000;
    expect(cache.state([second]).needsSearch).toBe(true);
    await cache.search([second]);
    expect(requestedStats(fetcher.mock.calls[2]?.[0]).items).toEqual(["stars"]);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("expands rank and percentage dependencies, then reuses them independently of order", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => success(extended()));
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    await cache.search([stats(["stars"], { showRank: true })]);
    expect(new Set(requestedStats(fetcher.mock.calls[0]?.[0]).items)).toEqual(
      new Set(["stars", "commits", "pullRequests", "issues", "reviews", "followers"]),
    );
    const percentage = stats(["mergedPullRequestPercentage", "followers"]);
    await cache.search([percentage]);
    expect(requestedStats(fetcher.mock.calls[1]?.[0]).items).toEqual(["mergedPullRequests"]);
    expect(cache.getCard(percentage).status).toBe("ready");
    await cache.search([stats(["followers", "stars"])]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("reports partiality only for requested data and preserves complete empty language data", async () => {
    const data = extended();
    data.stats.stars = { value: 0, partial: false, scope: "snapshot" };
    data.stats.allTimeContributions = { value: null, partial: true, scope: "lifetime" };
    data.languages = { items: [], repositoriesAnalyzed: 0, repositoriesTotal: 0, truncated: false };
    const cache = createActivityDataCache({
      fetch: vi.fn<typeof fetch>().mockImplementation(async () => success(data)),
      now: () => initialTime,
    });
    const complete = stats(["stars"]);
    const partial = stats(["allTimeContributions"]);
    const languages = activityCardUrl("sample-dev", "extended-languages", "en")!;
    await cache.search([complete, partial, languages]);
    expect(cache.getCard(complete)).toMatchObject({ status: "ready" });
    expect(cache.getCard(complete)).not.toHaveProperty("partial");
    expect(cache.getCard(partial)).toMatchObject({ status: "ready", partial: true });
    expect(cache.getCard(languages)).toMatchObject({ status: "ready" });
    expect(cache.getCard(languages)).not.toHaveProperty("partial");
  });

  it("keeps options that affect data isolated while reusing unaffected followers", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => success(extended()));
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    await cache.search([
      stats(["stars", "followers", "commits"], { year: 2025, commitsPeriod: "year" }),
    ]);
    await cache.search([
      stats(["stars", "followers", "commits"], {
        year: 2026,
        commitsPeriod: "year",
        owners: ["another-owner"],
      }),
    ]);
    expect(new Set(requestedStats(fetcher.mock.calls[1]?.[0]).items)).toEqual(
      new Set(["stars", "commits"]),
    );
  });

  it("loads metadata and repository contribution counters independently and reuses either on edits", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        String(input).includes("/resource?") ? success(resource()) : success(extended()),
      );
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    const first = resourceCardUrl("repository", "owner/repo", "en", undefined, undefined, {
      contributionUsername: "sample-dev",
      contributionStats: ["authoredIssues"],
    })!;
    await cache.search([first]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(cache.getCard(first).status).toBe("ready");
    const second = resourceCardUrl(
      "repository",
      "owner/repo",
      "es",
      undefined,
      { theme: "dark" },
      {
        contributionUsername: "sample-dev",
        contributionStats: ["authoredIssues", "authoredPullRequests"],
        descriptionLines: 1,
      },
    )!;
    await cache.search([second]);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(requestedStats(fetcher.mock.calls[2]?.[0])).toMatchObject({
      items: ["authoredPullRequests"],
      repositories: ["owner/repo"],
    });
  });

  it("deduplicates overlapping searches while exposing loading and partial success", async () => {
    let finish: ((value: Response) => void) | undefined;
    const fetcher = vi.fn<typeof fetch>().mockImplementation((input) =>
      String(input).includes("/activity?")
        ? new Promise<Response>((resolve) => {
            finish = resolve;
          })
        : Promise.resolve(
            Response.json(
              { success: false, code: "rate_limited", retryAt: "2026-10-20T12:01:00Z" },
              { status: 429 },
            ),
          ),
    );
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    const first = activityCardUrl("sample-dev", "calendar", "en")!;
    const second = stats(["stars"]);
    const task = cache.search([first, second]);
    expect(cache.getCard(first)).toEqual({ status: "loading" });
    await cache.search([first]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    finish!(success(basic()));
    await task;
    expect(cache.getCard(first).status).toBe("ready");
    expect(cache.getCard(second)).toEqual({
      status: "error",
      code: "rate_limited",
      retryAt: "2026-10-20T12:01:00Z",
    });
    expect(cache.state([first, second])).toMatchObject({
      loading: false,
      completed: 2,
      total: 2,
      needsSearch: true,
    });
  });

  it.each(["not_found", "not_configured", "unavailable"] as const)(
    "validates the %s error without turning it into counts",
    async (code) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ success: false, code }, { status: 503 }));
      const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
      const source = activityCardUrl("sample-dev", "summary", "en")!;
      await cache.search([source]);
      expect(cache.getCard(source)).toEqual({ status: "error", code });
    },
  );

  it.each([
    { success: true, data: basic("another-user"), stale: false },
    { success: true, data: basic(), stale: false, unexpected: true },
    { success: false, code: "invented" },
    { success: true, data: { ...basic(), fetchedAt: "2026-10-21T12:00:00Z" }, stale: false },
  ])("rejects invalid envelopes, identities or timestamps", async (value) => {
    const cache = createActivityDataCache({
      fetch: vi.fn<typeof fetch>().mockResolvedValue(Response.json(value)),
      now: () => initialTime,
    });
    const source = activityCardUrl("sample-dev", "summary", "en")!;
    await cache.search([source]);
    expect(cache.getCard(source)).toEqual({ status: "error", code: "unavailable" });
  });

  it("aborts reset and discards late responses even when the fetch implementation ignores abort", async () => {
    let finish: ((value: Response) => void) | undefined;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    const source = activityCardUrl("sample-dev", "summary", "en")!;
    const task = cache.search([source]);
    const signal = fetcher.mock.calls[0]?.[1]?.signal;
    cache.reset();
    expect(signal?.aborted).toBe(true);
    finish!(success(basic()));
    await task;
    expect(cache.getCard(source)).toEqual({ status: "idle" });
  });

  it("does not display one user's late result for another identity", async () => {
    let finish: ((value: Response) => void) | undefined;
    const cache = createActivityDataCache({
      fetch: vi.fn<typeof fetch>().mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
      now: () => initialTime,
    });
    const first = activityCardUrl("sample-dev", "summary", "en")!;
    const second = activityCardUrl("other-dev", "summary", "en")!;
    const task = cache.search([first]);
    expect(cache.getCard(second)).toEqual({ status: "idle" });
    finish!(success(basic()));
    await task;
    expect(cache.getCard(second)).toEqual({ status: "idle" });
  });

  it("expires at midnight UTC even within 30 minutes and avoids mixing rolling periods", async () => {
    let now = Date.parse("2026-12-31T23:59:00Z");
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => success(extended("sample-dev", now)));
    const cache = createActivityDataCache({ fetch: fetcher, now: () => now });
    const source = stats(["commits"], { commitsPeriod: "year" });
    await cache.search([source]);
    now += 2 * 60_000;
    expect(cache.getCard(source)).toEqual({ status: "idle" });
    await cache.search([source]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("retains a stale snapshot after transient failure but rejects it after 24 hours", async () => {
    let now = initialTime;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success(basic()))
      .mockResolvedValue(Response.json({ success: false, code: "unavailable" }, { status: 503 }));
    const cache = createActivityDataCache({ fetch: fetcher, now: () => now });
    const source = activityCardUrl("sample-dev", "summary", "en")!;
    await cache.search([source]);
    now += 31 * 60_000;
    await cache.search([source]);
    expect(cache.getCard(source)).toMatchObject({ status: "ready", stale: true });
    now += 24 * 60 * 60_000;
    expect(cache.getCard(source).status).not.toBe("ready");
  });

  it("bounds retained fields and decoded data, and handles an empty search", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        success(
          resource(new URL(String(input), "https://local.example").searchParams.get("target")!),
        ),
      );
    const cache = createActivityDataCache({
      fetch: fetcher,
      now: () => initialTime,
      maximumEntries: 2,
    });
    await cache.search([]);
    expect(cache.state([])).toEqual({ loading: false, needsSearch: false, completed: 0, total: 0 });
    const sources = ["a", "b", "c"].map((name) =>
      resourceCardUrl("repository", `owner/${name}`, "en")!,
    );
    await cache.search(sources);
    expect(cache.getCard(sources[0]!).status).toBe("idle");
    expect(cache.getCard(sources[2]!).status).toBe("ready");
    const tiny = createActivityDataCache({
      fetch: fetcher,
      now: () => initialTime,
      maximumBytes: 1,
    });
    await tiny.search([sources[0]!]);
    expect(tiny.getCard(sources[0]!).status).toBe("idle");
  });

  it("respects Retry-After before allowing an explicit retry", async () => {
    let now = initialTime;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        Response.json(
          { success: false, code: "rate_limited", retryAt: "2026-10-20T12:01:00Z" },
          { status: 429 },
        ),
      );
    const cache = createActivityDataCache({ fetch: fetcher, now: () => now });
    const source = stats(["stars"]);
    await cache.search([source]);
    await cache.retry(source);
    expect(fetcher).toHaveBeenCalledTimes(1);
    now += 61_000;
    await cache.retry(source);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("limits overlapping searches to three simultaneous JSON requests", async () => {
    const held: { target: string; finish: (value: Response) => void }[] = [];
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (input) =>
        new Promise<Response>((finish) => {
          held.push({
            target: new URL(String(input), "https://local.example").searchParams.get("target")!,
            finish,
          });
        }),
    );
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    const sources = ["a", "b", "c", "d", "e", "f"].map((name) =>
      resourceCardUrl("repository", `owner/${name}`, "en")!,
    );
    const tasks = sources.map((source) => cache.search([source]));
    expect(fetcher).toHaveBeenCalledTimes(3);
    for (const lookup of held.slice(0, 3)) lookup.finish(success(resource(lookup.target)));
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(6));
    for (const lookup of held.slice(3)) lookup.finish(success(resource(lookup.target)));
    await Promise.all(tasks);
    expect(sources.map((source) => cache.getCard(source).status)).toEqual(Array(6).fill("ready"));
  });

  it("invalidates all retained data for a missing public identity", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        String(input).includes("/activity?") ? success(basic()) : success(extended()),
      );
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    const own = activityCardUrl("sample-dev", "summary", "en")!;
    await cache.search([own, stats(["stars"])]);
    fetcher.mockImplementation(async () =>
      Response.json({ success: false, code: "not_found" }, { status: 404 }),
    );
    await cache.search([stats(["followers"])]);
    expect(cache.getCard(own).status).toBe("idle");
    expect(cache.getCard(stats(["stars"])).status).toBe("idle");
  });

  it("does not restore another in-flight response after credentials become unavailable", async () => {
    let finish: ((value: Response) => void) | undefined;
    const fetcher = vi.fn<typeof fetch>().mockImplementation((input) =>
      String(input).includes("/activity?")
        ? new Promise<Response>((resolve) => {
            finish = resolve;
          })
        : Promise.resolve(
            Response.json({ success: false, code: "not_configured" }, { status: 503 }),
          ),
    );
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    const own = activityCardUrl("sample-dev", "summary", "en")!;
    const task = cache.search([own]);
    await cache.search([stats(["stars"])]);
    finish!(success(basic()));
    await task;
    expect(cache.getCard(own)).toEqual({ status: "idle" });
  });

  it("keeps valid repository metadata visible while supplemental counters load or fail, then retries only missing counters", async () => {
    let finish: ((value: Response) => void) | undefined;
    const fetcher = vi.fn<typeof fetch>().mockImplementation((input) =>
      String(input).includes("/resource?")
        ? Promise.resolve(success(resource()))
        : new Promise<Response>((resolve) => {
            finish = resolve;
          }),
    );
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    const source = resourceCardUrl("repository", "owner/repo", "en", undefined, undefined, {
      contributionUsername: "sample-dev",
      contributionStats: ["authoredIssues"],
    })!;
    const task = cache.search([source]);
    await vi.waitFor(() =>
      expect(cache.getCard(source)).toMatchObject({
        status: "ready",
        supplement: { status: "loading" },
      }),
    );
    expect(cache.getCard(source)).toBe(cache.getCard(source));
    finish!(Response.json({ success: false, code: "unavailable" }, { status: 503 }));
    await task;
    const partial = cache.getCard(source);
    expect(partial).toMatchObject({
      status: "ready",
      stale: false,
      supplement: { status: "error", code: "unavailable" },
    });
    expect(partial.status === "ready" && partial.svg).toContain("Issues authored: —");
    expect(cache.state([source])).toMatchObject({ needsSearch: true, completed: 2, total: 2 });
    fetcher.mockImplementation(async () => success(extended()));
    await cache.retry(source);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(String(fetcher.mock.calls[2]?.[0])).toContain("/api/github/extended?");
    expect(cache.getCard(source)).toMatchObject({ status: "ready", stale: false });
    expect(cache.getCard(source)).not.toHaveProperty("supplement");
    expect(cache.state([source]).needsSearch).toBe(false);
  });

  it("shows retained metadata immediately when supplemental counters have not yet been searched", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => success(resource()));
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    await cache.search([resourceCardUrl("repository", "owner/repo", "en")!]);
    const source = resourceCardUrl("repository", "owner/repo", "en", undefined, undefined, {
      contributionUsername: "sample-dev",
      contributionStats: ["authoredIssues"],
    })!;
    expect(cache.getCard(source)).toMatchObject({
      status: "ready",
      supplement: { status: "idle" },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("drops an expired supplemental snapshot from a memoized resource while retaining its valid metadata", async () => {
    let now = Date.parse("2026-10-20T09:00:00Z");
    const oldTimestamp = Date.parse("2026-10-19T10:00:00Z");
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        String(input).includes("/resource?")
          ? success(resource("owner/repo", now))
          : success(extended("sample-dev", oldTimestamp), true),
      );
    const cache = createActivityDataCache({ fetch: fetcher, now: () => now });
    const source = resourceCardUrl("repository", "owner/repo", "en", undefined, undefined, {
      contributionUsername: "sample-dev",
      contributionStats: ["authoredIssues"],
    })!;
    await cache.search([source]);
    const before = cache.getCard(source);
    expect(before).toMatchObject({ status: "ready", stale: true });
    expect(before).not.toHaveProperty("supplement");
    expect(before.status === "ready" && before.svg).toContain("Issues authored: 2");
    expect(cache.getCard(source)).toBe(before);
    now += 61 * 60_000;
    const after = cache.getCard(source);
    expect(after).toMatchObject({ status: "ready", supplement: { status: "idle" } });
    expect(after.status === "ready" && after.svg).toContain("Issues authored: —");
    expect(after).not.toBe(before);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each(["not_configured", "not_found"] as const)(
    "discards late responses after %s without erasing a newer successful recovery",
    async (code) => {
      let finish: ((value: Response) => void) | undefined;
      const fetcher = vi.fn<typeof fetch>().mockImplementation((input) =>
        String(input).includes("/activity?")
          ? new Promise<Response>((resolve) => {
              finish = resolve;
            })
          : Promise.resolve(Response.json({ success: false, code }, { status: 503 })),
      );
      const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
      const own = activityCardUrl("sample-dev", "summary", "en")!;
      const old = cache.search([own]);
      await cache.search([stats(["followers"])]);
      fetcher.mockImplementation(async () => success(extended()));
      const recovered = stats(["stars"]);
      await cache.search([recovered]);
      expect(cache.getCard(recovered).status).toBe("ready");
      finish!(success(basic()));
      await old;
      expect(cache.getCard(recovered).status).toBe("ready");
      expect(cache.getCard(own).status).toBe("idle");
    },
  );

  it("accepts a one-second clock difference without accepting a future-dated snapshot", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => success(basic("sample-dev", initialTime + 1_000)));
    const cache = createActivityDataCache({ fetch: fetcher, now: () => initialTime });
    const source = activityCardUrl("sample-dev", "summary", "en")!;
    await cache.search([source]);
    expect(cache.getCard(source)).toMatchObject({ status: "ready", stale: false });
    expect(cache.state([source]).needsSearch).toBe(false);
  });

  it("isolates not-found invalidation from similarly named public repositories", async () => {
    let now = initialTime;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        success(
          resource(
            new URL(String(input), "https://local.example").searchParams.get("target")!,
            now,
          ),
        ),
      );
    const cache = createActivityDataCache({ fetch: fetcher, now: () => now });
    const first = resourceCardUrl("repository", "owner/a", "en")!;
    const second = resourceCardUrl("repository", "owner/ab", "en")!;
    await cache.search([first, second]);
    now += 31 * 60_000;
    fetcher.mockImplementation(async () =>
      Response.json({ success: false, code: "not_found" }, { status: 404 }),
    );
    await cache.search([first]);
    expect(cache.getCard(first)).toMatchObject({ status: "error", code: "not_found" });
    expect(cache.getCard(second)).toMatchObject({ status: "ready", stale: true });
  });

  it("rejects oversized streamed JSON without interpreting it as public activity", async () => {
    const oversized = new Uint8Array(2 * 1024 * 1024 + 1);
    const cache = createActivityDataCache({
      fetch: vi.fn<typeof fetch>().mockImplementation(async () => new Response(oversized)),
      now: () => initialTime,
    });
    const source = activityCardUrl("sample-dev", "summary", "en")!;
    await cache.search([source]);
    expect(cache.getCard(source)).toEqual({ status: "error", code: "unavailable" });
  });
});
