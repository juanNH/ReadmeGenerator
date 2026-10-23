import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  activityJsonResponse,
  activitySvgResponse,
  parseActivityRequest,
  parseCardRequest,
} from "./responses";

describe("public activity routes", () => {
  it.each([
    "https://app.example.com/api/github/activity",
    "https://app.example.com/api/github/activity?username=bad--name",
    "https://app.example.com/api/github/activity?username=octocat&username=someone",
    "https://app.example.com/api/github/activity?username=octocat&url=https://private.test",
  ])("rejects malformed or excessive query arguments: %s", (url) => {
    expect(parseActivityRequest(new URL(url))).toBeNull();
  });

  it("normalizes a valid username without accepting an upstream URL", () => {
    expect(
      parseActivityRequest(new URL("https://app.example.com/api/github/activity?username=Octocat")),
    ).toBe("octocat");
  });

  it("accepts only local SVG variants and supported locales", () => {
    expect(
      parseCardRequest("Octocat", "calendar.svg", new URL("https://app.example.com?locale=es")),
    ).toEqual({ username: "octocat", card: "calendar", locale: "es", cardColumns: 1 });
    expect(parseCardRequest("octocat", "summary.svg", new URL("https://app.example.com"))).toEqual({
      username: "octocat",
      card: "summary",
      locale: "en",
    });
    expect(parseCardRequest("octocat", "other.svg", new URL("https://app.example.com"))).toBeNull();
    expect(
      parseCardRequest("octocat", "calendar.svg", new URL("https://app.example.com?locale=fr")),
    ).toBeNull();
    expect(
      parseCardRequest("octocat", "calendar.svg", new URL("https://app.example.com?color=red")),
    ).toBeNull();
  });

  it.each([
    ["summary.svg", "stats"],
    ["calendar.svg", "languages"],
    ["extended-stats.svg", "languages"],
    ["extended-languages.svg", "stats"],
  ])("rejects %s options for another card family: %s", (filename, key) => {
    const url = new URL("https://app.example.com");
    url.searchParams.set(key, "{}");
    expect(parseCardRequest("octocat", filename, url)).toBeNull();
  });

  it.each([
    ["extended-stats.svg", "stats"],
    ["extended-languages.svg", "languages"],
  ])("accepts %s options for its own family: %s", (filename, key) => {
    const url = new URL("https://app.example.com");
    url.searchParams.set(key, "{}");
    expect(parseCardRequest("octocat", filename, url)?.extended).toEqual({ [key]: {} });
  });

  it.each([
    ["invalid_username", 400],
    ["not_found", 404],
    ["not_configured", 503],
    ["rate_limited", 429],
    ["unavailable", 503],
  ] as const)("maps %s to a clear JSON response status", async (code, status) => {
    const response = activityJsonResponse({ success: false, code });
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ success: false, code });
  });

  it("uses an HTTP date for a quota retry", () => {
    const response = activityJsonResponse({
      success: false,
      code: "rate_limited",
      retryAt: "2026-10-19T12:02:00.000Z",
    });
    expect(response.headers.get("retry-after")).toBe("Mon, 19 Oct 2026 12:02:00 GMT");
  });

  it("returns passive SVG with short error and stale cache windows", async () => {
    const unavailable = activitySvgResponse("<svg><title>Unavailable</title></svg>", false, false);
    expect(unavailable.status).toBe(200);
    expect(unavailable.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(unavailable.headers.get("cache-control")).toContain("max-age=60");
    expect(unavailable.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(unavailable.headers.get("x-activity-state")).toBe("unavailable");
    expect(await unavailable.text()).toContain("Unavailable");
    expect(activitySvgResponse("<svg/>", true, true).headers.get("x-activity-state")).toBe("stale");
    expect(activitySvgResponse("<svg/>", true, false).headers.get("cache-control")).toContain(
      "s-maxage=1800",
    );
  });
});
