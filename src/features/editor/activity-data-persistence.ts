import type { createActivityDataCache } from "./activity-data-cache";
import type { ActivityDataStorage } from "./activity-indexed-db";

export type ActivityStorageState = "loading" | "saving" | "saved" | "memory";

/** Coordinates one disposable browser cache; it never stores authorization or the draft. */
export function createActivityDataPersistence(
  cache: ReturnType<typeof createActivityDataCache>,
  storage?: ActivityDataStorage,
  options: { debounceMs?: number; timeoutMs?: number } = {},
) {
  const listeners = new Set<() => void>();
  let state: ActivityStorageState = storage ? "loading" : "memory";
  let initialized = !storage;
  let initialization: Promise<void> | undefined;
  let initializationSettled = false;
  let generation = 0;
  let disposed = false;
  let lifecycle = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let observedRevision = cache.getDataRevision();
  let savedRevision = observedRevision;
  let queuedRevision = -1;
  let forceWrite = false;
  let queue = Promise.resolve();
  const emit = () => {
    for (const listener of listeners) listener();
  };
  const setState = (next: ActivityStorageState) => {
    state = next;
    emit();
  };
  const cancelTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  async function bounded<T>(operation: Promise<T>): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error("Browser cache is unavailable.")),
            options.timeoutMs ?? 2_500,
          );
        }),
      ]);
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }

  function schedule() {
    if (!storage || disposed || !initialized || state === "memory") return;
    observedRevision = cache.getDataRevision();
    cancelTimer();
    setState("saving");
    timer = setTimeout(() => {
      timer = undefined;
      void flush();
    }, options.debounceMs ?? 200);
  }

  function initialize() {
    if (initialization) return initialization;
    if (!storage || disposed) return Promise.resolve();
    const token = generation;
    initialization = bounded(Promise.resolve().then(() => storage.load()))
      .then((input) => {
        if (token !== generation || disposed) return;
        cache.restoreRecord(input);
        const normalized = cache.exportRecord();
        initialized = true;
        observedRevision = cache.getDataRevision();
        savedRevision = observedRevision;
        queuedRevision = -1;
        setState("saved");
        // Prune expired/invalid rows lazily, keeping the original capture dates.
        if (input !== undefined && input !== null) {
          forceWrite =
            typeof input !== "object" ||
            Array.isArray(input) ||
            !("version" in input) ||
            input.version !== 1 ||
            !("entries" in input) ||
            !Array.isArray(input.entries) ||
            input.entries.length !== normalized.entries.length ||
            Object.keys(input).some((key) => key !== "version" && key !== "entries");
          if (forceWrite) schedule();
        }
      })
      .catch(() => {
        if (token === generation && !disposed) {
          initialized = true;
          setState("memory");
        }
      })
      .finally(() => {
        initializationSettled = true;
      });
    return initialization;
  }

  async function flush() {
    cancelTimer();
    await initialize();
    if (!storage || state === "memory") return queue;
    const snapshot = cache.exportRecord();
    const revision = cache.getDataRevision();
    observedRevision = revision;
    if (!forceWrite && (revision === savedRevision || revision === queuedRevision)) return queue;
    forceWrite = false;
    queuedRevision = revision;
    const token = generation;
    setState("saving");
    queue = queue
      .catch(() => undefined)
      .then(async () => {
        if (token !== generation || state === "memory") return;
        try {
          await bounded(storage.save(snapshot));
          if (token === generation) {
            savedRevision = revision;
            setState(
              cache.getDataRevision() === revision && queuedRevision === revision
                ? "saved"
                : "saving",
            );
          }
        } catch {
          if (token === generation) setState("memory");
        }
      });
    return queue;
  }

  cache.subscribe(() => {
    if (cache.getDataRevision() !== observedRevision) schedule();
  });

  return {
    initialize,
    flush,
    state: () => ({ storageState: state, hasStoredData: cache.entryCount() > 0 }),
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    resume() {
      lifecycle += 1;
      if (disposed && !initialized && initializationSettled) {
        initialization = undefined;
        initializationSettled = false;
      }
      disposed = false;
      return initialize();
    },
    async dispose() {
      const token = ++lifecycle;
      disposed = true;
      cancelTimer();
      cache.cancel();
      await flush();
      if (token === lifecycle && disposed) storage?.close?.();
    },
    reset() {
      generation += 1;
      cancelTimer();
      initialized = false;
      cache.reset();
      observedRevision = cache.getDataRevision();
      forceWrite = false;
      queuedRevision = -1;
      savedRevision = observedRevision;
      initialized = true;
      if (!storage) return Promise.resolve();
      const token = generation;
      setState("saving");
      queue = queue
        .catch(() => undefined)
        .then(async () => {
          try {
            await bounded(storage.clear());
            if (token === generation) setState("saved");
          } catch {
            if (token === generation) setState("memory");
          }
        });
      return queue;
    },
  };
}
