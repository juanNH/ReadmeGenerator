import type { Page, Route } from "@playwright/test";
import type { ActivitySnapshot } from "../../../src/core/activity/activity-types";
import { parseCardOptions } from "../../../src/core/activity/card-options";
import { extendedStatIds } from "../../../src/core/activity/extended-options";
import type { ExtendedProfileSnapshot } from "../../../src/core/activity/extended-types";
import type { ResourceKind, ResourceSnapshot } from "../../../src/core/activity/resource-types";

function period(now = new Date()) {
  const to = now.toISOString().slice(0, 10);
  const from = new Date(Date.parse(`${to}T00:00:00Z`) - 364 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return { from, to };
}

export function activitySnapshot(username = "example-dev"): ActivitySnapshot {
  const dates = period();
  return {
    username,
    fetchedAt: new Date().toISOString(),
    period: dates,
    calendar: {
      total: 7,
      includesPrivateCounts: false,
      weeks: [{ days: [{ date: dates.to, count: 7, level: 2 }] }],
    },
    summary: { commits: 4, pullRequests: 2, issues: 1, reviews: 0 },
    languages: {
      repositoriesAnalyzed: 2,
      repositoriesTotal: 2,
      truncated: false,
      items: [
        { name: "TypeScript", bytes: 700, color: "#3178c6" },
        { name: "JavaScript", bytes: 300, color: "#f1e05a" },
      ],
    },
    highlights: [],
  };
}

export function extendedSnapshot(url: URL): ExtendedProfileSnapshot {
  const options = parseCardOptions(
    new URLSearchParams([...url.searchParams].filter(([key]) => key !== "username")),
  )?.extended;
  const stats = options?.stats;
  const requested = new Set(stats?.items ?? []);
  const snapshot: ExtendedProfileSnapshot = {
    username: url.searchParams.get("username") ?? "example-dev",
    displayName: "Public fixture developer",
    fetchedAt: new Date().toISOString(),
    period: period(),
    stats: Object.fromEntries(
      extendedStatIds.map((id) => [
        id,
        {
          value: requested.has(id) ? (id === "followers" ? 0 : 12) : null,
          scope:
            id === "stars" || id === "followers"
              ? "snapshot"
              : id === "reviews" ||
                  id === "repositoriesContributedTo" ||
                  (id === "commits" && stats?.commitsPeriod !== "all")
                ? "period"
                : "lifetime",
          partial: false,
        },
      ]),
    ) as ExtendedProfileSnapshot["stats"],
    languages: {
      items: options?.languages
        ? [
            { name: "TypeScript", bytes: 700, repositoryCount: 2, color: "#3178c6" },
            { name: "JavaScript", bytes: 300, repositoryCount: 1, color: "#f1e05a" },
          ]
        : [],
      repositoriesAnalyzed: options?.languages ? 2 : 0,
      repositoriesTotal: options?.languages ? 2 : 0,
      truncated: false,
    },
  };
  return snapshot;
}

export function resourceSnapshot(kind: ResourceKind, target: string): ResourceSnapshot {
  const fetchedAt = new Date().toISOString();
  if (kind === "repository") {
    const [owner = "octocat", name = "hello-world"] = target.split("/");
    return {
      kind,
      target,
      fetchedAt,
      owner,
      name,
      description: "A public repository fixture",
      stars: 4,
      forks: 2,
      language: { name: "TypeScript", color: "#3178c6" },
    };
  }
  if (kind === "gist")
    return {
      kind,
      target,
      fetchedAt,
      owner: "octocat",
      description: "A public Gist fixture",
      files: 2,
      comments: 1,
      stars: 0,
      forks: 1,
      language: { name: "JavaScript", color: "#f1e05a" },
    };
  return {
    kind,
    target,
    fetchedAt,
    range: "last_7_days",
    languages: [{ name: "TypeScript", seconds: 3600, percent: 100 }],
    totalSeconds: 3600,
  };
}

export function activityDataStubs(page: Page) {
  let hold = false;
  const failures = new Map<string, unknown>();
  const requests: URL[] = [];
  const cardRequests: string[] = [];
  const unauthorized: string[] = [];
  const queued: { url: URL; finish: () => Promise<void>; fail: () => Promise<void> }[] = [];
  let transform: ((url: URL, data: unknown) => unknown) | undefined;
  const respond = async (route: Route, url: URL) => {
    const failure = failures.get(url.pathname);
    if (failure) {
      failures.delete(url.pathname);
      return route.fulfill({ json: failure });
    }
    const data =
      url.pathname === "/api/github/activity"
        ? activitySnapshot(url.searchParams.get("username") ?? "example-dev")
        : url.pathname === "/api/github/extended"
          ? extendedSnapshot(url)
          : resourceSnapshot(
              url.searchParams.get("kind") as ResourceKind,
              url.searchParams.get("target") ?? "",
            );
    await route.fulfill({
      json: { success: true, data: transform ? transform(url, data) : data, stale: false },
    });
  };
  const ready = Promise.all([
    page.route("**/api/github/**", async (route) => {
      const url = new URL(route.request().url());
      requests.push(url);
      if (route.request().headers().authorization) unauthorized.push(url.href);
      if (!hold) return respond(route, url);
      await new Promise<void>((resolve) => {
        queued.push({
          url,
          finish: async () => {
            await respond(route, url).catch(() => undefined);
            resolve();
          },
          fail: async () => {
            await route
              .fulfill({ json: { success: false, code: "unavailable" } })
              .catch(() => undefined);
            resolve();
          },
        });
      });
    }),
    page.route("**/cards/**", async (route) => {
      cardRequests.push(route.request().url());
      await route.abort("blockedbyclient");
    }),
  ]);
  return {
    ready,
    requests,
    cardRequests,
    unauthorized,
    queued,
    setHold(value: boolean) {
      hold = value;
    },
    failNext(
      path = "/api/github/extended",
      failure: unknown = { success: false, code: "unavailable" },
    ) {
      failures.set(path, failure);
    },
    transform(callback: (url: URL, data: unknown) => unknown) {
      transform = callback;
    },
    async releaseAll() {
      await Promise.all(queued.splice(0).map((request) => request.finish()));
    },
  };
}

/** Only reads a Blob URL produced internally by the preview, never arbitrary remote SVG. */
export async function localCardSvg(page: Page, index = 0): Promise<string> {
  return page
    .getByRole("article")
    .locator("img")
    .nth(index)
    .evaluate(async (image) => {
      const source = (image as HTMLImageElement).src;
      if (!source.startsWith("blob:"))
        throw new Error("A preview must use an internally generated Blob.");
      return (await fetch(source)).text();
    });
}
