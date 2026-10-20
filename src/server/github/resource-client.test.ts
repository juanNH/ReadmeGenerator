import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fetchPublicResource } from "./resource-client";

const now = new Date("2026-10-20T12:00:00Z");
const token = "fixture-public-token";
const gistId = "abcdef1234567890";

function repository(name = "sample") {
  return {
    full_name: `octocat/${name}`,
    name,
    owner: { login: "octocat" },
    private: false,
    visibility: "public",
    description: "Public repository",
    stargazers_count: 0,
    forks_count: 2,
    language: "TypeScript",
  };
}

function gist() {
  return {
    id: gistId,
    node_id: "G_fixture",
    public: true,
    description: "Public gist",
    owner: { login: "octocat" },
    files: {
      "sample.ts": {
        filename: "sample.ts",
        content: "embedded source must not escape",
        raw_url: "https://gist.githubusercontent.com/never-fetch-this",
      },
    },
    comments: 0,
  };
}

function gistDetails() {
  return {
    data: {
      node: {
        __typename: "Gist",
        id: "G_fixture",
        name: gistId,
        isPublic: true,
        owner: { login: "octocat" },
        stargazerCount: 3,
        forks: { totalCount: 1 },
        files: [{ language: { name: "TypeScript", color: "#3178c6" } }],
      },
    },
  };
}

function wakaTime() {
  return {
    data: {
      username: "public-user",
      user_id: "account-id",
      range: "last_7_days",
      is_coding_activity_visible: true,
      is_language_usage_visible: true,
      is_up_to_date: true,
      total_seconds_including_other_language: 120,
      languages: [{ name: "TypeScript", total_seconds: 120, percent: 100 }],
    },
  };
}

function githubResponse(data: unknown, scopes = "public_repo") {
  return Response.json(data, { headers: { "x-oauth-scopes": scopes } });
}

function respond(...responses: Response[]) {
  const fetchMock = vi.fn();
  responses.forEach((response) => fetchMock.mockResolvedValueOnce(response));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("public resource client", () => {
  it("returns zero public counts as data and uses a fixed GitHub endpoint", async () => {
    const fetchMock = respond(githubResponse(repository()));
    const result = await fetchPublicResource("repository", "OctoCat/Sample", token, now);
    expect(result).toMatchObject({
      kind: "repository",
      target: "octocat/sample",
      stars: 0,
      forks: 2,
    });
    const [endpoint, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toBe("https://api.github.com/repos/octocat/sample");
    expect(options).toMatchObject({ method: "GET", redirect: "error", cache: "no-store" });
  });

  it.each([
    { private: true, visibility: "private" },
    { private: false, visibility: "internal" },
  ])(
    "excludes non-public repositories before relying on their metadata: %j",
    async (visibility) => {
      respond(githubResponse(visibility));
      await expect(
        fetchPublicResource("repository", "octocat/sample", token, now),
      ).rejects.toMatchObject({ code: "not_found" });
    },
  );

  it("rejects a public repository whose returned identity differs from the requested target", async () => {
    respond(githubResponse(repository("different")));
    await expect(
      fetchPublicResource("repository", "octocat/sample", token, now),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it.each([null, "repo", "read:user", "public_repo, read:user"])(
    "rejects unverifiable or excessive scopes before reading a body: %s",
    async (scope) => {
      const response =
        scope === null ? Response.json(repository()) : githubResponse(repository(), scope);
      const read = vi.spyOn(response.body!, "getReader");
      respond(response);
      await expect(
        fetchPublicResource("repository", "octocat/sample", token, now),
      ).rejects.toMatchObject({ code: "not_configured" });
      expect(read).not.toHaveBeenCalled();
    },
  );

  it("accepts the verified empty scope for public REST metadata", async () => {
    respond(githubResponse(repository(), ""));
    expect(await fetchPublicResource("repository", "octocat/sample", token, now)).toMatchObject({
      stars: 0,
    });
  });

  it("does not query GitHub without a server token", async () => {
    const fetchMock = respond();
    await expect(
      fetchPublicResource("repository", "octocat/sample", undefined, now),
    ).rejects.toMatchObject({ code: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("excludes a secret Gist reachable by ID without consulting GraphQL or raw content", async () => {
    const fetchMock = respond(githubResponse({ public: false }));
    await expect(fetchPublicResource("gist", gistId, token, now)).rejects.toMatchObject({
      code: "not_found",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns only Gist metadata after both API responses confirm its identity and public visibility", async () => {
    const fetchMock = respond(githubResponse(gist()), githubResponse(gistDetails()));
    const result = await fetchPublicResource("gist", gistId, token, now);
    expect(result).toMatchObject({
      kind: "gist",
      target: gistId,
      files: 1,
      comments: 0,
      stars: 3,
      forks: 1,
    });
    expect(JSON.stringify(result)).not.toContain("embedded source");
    expect(JSON.stringify(result)).not.toContain("raw_url");
    expect(fetchMock.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      `https://api.github.com/gists/${gistId}`,
      "https://api.github.com/graphql",
    ]);
    const options = fetchMock.mock.calls[1]![1] as RequestInit;
    const body = JSON.parse(options.body as string) as { variables: unknown; query: string };
    expect(body.variables).toEqual({ id: "G_fixture" });
    expect(body.query).not.toContain("text");
  });

  it.each(["visibility", "node", "name", "owner"])(
    "rejects a Gist if GraphQL changes its %s",
    async (changed) => {
      const details = gistDetails();
      if (changed === "visibility") details.data.node.isPublic = false;
      if (changed === "node") details.data.node.id = "G_other";
      if (changed === "name") details.data.node.name = "fedcba1234567890";
      if (changed === "owner") details.data.node.owner.login = "someone-else";
      respond(githubResponse(gist()), githubResponse(details));
      await expect(fetchPublicResource("gist", gistId, token, now)).rejects.toMatchObject({
        code: "not_found",
      });
    },
  );

  it("never forwards the GitHub token to WakaTime and does not invent omitted period dates", async () => {
    const fetchMock = respond(Response.json(wakaTime()));
    const result = await fetchPublicResource("wakatime", "public-user", token, now);
    expect(result).toMatchObject({ kind: "wakatime", range: "last_7_days", totalSeconds: 120 });
    expect(result).not.toHaveProperty("period");
    const [endpoint, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toBe("https://api.wakatime.com/api/v1/users/public-user/stats/last_7_days");
    expect(new Headers(options.headers).has("authorization")).toBe(false);
  });

  it.each([
    { is_coding_activity_visible: false, is_language_usage_visible: true },
    { is_coding_activity_visible: true, is_language_usage_visible: false },
    { is_coding_activity_visible: true },
    {},
  ])("requires both public WakaTime visibility choices: %j", async (visibility) => {
    respond(Response.json({ data: visibility }));
    await expect(
      fetchPublicResource("wakatime", "public-user", undefined, now),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects WakaTime statistics that belong to another user", async () => {
    const response = wakaTime();
    response.data.username = "someone-else";
    respond(Response.json(response));
    await expect(
      fetchPublicResource("wakatime", "public-user", undefined, now),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("distinguishes WakaTime update failure from a valid zero total", async () => {
    const updating = wakaTime();
    updating.data.is_up_to_date = false;
    const zero = wakaTime();
    zero.data.languages = [];
    zero.data.total_seconds_including_other_language = 0;
    respond(Response.json(updating), Response.json(zero));
    await expect(
      fetchPublicResource("wakatime", "public-user", undefined, now),
    ).rejects.toMatchObject({ code: "unavailable" });
    expect(await fetchPublicResource("wakatime", "public-user", undefined, now)).toMatchObject({
      totalSeconds: 0,
      languages: [],
    });
  });

  it("rejects arbitrary URLs before making any request", async () => {
    const fetchMock = respond();
    await expect(
      fetchPublicResource("repository", "https://github.com/octocat/sample", token, now),
    ).rejects.toMatchObject({ code: "invalid_username" });
    await expect(
      fetchPublicResource("wakatime", "public-user?api_key=secret", token, now),
    ).rejects.toMatchObject({ code: "invalid_username" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("resource service scheduling", () => {
  it("deduplicates a resource that is still waiting for one of four active slots", async () => {
    vi.resetModules();
    vi.stubEnv("GITHUB_TOKEN", token);
    const { getPublicResource } = await import("./resource-service");
    const releases: Array<(response: Response) => void> = [];
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          releases.push(resolve);
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const requests = Array.from({ length: 5 }, (_, index) =>
      getPublicResource("repository", `octocat/sample-${index}`),
    );
    const duplicate = getPublicResource("repository", "OctoCat/Sample-4");
    expect(fetchMock).toHaveBeenCalledTimes(4);
    releases
      .slice(0, 4)
      .forEach((release, index) => release(githubResponse(repository(`sample-${index}`))));
    await Promise.all(requests.slice(0, 4));
    expect(fetchMock).toHaveBeenCalledTimes(5);
    releases[4]!(githubResponse(repository("sample-4")));
    const [queued, repeated] = await Promise.all([requests[4], duplicate]);
    expect(queued).toMatchObject({
      success: true,
      stale: false,
      data: { target: "octocat/sample-4" },
    });
    expect(repeated).toEqual(queued);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
