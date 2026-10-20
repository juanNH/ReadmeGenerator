export type ActivityDataStorage = {
  load(): Promise<unknown>;
  save(snapshot: unknown): Promise<void>;
  clear(): Promise<void>;
  close?(): void;
};

export const ACTIVITY_CACHE_DATABASE_NAME = "github-profile-generator.activity-cache.v1";
export const ACTIVITY_CACHE_STORE_NAME = "cache";
export const ACTIVITY_CACHE_RECORD_KEY = "public-data";

type StorageOptions = {
  indexedDB?: () => IDBFactory | undefined;
  timeoutMs?: number;
};

/** Stores public snapshots only; callers validate the payload and handle memory fallback. */
export function createActivityIndexedDbStorage(options: StorageOptions = {}): ActivityDataStorage {
  const requestedTimeout = options.timeoutMs ?? 2_000;
  const timeoutMs = Number.isFinite(requestedTimeout)
    ? Math.min(2_000, Math.max(1, requestedTimeout))
    : 2_000;
  const getFactory = options.indexedDB ?? (() => globalThis.indexedDB);
  let connection: IDBDatabase | undefined;
  let opening: { promise: Promise<IDBDatabase>; cancel(): void } | undefined;
  let generation = 0;
  const operations = new Map<IDBTransaction, (error: Error) => void>();

  function forget(database: IDBDatabase) {
    if (connection === database) connection = undefined;
    database.close();
  }

  function cancelTransactions(database: IDBDatabase) {
    for (const [transaction, cancel] of operations) {
      if (transaction.db === database) {
        cancel(new DOMException("Activity storage connection closed", "AbortError"));
      }
    }
  }

  function open(): Promise<IDBDatabase> {
    if (connection) return Promise.resolve(connection);
    if (opening) return opening.promise;

    let cancel = () => {};
    const promise = new Promise<IDBDatabase>((resolve, reject) => {
      let settled = false;
      let request: IDBOpenDBRequest;
      const timer = setTimeout(
        () => fail(new DOMException("Activity storage timed out", "TimeoutError")),
        timeoutMs,
      );

      function fail(error: unknown) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        opening = undefined;
        reject(error);
      }

      cancel = () => fail(new DOMException("Activity storage closed", "AbortError"));
      try {
        const factory = getFactory();
        if (!factory) throw new DOMException("IndexedDB is unavailable", "NotSupportedError");
        request = factory.open(ACTIVITY_CACHE_DATABASE_NAME, 1);
      } catch (error) {
        fail(error);
        return;
      }

      request.onblocked = () =>
        fail(new DOMException("Activity storage upgrade is blocked", "InvalidStateError"));
      request.onerror = () =>
        fail(request.error ?? new DOMException("Cannot open activity storage", "UnknownError"));
      function stopUpgrade() {
        try {
          request.transaction?.abort();
        } catch {
          // The upgrade may already have been aborted by the browser.
        }
        request.result.close();
      }
      request.onupgradeneeded = () => {
        if (settled) {
          stopUpgrade();
          return;
        }
        try {
          if (!request.result.objectStoreNames.contains(ACTIVITY_CACHE_STORE_NAME)) {
            request.result.createObjectStore(ACTIVITY_CACHE_STORE_NAME);
          }
        } catch (error) {
          fail(error);
          stopUpgrade();
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        // An open request cannot be cancelled, so a late connection must be closed.
        if (settled) {
          database.close();
          return;
        }
        settled = true;
        clearTimeout(timer);
        opening = undefined;
        connection = database;
        database.onversionchange = () => {
          cancelTransactions(database);
          forget(database);
        };
        database.onclose = () => {
          cancelTransactions(database);
          if (connection === database) connection = undefined;
        };
        resolve(database);
      };
    });
    // A synchronous security failure is already rejected and must not remain cached.
    const current = { promise, cancel };
    opening = current;
    void promise.then(
      () => {
        if (opening === current) opening = undefined;
      },
      () => {
        if (opening === current) opening = undefined;
      },
    );
    return promise;
  }

  async function transact<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const currentGeneration = generation;
    const deadline = Date.now() + timeoutMs;
    const database = await open();
    if (currentGeneration !== generation) {
      throw new DOMException("Activity storage closed", "AbortError");
    }
    return new Promise<T>((resolve, reject) => {
      let transaction: IDBTransaction;
      let settled = false;
      let value: T;
      const timer = setTimeout(
        () => fail(new DOMException("Activity storage transaction timed out", "TimeoutError")),
        Math.max(0, deadline - Date.now()),
      );

      function fail(error: unknown) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (transaction) {
          operations.delete(transaction);
          try {
            transaction.abort();
          } catch {
            // A finished or already aborted transaction has nothing left to cancel.
          }
        }
        reject(error);
      }

      try {
        transaction = database.transaction(ACTIVITY_CACHE_STORE_NAME, mode);
        operations.set(transaction, fail);
        transaction.onabort = () =>
          fail(
            transaction.error ??
              new DOMException("Activity storage transaction aborted", "AbortError"),
          );
        transaction.onerror = () =>
          fail(
            transaction.error ??
              new DOMException("Activity storage transaction failed", "UnknownError"),
          );
        transaction.oncomplete = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          operations.delete(transaction);
          resolve(value);
        };
        const request = action(transaction.objectStore(ACTIVITY_CACHE_STORE_NAME));
        request.onsuccess = () => {
          value = request.result;
        };
        request.onerror = () =>
          fail(
            request.error ?? new DOMException("Activity storage request failed", "UnknownError"),
          );
      } catch (error) {
        fail(error);
        forget(database);
      }
    });
  }

  return {
    load: () => transact("readonly", (store) => store.get(ACTIVITY_CACHE_RECORD_KEY)),
    save: async (snapshot) => {
      await transact("readwrite", (store) => store.put(snapshot, ACTIVITY_CACHE_RECORD_KEY));
    },
    clear: async () => {
      await transact("readwrite", (store) => store.delete(ACTIVITY_CACHE_RECORD_KEY));
    },
    close: () => {
      generation += 1;
      opening?.cancel();
      opening = undefined;
      if (connection) {
        cancelTransactions(connection);
        forget(connection);
      }
    },
  };
}
