import "server-only";

import { GitHubActivityError } from "./client";

// Shared by Extended profiles and resource cards in this process. These bounds
// do not replace deployment-wide protection or the clients' 15-second deadline.
const maximumActiveLookups = 4;
const maximumQueuedLookups = 32;
const maximumQueueWaitMs = 45_000;
const maximumLaunchesPerMinute = 60;

type QueuedLookup = {
  deadline: number;
  timer: ReturnType<typeof setTimeout>;
  beforeStart: () => void;
  start: () => void;
  reject: (reason: unknown) => void;
};

const queue: QueuedLookup[] = [];
let activeLookups = 0;
let minuteStartedAt = 0;
let minuteLaunches = 0;
let wakeTimer: ReturnType<typeof setTimeout> | undefined;

/** Local capacity is distinct from a provider quota and must not cool down other jobs. */
export class PublicLookupQueueError extends GitHubActivityError {
  constructor(retryAt: string) {
    super("rate_limited", retryAt);
    this.name = "PublicLookupQueueError";
  }
}

function rateLimited(now: number): PublicLookupQueueError {
  const retryAt =
    minuteLaunches >= maximumLaunchesPerMinute
      ? Math.max(now + 1000, minuteStartedAt + 60_000)
      : now + 1000;
  return new PublicLookupQueueError(new Date(retryAt).toISOString());
}

function drain(): void {
  if (wakeTimer !== undefined) {
    clearTimeout(wakeTimer);
    wakeTimer = undefined;
  }
  const now = Date.now();
  if (now - minuteStartedAt >= 60_000) {
    minuteStartedAt = now;
    minuteLaunches = 0;
  }
  while (activeLookups < maximumActiveLookups && queue.length) {
    if (minuteLaunches >= maximumLaunchesPerMinute) {
      wakeTimer = setTimeout(drain, Math.max(1, minuteStartedAt + 60_000 - Date.now()));
      return;
    }
    const lookup = queue.shift();
    if (!lookup) break;
    clearTimeout(lookup.timer);
    if (lookup.deadline <= Date.now()) {
      lookup.reject(rateLimited(Date.now()));
      continue;
    }
    try {
      // Revalidate credentials and provider cooldown after any queue wait.
      lookup.beforeStart();
    } catch (error) {
      lookup.reject(error);
      continue;
    }
    activeLookups += 1;
    minuteLaunches += 1;
    lookup.start();
  }
}

/** FIFO, bounded waiting; callers keep deduplication across queued and active work. */
export function enqueuePublicLookup<T>(run: () => Promise<T>, beforeStart: () => void): Promise<T> {
  if (queue.length >= maximumQueuedLookups) return Promise.reject(rateLimited(Date.now()));
  return new Promise<T>((resolve, reject) => {
    const release = () => {
      activeLookups -= 1;
      drain();
    };
    const lookup: QueuedLookup = {
      deadline: Date.now() + maximumQueueWaitMs,
      timer: setTimeout(() => {
        const index = queue.indexOf(lookup);
        if (index === -1) return;
        queue.splice(index, 1);
        reject(rateLimited(Date.now()));
        drain();
      }, maximumQueueWaitMs),
      beforeStart,
      start: () => {
        try {
          void run().then(
            (result) => {
              resolve(result);
              release();
            },
            (error: unknown) => {
              reject(error);
              release();
            },
          );
        } catch (error) {
          reject(error);
          release();
        }
      },
      reject,
    };
    queue.push(lookup);
    drain();
  });
}
