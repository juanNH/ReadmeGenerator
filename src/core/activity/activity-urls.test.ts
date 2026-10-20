import { describe, expect, it } from "vitest";
import {
  activityCardUrl,
  normalizeActivityBaseUrl,
  normalizeGitHubUsername,
  parseActivityCardUrl,
} from "./index";
import { parseCardOptions } from "./card-options";
import type { ExtendedStatsOptions } from "./extended-options";

describe("GitHub activity identifiers and public image URLs", () => {
  it.each([
    [" Alex-Example ", "alex-example"],
    ["@Sam", "sam"],
    ["a", "a"],
    ["", null],
    ["bad--login", null],
    ["-bad", null],
    ["bad-", null],
    ["a/b", null],
    ["<img>", null],
    ["a".repeat(40), null],
  ] as const)("normalizes %s without allowing path or markup injection", (value, expected) => {
    expect(normalizeGitHubUsername(value)).toBe(expected);
  });

  it.each([
    undefined,
    "",
    "http://profiles.example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://10.0.0.1",
    "https://[::1]",
    "https://app.local",
    "https://user:pass@profiles.example.com",
    "https://profiles.example.com/path",
    "https://profiles.example.com?x=1",
    "https://profiles.example.com/#x",
    "https://profiles.example.com:444",
  ])("rejects an origin that cannot be exported: %s", (value) => {
    expect(normalizeActivityBaseUrl(value)).toBeNull();
  });

  it("builds exactly matching local and public card paths", () => {
    expect(normalizeActivityBaseUrl(" https://profiles.example.com/ ")).toBe(
      "https://profiles.example.com",
    );
    const path = "/cards/github/alex/calendar.svg?locale=es";
    expect(activityCardUrl("@Alex", "calendar", "es")).toBe(path);
    expect(parseActivityCardUrl(path)).toEqual({
      username: "alex",
      card: "calendar",
      locale: "es",
      localUrl: path,
    });
    expect(
      parseActivityCardUrl(`https://profiles.example.com${path}`, "https://profiles.example.com"),
    ).toEqual({ username: "alex", card: "calendar", locale: "es", localUrl: path });
  });

  it("keeps Extended cards recognizable when counters change after ranking is enabled", () => {
    // UI edits append fields in the order they are changed; schema parsing uses its own order.
    const changes: ExtendedStatsOptions[] = [
      { showRank: true, items: ["stars", "pullRequests", "issues"] },
      { showRank: true, items: ["pullRequests", "issues"] },
      { showRank: true, items: ["pullRequests", "issues", "followers"] },
      { showRank: true, items: ["pullRequests", "issues", "followers", "stars"] },
    ];
    for (const stats of changes) {
      const url = activityCardUrl("alex", "extended-stats", "es", undefined, undefined, {
        stats,
      })!;
      const parsed = parseActivityCardUrl(url);
      expect(parsed?.localUrl).toBe(url);
      expect(parsed?.extended?.stats).toEqual(stats);
      expect(parsed?.extended?.stats?.items).toEqual(stats.items);
      const serverOptions = parseCardOptions(new URL(url, "https://preview.example").searchParams);
      expect(serverOptions).not.toBeNull();
      expect(
        activityCardUrl(
          "alex",
          "extended-stats",
          "es",
          undefined,
          undefined,
          serverOptions?.extended,
        ),
      ).toBe(url);
    }
  });

  it("keeps nested appearance and filters canonical across fresh edits and recovery", () => {
    const appearance = {
      backgroundGradient: { colors: ["#112233", "#abcdef"], angle: 90 },
      showIcons: true,
    };
    const stats: ExtendedStatsOptions = {
      owners: ["octocat", "alex"],
      showRank: true,
      items: ["followers", "stars"],
      commitsPeriod: "year",
      year: 2025,
    };
    const url = activityCardUrl(
      "alex",
      "extended-stats",
      "en",
      "https://profiles.example.com",
      appearance,
      { stats },
    )!;
    const parsed = parseActivityCardUrl(url, "https://profiles.example.com");
    expect(parsed?.appearance).toEqual(appearance);
    expect(parsed?.extended?.stats).toEqual(stats);
    expect(parsed?.localUrl).toBe(
      activityCardUrl("alex", "extended-stats", "en", undefined, appearance, { stats }),
    );
  });

  it.each([
    "https://elsewhere.example/cards/github/alex/calendar.svg?locale=es",
    "/cards/github/Alex/calendar.svg?locale=es",
    "/cards/github/alex/calendar.svg?locale=es&url=other",
    "/cards/github/alex/calendar.svg?locale=es#x",
    "/cards/github/alex/custom.svg?locale=es",
    "/cards/github/alex/calendar.svg?locale=fr",
    "/cards/github/../calendar.svg?locale=es",
  ])("does not recognize an ungenerated card image %s", (value) => {
    expect(parseActivityCardUrl(value)).toBeNull();
  });
});
