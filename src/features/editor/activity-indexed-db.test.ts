import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVITY_CACHE_DATABASE_NAME,
  ACTIVITY_CACHE_RECORD_KEY,
  ACTIVITY_CACHE_STORE_NAME,
  createActivityIndexedDbStorage,
} from "./activity-indexed-db";

function createRequest<T>() {
  return {
    result: undefined as T,
    error: null as DOMException | null,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
}

function createIndexedDbFake() {
  const requests: ReturnType<typeof createRequest<unknown>>[] = [];
  const transactions: ReturnType<typeof createTransaction>[] = [];
  const stores = new Set<string>();
  let actionFailure: DOMException | undefined;
  let transactionFailure: DOMException | undefined;

  function nextRequest() {
    if (actionFailure) throw actionFailure;
    const request = createRequest<unknown>();
    requests.push(request);
    return request;
  }

  const store = {
    get: vi.fn(nextRequest),
    put: vi.fn(nextRequest),
    delete: vi.fn(nextRequest),
  };

  function createTransaction(mode: IDBTransactionMode) {
    const transaction = {
      db: database as unknown as IDBDatabase,
      mode,
      error: null as DOMException | null,
      onabort: null as (() => void) | null,
      onerror: null as (() => void) | null,
      oncomplete: null as (() => void) | null,
      objectStore: vi.fn(() => store),
      abort: vi.fn(() => transaction.onabort?.()),
    };
    return transaction;
  }

  const database = {
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore: vi.fn((name: string) => stores.add(name)),
    close: vi.fn(),
    onversionchange: null as (() => void) | null,
    onclose: null as (() => void) | null,
    transaction: vi.fn((_store: string, mode: IDBTransactionMode) => {
      if (transactionFailure) throw transactionFailure;
      const transaction = createTransaction(mode);
      transactions.push(transaction);
      return transaction;
    }),
  };
  function createOpenRequest() {
    return {
      ...createRequest<IDBDatabase>(),
      result: database as unknown as IDBDatabase,
      transaction: { abort: vi.fn() },
      onupgradeneeded: null as (() => void) | null,
      onblocked: null as (() => void) | null,
    };
  }
  const opens: ReturnType<typeof createOpenRequest>[] = [];
  function nextOpen() {
    const request = createOpenRequest();
    opens.push(request);
    return request;
  }
  const factory = { open: vi.fn(nextOpen) } as unknown as IDBFactory;
  return {
    factory,
    opens,
    requests,
    transactions,
    database,
    store,
    stores,
    setActionFailure: (error?: DOMException) => {
      actionFailure = error;
    },
    setTransactionFailure: (error?: DOMException) => {
      transactionFailure = error;
    },
    opened: async () => {
      opens.at(-1)?.onsuccess?.();
      await Promise.resolve();
      await Promise.resolve();
    },
    complete: (value?: unknown) => {
      const request = requests.at(-1);
      if (request) {
        request.result = value;
        request.onsuccess?.();
      }
      transactions.at(-1)?.oncomplete?.();
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("activity IndexedDB storage", () => {
  it("opens lazily and creates only its isolated object store", async () => {
    const fake = createIndexedDbFake();
    const storage = createActivityIndexedDbStorage({ indexedDB: () => fake.factory });
    expect(fake.factory.open).not.toHaveBeenCalled();

    const reading = storage.load();
    expect(fake.factory.open).toHaveBeenCalledWith(ACTIVITY_CACHE_DATABASE_NAME, 1);
    fake.opens[0]?.onupgradeneeded?.();
    expect(fake.database.createObjectStore).toHaveBeenCalledExactlyOnceWith(
      ACTIVITY_CACHE_STORE_NAME,
    );
    fake.opens[0]?.onupgradeneeded?.();
    expect(fake.database.createObjectStore).toHaveBeenCalledTimes(1);
    await fake.opened();
    expect(fake.database.transaction).toHaveBeenCalledWith(ACTIVITY_CACHE_STORE_NAME, "readonly");
    expect(fake.store.get).toHaveBeenCalledWith(ACTIVITY_CACHE_RECORD_KEY);
    fake.complete();
    await expect(reading).resolves.toBeUndefined();
    storage.close?.();
  });

  it.each(["save", "clear"] as const)(
    "does not resolve %s until the transaction commits",
    async (method) => {
      const fake = createIndexedDbFake();
      const storage = createActivityIndexedDbStorage({ indexedDB: () => fake.factory });
      const snapshot = { version: 1, entries: ["public"] };
      const settled = vi.fn();
      const operation = (method === "save" ? storage.save(snapshot) : storage.clear()).then(
        settled,
      );
      await fake.opened();
      expect(fake.database.transaction).toHaveBeenCalledWith(
        ACTIVITY_CACHE_STORE_NAME,
        "readwrite",
      );
      if (method === "save") {
        expect(fake.store.put).toHaveBeenCalledWith(snapshot, ACTIVITY_CACHE_RECORD_KEY);
      } else {
        expect(fake.store.delete).toHaveBeenCalledWith(ACTIVITY_CACHE_RECORD_KEY);
      }
      fake.requests[0]?.onsuccess?.();
      await Promise.resolve();
      expect(settled).not.toHaveBeenCalled();
      fake.transactions[0]?.oncomplete?.();
      await operation;
      expect(settled).toHaveBeenCalledTimes(1);
      storage.close?.();
    },
  );

  it("returns the stored value only after a successful read transaction", async () => {
    const fake = createIndexedDbFake();
    const storage = createActivityIndexedDbStorage({ indexedDB: () => fake.factory });
    const reading = storage.load();
    await fake.opened();
    const snapshot = { version: 1, entries: [] };
    fake.complete(snapshot);
    await expect(reading).resolves.toBe(snapshot);
    storage.close?.();
  });

  it("shares an in-flight connection and reuses it for separate transactions", async () => {
    const fake = createIndexedDbFake();
    const storage = createActivityIndexedDbStorage({ indexedDB: () => fake.factory });
    const first = storage.load();
    const second = storage.clear();
    expect(fake.factory.open).toHaveBeenCalledTimes(1);
    await fake.opened();
    expect(fake.transactions).toHaveLength(2);
    fake.transactions[0]?.oncomplete?.();
    fake.transactions[1]?.oncomplete?.();
    await Promise.all([first, second]);
    const third = storage.save({});
    await Promise.resolve();
    fake.complete();
    await third;
    expect(fake.factory.open).toHaveBeenCalledTimes(1);
    storage.close?.();
  });

  it.each(["SecurityError", "NotSupportedError"])(
    "rejects inaccessible IndexedDB with %s and can try again",
    async (name) => {
      const fake = createIndexedDbFake();
      let available = false;
      const error = new DOMException("Blocked", name);
      const storage = createActivityIndexedDbStorage({
        indexedDB: () => {
          if (available) return fake.factory;
          if (name === "SecurityError") throw error;
          return undefined;
        },
      });
      await expect(storage.load()).rejects.toMatchObject({ name });
      available = true;
      const retry = storage.load();
      await fake.opened();
      fake.complete();
      await expect(retry).resolves.toBeUndefined();
      storage.close?.();
    },
  );

  it("rejects a blocked upgrade immediately and closes its eventual connection", async () => {
    const fake = createIndexedDbFake();
    const storage = createActivityIndexedDbStorage({ indexedDB: () => fake.factory });
    const reading = storage.load();
    const rejected = expect(reading).rejects.toMatchObject({ name: "InvalidStateError" });
    fake.opens[0]?.onblocked?.();
    await rejected;
    await fake.opened();
    expect(fake.database.close).toHaveBeenCalledTimes(1);
    expect(fake.database.transaction).not.toHaveBeenCalled();
  });

  it("bounds opening at two seconds and aborts an upgrade arriving after timeout", async () => {
    vi.useFakeTimers();
    const fake = createIndexedDbFake();
    const storage = createActivityIndexedDbStorage({
      indexedDB: () => fake.factory,
      timeoutMs: 20_000,
    });
    const reading = storage.load();
    const rejected = expect(reading).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(2_000);
    await rejected;
    fake.opens[0]?.onupgradeneeded?.();
    expect(fake.opens[0]?.transaction.abort).toHaveBeenCalledTimes(1);
    expect(fake.database.createObjectStore).not.toHaveBeenCalled();
    await fake.opened();
    expect(fake.database.close).toHaveBeenCalledTimes(2);
  });

  it("rejects open failures and closes a late success without retaining it", async () => {
    const fake = createIndexedDbFake();
    const storage = createActivityIndexedDbStorage({ indexedDB: () => fake.factory });
    const reading = storage.load();
    const rejected = expect(reading).rejects.toMatchObject({ name: "UnknownError" });
    fake.opens[0]?.onerror?.();
    await rejected;
    await fake.opened();
    expect(fake.database.close).toHaveBeenCalledTimes(1);
    const retry = storage.load();
    await fake.opened();
    fake.complete();
    await retry;
    expect(fake.factory.open).toHaveBeenCalledTimes(2);
    storage.close?.();
  });

  it("rejects transaction aborts even after request success", async () => {
    const fake = createIndexedDbFake();
    const storage = createActivityIndexedDbStorage({ indexedDB: () => fake.factory });
    const saving = storage.save({ public: true });
    const rejected = expect(saving).rejects.toMatchObject({ name: "AbortError" });
    await fake.opened();
    fake.requests[0]?.onsuccess?.();
    fake.transactions[0]?.onabort?.();
    await rejected;
    fake.transactions[0]?.oncomplete?.();
    storage.close?.();
  });

  it.each(["QuotaExceededError", "DataCloneError", "SecurityError"])(
    "rejects a synchronous %s write failure",
    async (name) => {
      const fake = createIndexedDbFake();
      fake.setActionFailure(new DOMException("Cannot write", name));
      const storage = createActivityIndexedDbStorage({ indexedDB: () => fake.factory });
      const saving = storage.save({});
      const rejected = expect(saving).rejects.toMatchObject({ name });
      await fake.opened();
      await rejected;
      expect(fake.transactions[0]?.abort).toHaveBeenCalledTimes(1);
      expect(fake.database.close).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects an asynchronous quota error and aborts the transaction", async () => {
    const fake = createIndexedDbFake();
    const storage = createActivityIndexedDbStorage({ indexedDB: () => fake.factory });
    const saving = storage.save({});
    const rejected = expect(saving).rejects.toMatchObject({ name: "QuotaExceededError" });
    await fake.opened();
    const request = fake.requests[0];
    if (request) request.error = new DOMException("Quota exceeded", "QuotaExceededError");
    request?.onerror?.();
    await rejected;
    expect(fake.transactions[0]?.abort).toHaveBeenCalledTimes(1);
    storage.close?.();
  });

  it("bounds transaction waits by the original operation deadline and ignores late commits", async () => {
    vi.useFakeTimers();
    const fake = createIndexedDbFake();
    const storage = createActivityIndexedDbStorage({
      indexedDB: () => fake.factory,
      timeoutMs: 100,
    });
    const saving = storage.save({});
    const rejected = expect(saving).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(75);
    await fake.opened();
    await vi.advanceTimersByTimeAsync(25);
    await rejected;
    expect(fake.transactions[0]?.abort).toHaveBeenCalledTimes(1);
    fake.complete();
    storage.close?.();
  });

  it("closes on version changes and opens a fresh connection on the next operation", async () => {
    const fake = createIndexedDbFake();
    const storage = createActivityIndexedDbStorage({ indexedDB: () => fake.factory });
    const reading = storage.load();
    const rejected = expect(reading).rejects.toMatchObject({ name: "AbortError" });
    await fake.opened();
    fake.database.onversionchange?.();
    await rejected;
    expect(fake.database.close).toHaveBeenCalledTimes(1);
    expect(fake.transactions[0]?.abort).toHaveBeenCalledTimes(1);
    const retry = storage.load();
    await fake.opened();
    fake.complete();
    await retry;
    expect(fake.factory.open).toHaveBeenCalledTimes(2);
    storage.close?.();
  });

  it("close cancels an in-flight open and remains reusable without adopting its late result", async () => {
    const fake = createIndexedDbFake();
    const storage = createActivityIndexedDbStorage({ indexedDB: () => fake.factory });
    const reading = storage.load();
    const rejected = expect(reading).rejects.toMatchObject({ name: "AbortError" });
    storage.close?.();
    await rejected;
    const retry = storage.load();
    fake.opens[0]?.onsuccess?.();
    expect(fake.database.close).toHaveBeenCalledTimes(1);
    await fake.opened();
    fake.complete();
    await retry;
    storage.close?.();
  });

  it("close aborts in-flight transactions and closes the connection", async () => {
    const fake = createIndexedDbFake();
    const storage = createActivityIndexedDbStorage({ indexedDB: () => fake.factory });
    const saving = storage.save({});
    const rejected = expect(saving).rejects.toMatchObject({ name: "AbortError" });
    await fake.opened();
    storage.close?.();
    await rejected;
    expect(fake.transactions[0]?.abort).toHaveBeenCalledTimes(1);
    expect(fake.database.close).toHaveBeenCalledTimes(1);
  });

  it("invalidates a connection after failing to create a transaction", async () => {
    const fake = createIndexedDbFake();
    fake.setTransactionFailure(new DOMException("Closed", "InvalidStateError"));
    const storage = createActivityIndexedDbStorage({ indexedDB: () => fake.factory });
    const reading = storage.load();
    const rejected = expect(reading).rejects.toMatchObject({ name: "InvalidStateError" });
    await fake.opened();
    await rejected;
    fake.setTransactionFailure();
    const retry = storage.load();
    await fake.opened();
    fake.complete();
    await retry;
    expect(fake.factory.open).toHaveBeenCalledTimes(2);
    storage.close?.();
  });
});
