import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { activityFixture, fixtureNow, githubResponse, languagesFixture } from "./test-fixtures";
import { createEmptyProfile } from "@/core/profile/profile-operations";
import { generateReadme } from "@/core/readme/generate-readme";

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

function successfulFetch() {
  return vi
    .fn()
    .mockResolvedValueOnce(githubResponse(activityFixture()))
    .mockResolvedValueOnce(githubResponse(languagesFixture()));
}

describe("GitHub activity service", () => {
  it("validates usernames before any request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getGitHubActivity } = await import("./activity-service");
    expect(await getGitHubActivity("../../admin")).toEqual({
      success: false,
      code: "invalid_username",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns not configured without attempting GitHub when the token is absent", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getGitHubActivity } = await import("./activity-service");
    expect(await getGitHubActivity("octocat")).toEqual({ success: false, code: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deduplicates simultaneous lookups and reuses a fresh public snapshot", async () => {
    const fetchMock = successfulFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { getGitHubActivity } = await import("./activity-service");
    const [first, second] = await Promise.all([
      getGitHubActivity("Octocat"),
      getGitHubActivity("@octocat"),
    ]);
    expect(first).toMatchObject({ success: true, stale: false });
    expect(second).toEqual(first);
    expect(await getGitHubActivity("octocat")).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns a dated last good snapshot after a provider failure within 24 hours", async () => {
    const fetchMock = successfulFetch().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const { getGitHubActivity } = await import("./activity-service");
    const first = await getGitHubActivity("octocat");
    vi.setSystemTime(new Date(fixtureNow.getTime() + 31 * 60_000));
    const stale = await getGitHubActivity("octocat");
    expect(stale.success && stale.stale).toBe(true);
    expect(stale.success && stale.data.fetchedAt).toBe(fixtureNow.toISOString());
    expect(first.success && stale.success && stale.data).toEqual(first.success ? first.data : null);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await getGitHubActivity("octocat");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retains last good data across a UTC day change while showing it as stale", async () => {
    vi.setSystemTime(new Date("2026-10-19T23:59:50Z"));
    const fetchMock = successfulFetch().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const { getGitHubActivity } = await import("./activity-service");
    await getGitHubActivity("octocat");
    vi.setSystemTime(new Date("2026-10-20T00:00:10Z"));
    const result = await getGitHubActivity("octocat");
    expect(result.success && result.stale).toBe(true);
    expect(result.success && result.data.period.to).toBe("2026-10-19");
  });

  it("does not serve stale data beyond 24 hours", async () => {
    const fetchMock = successfulFetch().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const { getGitHubActivity } = await import("./activity-service");
    await getGitHubActivity("octocat");
    vi.setSystemTime(new Date(fixtureNow.getTime() + 25 * 60 * 60_000));
    expect(await getGitHubActivity("octocat")).toEqual({ success: false, code: "unavailable" });
  });

  it("stops new upstream lookups across usernames while GitHub quota is exhausted", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        githubResponse({ errors: [{ type: "RATE_LIMITED" }] }, { "retry-after": "120" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { getGitHubActivity } = await import("./activity-service");
    expect(await getGitHubActivity("octocat")).toMatchObject({
      success: false,
      code: "rate_limited",
    });
    expect(await getGitHubActivity("someone-else")).toMatchObject({
      success: false,
      code: "rate_limited",
      retryAt: "2026-10-19T12:02:00.000Z",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects unsafe credentials globally without repeatedly probing different usernames", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        githubResponse(activityFixture(), { "x-oauth-scopes": "repo, read:user" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { getGitHubActivity } = await import("./activity-service");
    expect(await getGitHubActivity("octocat")).toEqual({ success: false, code: "not_configured" });
    expect(await getGitHubActivity("someone-else")).toEqual({
      success: false,
      code: "not_configured",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("invalidates cached results when the configured credential changes", async () => {
    const fetchMock = successfulFetch()
      .mockResolvedValueOnce(githubResponse(activityFixture()))
      .mockResolvedValueOnce(githubResponse(languagesFixture()));
    vi.stubGlobal("fetch", fetchMock);
    const { getGitHubActivity } = await import("./activity-service");
    await getGitHubActivity("octocat");
    vi.stubEnv("GITHUB_TOKEN", "a-different-fixture-token");
    await getGitHubActivity("octocat");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("limits concurrent upstream work before allowing another username", async () => {
    const resolvers: ((response: Response) => void)[] = [];
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getGitHubActivity } = await import("./activity-service");
    const pending = ["person1", "person2", "person3", "person4"].map(getGitHubActivity);
    expect(await getGitHubActivity("person5")).toMatchObject({
      success: false,
      code: "rate_limited",
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const resolve of resolvers) resolve(githubResponse({ errors: [{ type: "NOT_FOUND" }] }));
    await Promise.all(pending);
  });

  it("reads the public card origin only from validated server configuration", async () => {
    const { getPublicActivityBaseUrl } = await import("./activity-service");
    vi.stubEnv("APP_URL", "https://profiles.example.com/");
    expect(getPublicActivityBaseUrl()).toBe("https://profiles.example.com");
    vi.stubEnv("APP_URL", "http://127.0.0.1:3000");
    expect(getPublicActivityBaseUrl()).toBeUndefined();
    vi.stubEnv("APP_URL", "https://profiles.example.com/path");
    expect(getPublicActivityBaseUrl()).toBeUndefined();
  });
});

describe("public activity card hosting", () => {
  beforeEach(() => {
    vi.stubEnv("APP_URL", undefined);
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined);
    vi.stubEnv("VERCEL_URL", "temporary-deployment.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "preview-branch.vercel.app");
  });

  it.each(["profiles.example.com", "my-profile.vercel.app"])(
    "uses Vercel's stable production domain when APP_URL is absent: %s",
    async (domain) => {
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", domain);
      const { getPublicActivityBaseUrl } = await import("./activity-service");
      expect(getPublicActivityBaseUrl()).toBe(`https://${domain}`);
    },
  );

  it("prioritizes an explicit public origin in every environment", async () => {
    vi.stubEnv("APP_URL", " https://chosen.example.com/ ");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "automatic.example.com");
    const { getPublicActivityBaseUrl } = await import("./activity-service");
    for (const environment of [undefined, "preview", "production"]) {
      vi.stubEnv("VERCEL_ENV", environment);
      expect(getPublicActivityBaseUrl()).toBe("https://chosen.example.com");
    }
  });

  it.each([undefined, "preview", "development", "staging"])(
    "does not use the production domain outside production: %s",
    async (environment) => {
      vi.stubEnv("VERCEL_ENV", environment);
      vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "profiles.example.com");
      const { getPublicActivityBaseUrl } = await import("./activity-service");
      expect(getPublicActivityBaseUrl()).toBeUndefined();
    },
  );

  it("treats an empty APP_URL as unconfigured and reevaluates the environment", async () => {
    vi.stubEnv("APP_URL", "  ");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "profiles.example.com");
    const { getPublicActivityBaseUrl } = await import("./activity-service");
    expect(getPublicActivityBaseUrl()).toBe("https://profiles.example.com");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(getPublicActivityBaseUrl()).toBeUndefined();
  });

  it.each([
    "http://profiles.example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://user:password@profiles.example.com",
    "https://profiles.example.com/path",
    "https://profiles.example.com?query=1",
    "https://profiles.example.com/#fragment",
    "https://profiles.example.com:444",
  ])("does not hide invalid explicit configuration with a fallback: %s", async (origin) => {
    vi.stubEnv("APP_URL", origin);
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "profiles.example.com");
    const { getPublicActivityBaseUrl } = await import("./activity-service");
    expect(getPublicActivityBaseUrl()).toBeUndefined();
  });

  it.each([
    undefined,
    "",
    "localhost",
    "127.0.0.1",
    "service.internal",
    "https://profiles.example.com",
    "profiles.example.com/",
    "profiles.example.com/path",
    "profiles.example.com\\path",
    "user:password@profiles.example.com",
    "profiles.example.com:443",
    "profiles.example.com?query=1",
    "profiles.example.com#fragment",
    "profiles.example.com\n.evil.example.com",
  ])("rejects a production value that is not a public bare domain: %s", async (domain) => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", domain);
    const { getPublicActivityBaseUrl } = await import("./activity-service");
    expect(getPublicActivityBaseUrl()).toBeUndefined();
  });

  it("exports configured production cards and manual contributions without provider requests", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "profiles.example.com");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getPublicActivityBaseUrl } = await import("./activity-service");
    const profile = createEmptyProfile("en");
    profile.visibility.contributions = true;
    profile.visibility.metrics = true;
    profile.data.metrics = { username: "example-dev", cards: ["calendar", "extended-languages"] };
    profile.data.contributions.items = [
      { id: "guide", title: "A community guide", description: "", url: "" },
    ];

    const result = generateReadme(profile, { activityCardBaseUrl: getPublicActivityBaseUrl() });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.exportIssues).toBeUndefined();
    expect(result.activityCards).toEqual([
      "https://profiles.example.com/cards/github/example-dev/calendar.svg?locale=en",
      "https://profiles.example.com/cards/github/example-dev/extended-languages.svg?locale=en",
    ]);
    expect(result.markdown).toContain("A community guide");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
