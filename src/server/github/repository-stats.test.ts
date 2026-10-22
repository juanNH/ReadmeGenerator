import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getPublicRepositoryStats } from "./repository-stats";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("public repository stats", () => {
  it("reads public star and fork counts with a bounded cache", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ stargazers_count: 17, forks_count: 4 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPublicRepositoryStats()).resolves.toEqual({ stars: 17, forks: 4 });

    const [url, options] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit & { next: { revalidate: number } },
    ];
    expect(url).toBe("https://api.github.com/repos/juanNH/ReadmeGenerator");
    expect(new Headers(options.headers).get("accept")).toBe("application/vnd.github+json");
    expect(options.redirect).toBe("error");
    expect(options.next.revalidate).toBe(6 * 60 * 60);
  });

  it.each([
    new Response(null, { status: 403 }),
    Response.json({ stargazers_count: -1, forks_count: 4 }),
    Response.json({ stargazers_count: "17", forks_count: 4 }),
    Response.json({ stargazers_count: 17 }),
    new Response(
      JSON.stringify({ stargazers_count: 17, forks_count: 4, padding: "x".repeat(33_000) }),
    ),
  ])("returns no counts for unavailable or invalid public metadata", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(getPublicRepositoryStats()).resolves.toBeNull();
  });

  it("falls back when GitHub cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(getPublicRepositoryStats()).resolves.toBeNull();
  });
});
