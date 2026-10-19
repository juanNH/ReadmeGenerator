import { describe, expect, it } from "vitest";
import {
  activityCardUrl,
  normalizeActivityBaseUrl,
  normalizeGitHubUsername,
  parseActivityCardUrl,
} from "./index";

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
