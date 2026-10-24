import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { activityCardUrl } from "@/core/activity";
import { resourceCardUrl } from "@/core/activity/resource-urls";
import { activityExportCheckResultSchema } from "@/core/activity/export-check";

const origin = "https://profiles.example.com";
const source = activityCardUrl("alex", "extended-stats", "en", origin, undefined, undefined, 2)!;

function cardResponse(state = "ready", headers?: HeadersInit) {
  return new Response(null, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "X-Activity-State": state,
      ...headers,
    },
  });
}

function hangingFetch() {
  return vi.fn((_url: string, init: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-23T20:00:00Z"));
  vi.stubEnv("APP_URL", origin);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("public card export check", () => {
  it("checks exact profile/resource URLs anonymously and deduplicates them", async () => {
    const resource = resourceCardUrl(
      "repository",
      "alex/repo",
      "en",
      origin,
      undefined,
      undefined,
      2,
    )!;
    const fetchMock = vi.fn().mockResolvedValue(cardResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { checkActivityCardExport } = await import("./activity-export-check");
    expect(await checkActivityCardExport({ sources: [source, resource, source] })).toEqual({
      status: "ready",
      stale: false,
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([source, resource]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init).toMatchObject({
        method: "HEAD",
        credentials: "omit",
        redirect: "manual",
        cache: "no-store",
        headers: { Accept: "image/svg+xml" },
      });
      expect(Object.keys(init.headers)).toEqual(["Accept"]);
      expect(init.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("accepts stale public images while reporting their state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(cardResponse("stale")));
    const { checkActivityCardExport } = await import("./activity-export-check");
    expect(await checkActivityCardExport({ sources: [source] })).toEqual({
      status: "ready",
      stale: true,
    });
  });

  it.each([
    [
      new Response(null, { status: 302, headers: { Location: "https://private.example.com/sso" } }),
      "protected",
    ],
    [new Response(null, { status: 401 }), "protected"],
    [new Response(null, { status: 403 }), "protected"],
    [new Response(null, { status: 400 }), "incompatible"],
    [new Response(null, { status: 404 }), "incompatible"],
    [new Response(null, { status: 503 }), "unavailable"],
    [
      new Response("<html>Login</html>", { headers: { "Content-Type": "text/html" } }),
      "invalid_response",
    ],
    [cardResponse("unavailable"), "unavailable"],
    [cardResponse("partial"), "invalid_response"],
    [new Response(null, { headers: { "Content-Type": "image/svg+xml" } }), "invalid_response"],
  ])(
    "classifies status and headers without reading or exposing the upstream body: %s",
    async (response, reason) => {
      const fetchMock = vi.fn().mockResolvedValue(response);
      vi.stubGlobal("fetch", fetchMock);
      const { checkActivityCardExport } = await import("./activity-export-check");
      expect(await checkActivityCardExport({ sources: [source] })).toEqual({
        status: "failed",
        reason,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [],
    [source.replace(origin, "https://outside.example.com")],
    [source.replace(origin, origin + ".evil.example.com")],
    [source.replace(origin, "http://127.0.0.1")],
    [source.replace("/cards/github/", "/api/github/")],
    [source + "#fragment"],
    [source + "&columns=1"],
    [source.replace("columns=2", "columns=3")],
    [source.replace("?locale=en&columns=2", "?columns=2&locale=en")],
    [source + "&token=secret"],
    [source.toUpperCase()],
    ["x".repeat(12_001)],
    Array.from({ length: 33 }, () => source),
  ])("rejects unknown/noncanonical URLs or excessive lists before fetch: %j", async (sources) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { checkActivityCardExport } = await import("./activity-export-check");
    expect(await checkActivityCardExport({ sources })).toEqual({
      status: "failed",
      reason: "invalid_request",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unexpected request properties and unavailable configuration", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { checkActivityCardExport } = await import("./activity-export-check");
    expect(await checkActivityCardExport({ sources: [source], origin })).toEqual({
      status: "failed",
      reason: "invalid_request",
    });
    vi.stubEnv("APP_URL", "https://host.invalid");
    expect(await checkActivityCardExport({ sources: [source] })).toEqual({
      status: "failed",
      reason: "not_configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a network failure without leaking its message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sensitive upstream address")));
    const { checkActivityCardExport } = await import("./activity-export-check");
    expect(await checkActivityCardExport({ sources: [source] })).toEqual({
      status: "failed",
      reason: "unreachable",
    });
  });

  it("bounds concurrent work to four HEADs, rejects concurrent checks and frees slots", async () => {
    const pending: ((value: Response) => void)[] = [];
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve)));
    vi.stubGlobal("fetch", fetchMock);
    const { checkActivityCardExport } = await import("./activity-export-check");
    const sources = Array.from({ length: 7 }, (_, index) =>
      activityCardUrl(`alex${index}`, "summary", "en", origin)!,
    );
    const first = checkActivityCardExport({ sources });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(await checkActivityCardExport({ sources: [source] })).toEqual({
      status: "failed",
      reason: "busy",
    });
    pending.splice(0, 4).forEach((resolve) => resolve(cardResponse()));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(7));
    pending.splice(0).forEach((resolve) => resolve(cardResponse()));
    expect(await first).toEqual({ status: "ready", stale: false });
    fetchMock.mockResolvedValue(cardResponse());
    expect(await checkActivityCardExport({ sources: [source] })).toEqual({
      status: "ready",
      stale: false,
    });
  });

  it("cancels other HEADs and stops starting work after the first failure", async () => {
    const fetchMock = hangingFetch().mockResolvedValueOnce(new Response(null, { status: 302 }));
    vi.stubGlobal("fetch", fetchMock);
    const { checkActivityCardExport } = await import("./activity-export-check");
    const sources = Array.from({ length: 8 }, (_, index) =>
      activityCardUrl(`alex${index}`, "summary", "en", origin)!,
    );
    expect(await checkActivityCardExport({ sources })).toEqual({
      status: "failed",
      reason: "protected",
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const [, init] of fetchMock.mock.calls) expect(init.signal?.aborted).toBe(true);
    fetchMock.mockResolvedValue(cardResponse());
    expect(await checkActivityCardExport({ sources: [source] })).toEqual({
      status: "ready",
      stale: false,
    });
  });

  it("times out a hanging HEAD after 15 seconds and releases the active check", async () => {
    const fetchMock = hangingFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { checkActivityCardExport } = await import("./activity-export-check");
    const pending = checkActivityCardExport({ sources: [source] });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await pending).toEqual({ status: "failed", reason: "timeout" });
    fetchMock.mockResolvedValue(cardResponse());
    expect(await checkActivityCardExport({ sources: [source] })).toEqual({
      status: "ready",
      stale: false,
    });
  });

  it("enforces the total 30-second deadline across successive batches", async () => {
    const fetchMock = hangingFetch();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise<Response>((resolve, reject) => {
          const timer = setTimeout(() => resolve(cardResponse()), 14_000);
          init.signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new Error("aborted"));
            },
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { checkActivityCardExport } = await import("./activity-export-check");
    const sources = Array.from({ length: 12 }, (_, index) =>
      activityCardUrl(`alex${index}`, "summary", "en", origin)!,
    );
    const pending = checkActivityCardExport({ sources });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await pending).toEqual({ status: "failed", reason: "timeout" });
    expect(fetchMock).toHaveBeenCalledTimes(12);
  });

  it("cancels outbound checks when their browser request is aborted", async () => {
    const fetchMock = hangingFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { checkActivityCardExport } = await import("./activity-export-check");
    const controller = new AbortController();
    const pending = checkActivityCardExport({ sources: [source] }, controller.signal);
    controller.abort();
    expect(await pending).toEqual({ status: "failed", reason: "unreachable" });
    expect(fetchMock.mock.calls[0]?.[1].signal?.aborted).toBe(true);
  });

  it("limits starts to 60 HEADs per process per minute", async () => {
    const fetchMock = vi.fn().mockResolvedValue(cardResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { checkActivityCardExport } = await import("./activity-export-check");
    const sources = Array.from({ length: 32 }, (_, index) =>
      activityCardUrl(`alex${index}`, "summary", "en", origin)!,
    );
    expect(await checkActivityCardExport({ sources })).toEqual({ status: "ready", stale: false });
    expect(await checkActivityCardExport({ sources })).toEqual({
      status: "failed",
      reason: "busy",
    });
    expect(fetchMock).toHaveBeenCalledTimes(60);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await checkActivityCardExport({ sources: [source] })).toEqual({
      status: "ready",
      stale: false,
    });
  });

  it("limits check requests even when each only needs one HEAD", async () => {
    const fetchMock = vi.fn().mockResolvedValue(cardResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { checkActivityCardExport } = await import("./activity-export-check");
    for (let index = 0; index < 12; index++)
      expect(await checkActivityCardExport({ sources: [source] })).toEqual({
        status: "ready",
        stale: false,
      });
    expect(await checkActivityCardExport({ sources: [source] })).toEqual({
      status: "failed",
      reason: "busy",
    });
    expect(fetchMock).toHaveBeenCalledTimes(12);
  });

  it("reads bounded UTF-8 request JSON without forwarding incoming credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(cardResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { checkActivityExportRequest } = await import("./activity-export-check");
    const request = new Request("https://editor.example.com/api/cards/export-check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "session=private",
        Authorization: "private",
      },
      body: JSON.stringify({ sources: [source] }),
    });
    expect(await checkActivityExportRequest(request)).toEqual({ status: "ready", stale: false });
    expect(fetchMock.mock.calls[0]?.[1].headers).toEqual({ Accept: "image/svg+xml" });
  });

  it.each([
    { body: "not json", type: "application/json" },
    { body: JSON.stringify({ sources: [source] }), type: "text/plain" },
    { body: "x".repeat(512 * 1024 + 1), type: "application/json" },
  ])("rejects malformed or excessive request bodies before fetch", async ({ body, type }) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { checkActivityExportRequest } = await import("./activity-export-check");
    const request = new Request("https://editor.example.com/api/cards/export-check", {
      method: "POST",
      body,
      headers: { "Content-Type": type },
    });
    expect(await checkActivityExportRequest(request)).toEqual({
      status: "failed",
      reason: "invalid_request",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops reading a stalled body after five seconds", async () => {
    const cancel = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { checkActivityExportRequest } = await import("./activity-export-check");
    const request = new Request("https://editor.example.com/api/cards/export-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: new ReadableStream({ cancel }),
      duplex: "half",
    } as RequestInit);
    const pending = checkActivityExportRequest(request);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await pending).toEqual({ status: "failed", reason: "invalid_request" });
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the public result schema strict and requires stale for a ready result", () => {
    expect(activityExportCheckResultSchema.safeParse({ status: "ready" }).success).toBe(false);
    expect(
      activityExportCheckResultSchema.safeParse({ status: "ready", stale: false, url: origin })
        .success,
    ).toBe(false);
    expect(
      activityExportCheckResultSchema.safeParse({ status: "failed", reason: "unknown" }).success,
    ).toBe(false);
  });
});
