import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("shared public lookup scheduler", () => {
  it("keeps four active requests and starts waiting cards in FIFO order", async () => {
    const { enqueuePublicLookup } = await import("./public-lookup-queue");
    const gates = Array.from({ length: 7 }, () => deferred<number>());
    const starts: number[] = [];
    let active = 0;
    let peak = 0;
    const results = gates.map((gate, index) =>
      enqueuePublicLookup(
        () => {
          starts.push(index);
          active += 1;
          peak = Math.max(peak, active);
          return gate.promise.finally(() => {
            active -= 1;
          });
        },
        () => {},
      ),
    );
    expect(starts).toEqual([0, 1, 2, 3]);
    gates[2]!.resolve(2);
    await results[2];
    expect(starts).toEqual([0, 1, 2, 3, 4]);
    gates.forEach((gate, index) => gate.resolve(index));
    expect(await Promise.all(results)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(starts).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(peak).toBe(4);
  });

  it("bounds waiting work at 32 without cancelling already accepted cards", async () => {
    const { enqueuePublicLookup, PublicLookupQueueError } = await import("./public-lookup-queue");
    const gate = deferred<void>();
    const blockers = Array.from({ length: 4 }, () =>
      enqueuePublicLookup(
        () => gate.promise,
        () => {},
      ),
    );
    const run = vi.fn().mockResolvedValue("ready");
    const waiting = Array.from({ length: 32 }, () => enqueuePublicLookup(run, () => {}));
    await expect(enqueuePublicLookup(run, () => {})).rejects.toBeInstanceOf(PublicLookupQueueError);
    expect(run).not.toHaveBeenCalled();
    gate.resolve();
    await Promise.all(blockers);
    expect(await Promise.all(waiting)).toEqual(Array.from({ length: 32 }, () => "ready"));
    expect(run).toHaveBeenCalledTimes(32);
  });

  it("expires a card after 45 seconds in the queue without launching its lookup", async () => {
    const { enqueuePublicLookup } = await import("./public-lookup-queue");
    const gate = deferred<void>();
    const blockers = Array.from({ length: 4 }, () =>
      enqueuePublicLookup(
        () => gate.promise,
        () => {},
      ),
    );
    const run = vi.fn().mockResolvedValue("late");
    const validate = vi.fn();
    const result = enqueuePublicLookup(run, validate);
    const rejected = expect(result).rejects.toMatchObject({
      name: "PublicLookupQueueError",
      code: "rate_limited",
      retryAt: "2026-10-20T12:00:46.000Z",
    });
    await vi.advanceTimersByTimeAsync(44_999);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    gate.resolve();
    await Promise.all(blockers);
    expect(run).not.toHaveBeenCalled();
    expect(validate).not.toHaveBeenCalled();
  });

  it("revalidates queued work when capacity opens and continues after a rejected validation", async () => {
    const { enqueuePublicLookup } = await import("./public-lookup-queue");
    const { GitHubActivityError } = await import("./client");
    const gate = deferred<void>();
    const blockers = Array.from({ length: 4 }, () =>
      enqueuePublicLookup(
        () => gate.promise,
        () => {},
      ),
    );
    let credentialIsCurrent = true;
    const run = vi.fn().mockResolvedValue("obsolete");
    const obsolete = enqueuePublicLookup(run, () => {
      if (!credentialIsCurrent) throw new GitHubActivityError("not_configured");
    });
    const rejected = expect(obsolete).rejects.toMatchObject({ code: "not_configured" });
    const next = enqueuePublicLookup(
      async () => "current",
      () => {},
    );
    credentialIsCurrent = false;
    gate.resolve();
    await Promise.all(blockers);
    await rejected;
    expect(await next).toBe("current");
    expect(run).not.toHaveBeenCalled();
  });

  it("keeps a caller's remaining deadline instead of starting another 45-second wait", async () => {
    const { enqueuePublicLookup } = await import("./public-lookup-queue");
    const gate = deferred<void>();
    const blockers = Array.from({ length: 4 }, () =>
      enqueuePublicLookup(
        () => gate.promise,
        () => {},
      ),
    );
    const run = vi.fn().mockResolvedValue("late");
    const deadline = Date.now() + 2000;
    const result = enqueuePublicLookup(run, () => {}, deadline);
    const rejected = expect(result).rejects.toMatchObject({ code: "rate_limited" });
    await vi.advanceTimersByTimeAsync(2000);
    await rejected;
    gate.resolve();
    await Promise.all(blockers);
    expect(run).not.toHaveBeenCalled();
  });

  it("releases capacity after asynchronous and synchronous lookup failures", async () => {
    const { enqueuePublicLookup } = await import("./public-lookup-queue");
    const failure = new Error("provider failure");
    await expect(
      enqueuePublicLookup(
        async () => {
          throw failure;
        },
        () => {},
      ),
    ).rejects.toBe(failure);
    await expect(
      enqueuePublicLookup(
        () => {
          throw failure;
        },
        () => {},
      ),
    ).rejects.toBe(failure);
    expect(
      await enqueuePublicLookup(
        async () => "ready",
        () => {},
      ),
    ).toBe("ready");
  });

  it("delays the 61st launch until the next minute while its queue deadline permits", async () => {
    const { enqueuePublicLookup } = await import("./public-lookup-queue");
    for (let index = 0; index < 60; index += 1) {
      await enqueuePublicLookup(
        async () => index,
        () => {},
      );
    }
    await vi.advanceTimersByTimeAsync(40_000);
    const run = vi.fn().mockResolvedValue("next window");
    const waiting = enqueuePublicLookup(run, () => {});
    await vi.advanceTimersByTimeAsync(19_999);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(await waiting).toBe("next window");
    expect(run).toHaveBeenCalledTimes(1);
  });
});
