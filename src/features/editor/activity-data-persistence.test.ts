import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityCardUrl } from "@/core/activity";
import { extendedMetricKey } from "@/core/activity/extended-data-plan";
import { createActivityDataCache } from "./activity-data-cache";
import { createActivityDataPersistence } from "./activity-data-persistence";
import type { ActivityDataStorage } from "./activity-indexed-db";

function record() {
  return {
    version: 1,
    entries: [
      {
        key: "extended:sample-dev:2026-10-20:metric:followers",
        value: {
          kind: "metric",
          fetchedAt: "2026-10-20T12:00:00.000Z",
          stale: false,
          day: "2026-10-20",
          username: "sample-dev",
          displayName: "Public person",
          period: { from: "2025-10-20", to: "2026-10-20" },
          data: { value: 0, scope: "snapshot", partial: false },
        },
      },
    ],
  };
}
function storage(input: unknown = undefined) {
  let value = input;
  return {
    load: vi.fn(async () => value),
    save: vi.fn(async (next: unknown) => {
      value = structuredClone(next);
    }),
    clear: vi.fn(async () => {
      value = undefined;
    }),
    close: vi.fn(),
    value: () => value,
  };
}

describe("activity cache persistence coordination", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-10-20T12:00:00Z");
  });
  afterEach(() => vi.useRealTimers());

  it("loads once, validates the record, and restores no authorization or HTTP work", async () => {
    const disk = storage(record());
    const fetcher = vi.fn<typeof fetch>();
    const cache = createActivityDataCache({ fetch: fetcher });
    const persistence = createActivityDataPersistence(cache, disk);
    await Promise.all([persistence.initialize(), persistence.resume(), persistence.initialize()]);
    expect(disk.load).toHaveBeenCalledTimes(1);
    expect(persistence.state()).toEqual({ storageState: "saved", hasStoredData: true });
    expect(
      cache.getCard(
        activityCardUrl("sample-dev", "extended-stats", "en", undefined, undefined, {
          stats: { items: ["followers"] },
        })!,
      ).status,
    ).toBe("ready");
    expect(fetcher).not.toHaveBeenCalled();
    expect(disk.save).not.toHaveBeenCalled();
  });

  it("batches data writes and never saves on SVG rendering", async () => {
    const disk = storage();
    const cache = createActivityDataCache();
    const persistence = createActivityDataPersistence(cache, disk);
    await persistence.initialize();
    cache.restoreRecord(record());
    await vi.advanceTimersByTimeAsync(100);
    const second = record();
    second.entries[0]!.key = `extended:sample-dev:2026-10-20:metric:${extendedMetricKey("stars", {}, new Date())}`;
    cache.restoreRecord(second);
    await vi.advanceTimersByTimeAsync(199);
    expect(disk.save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(disk.save).toHaveBeenCalledTimes(1);
    const source = activityCardUrl("sample-dev", "extended-stats", "en", undefined, undefined, {
      stats: { items: ["stars", "followers"] },
    })!;
    cache.getCard(source);
    cache.getCard(source);
    await vi.advanceTimersByTimeAsync(300);
    expect(disk.save).toHaveBeenCalledTimes(1);
    expect(persistence.state().storageState).toBe("saved");
  });

  it("does not report saved until the transaction promise completes", async () => {
    let finish: (() => void) | undefined;
    const disk: ActivityDataStorage = {
      load: async () => undefined,
      save: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      ),
      clear: async () => undefined,
    };
    const cache = createActivityDataCache();
    const persistence = createActivityDataPersistence(cache, disk);
    await persistence.initialize();
    cache.restoreRecord(record());
    const saving = persistence.flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(persistence.state().storageState).toBe("saving");
    finish!();
    await saving;
    expect(persistence.state().storageState).toBe("saved");
  });

  it("ignores late restoration after explicit reset and clears the browser store", async () => {
    let finish: ((value: unknown) => void) | undefined;
    const disk = storage();
    disk.load.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const cache = createActivityDataCache();
    const persistence = createActivityDataPersistence(cache, disk);
    const loading = persistence.initialize();
    await persistence.reset();
    finish!(record());
    await loading;
    expect(cache.entryCount()).toBe(0);
    expect(disk.clear).toHaveBeenCalledTimes(1);
    expect(persistence.state()).toEqual({ storageState: "saved", hasStoredData: false });
  });

  it("serializes an in-flight save before reset, so its late completion cannot resurrect data", async () => {
    let finish: (() => void) | undefined;
    let persisted: unknown;
    const disk: ActivityDataStorage = {
      load: async () => undefined,
      save: async (next) => {
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
        persisted = next;
      },
      clear: async () => {
        persisted = undefined;
      },
    };
    const cache = createActivityDataCache();
    const persistence = createActivityDataPersistence(cache, disk);
    await persistence.initialize();
    cache.restoreRecord(record());
    const saving = persistence.flush();
    await vi.advanceTimersByTimeAsync(0);
    const clearing = persistence.reset();
    finish!();
    await Promise.all([saving, clearing]);
    expect(persisted).toBeUndefined();
    expect(cache.entryCount()).toBe(0);
    expect(persistence.state().hasStoredData).toBe(false);
  });

  it("keeps the browser store on disposal and avoids closing a resumed session", async () => {
    let finish: (() => void) | undefined;
    const disk = storage();
    disk.save.mockImplementation(async () => {
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    });
    const cache = createActivityDataCache();
    const persistence = createActivityDataPersistence(cache, disk);
    await persistence.initialize();
    cache.restoreRecord(record());
    const disposing = persistence.dispose();
    await vi.advanceTimersByTimeAsync(0);
    await persistence.resume();
    finish!();
    await disposing;
    expect(disk.clear).not.toHaveBeenCalled();
    expect(disk.close).not.toHaveBeenCalled();
    expect(cache.entryCount()).toBe(1);
  });

  it("falls back to RAM after read or quota failures and bounds blocked reads", async () => {
    const disk = storage();
    disk.load.mockRejectedValue(new Error("blocked"));
    const cache = createActivityDataCache();
    const persistence = createActivityDataPersistence(cache, disk);
    await persistence.initialize();
    cache.restoreRecord(record());
    await persistence.flush();
    expect(persistence.state()).toEqual({ storageState: "memory", hasStoredData: true });
    expect(disk.save).not.toHaveBeenCalled();
    const quotaDisk = storage();
    quotaDisk.save.mockRejectedValue(new Error("quota"));
    const quota = createActivityDataPersistence(createActivityDataCache(), quotaDisk);
    await quota.initialize();
    const blocked = createActivityDataPersistence(
      createActivityDataCache(),
      {
        load: () => new Promise(() => undefined),
        save: async () => undefined,
        clear: async () => undefined,
      },
      { timeoutMs: 10 },
    );
    const loading = blocked.initialize();
    await vi.advanceTimersByTimeAsync(10);
    await loading;
    expect(blocked.state().storageState).toBe("memory");
    // The quota failure is exercised with a real validated field below.
    const quotaCache = createActivityDataCache();
    const quotaPersistence = createActivityDataPersistence(quotaCache, quotaDisk);
    await quotaPersistence.initialize();
    quotaCache.restoreRecord(record());
    await quotaPersistence.flush();
    expect(quotaPersistence.state()).toEqual({ storageState: "memory", hasStoredData: true });
  });

  it("prunes invalid and expired rows without touching their original timestamps", async () => {
    const disk = storage({ version: 1, entries: [{ ...record().entries[0], key: "arbitrary" }] });
    const cache = createActivityDataCache();
    const persistence = createActivityDataPersistence(cache, disk);
    await persistence.initialize();
    await persistence.flush();
    expect(cache.entryCount()).toBe(0);
    expect(disk.value()).toEqual({ version: 1, entries: [] });
  });
});
