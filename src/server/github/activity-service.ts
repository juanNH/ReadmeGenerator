import "server-only";

import { createHash } from "node:crypto";
import { normalizeActivityBaseUrl, normalizeGitHubUsername } from "@/core/activity";
import type { ActivityResult, ActivitySnapshot } from "@/core/activity/activity-types";
import { activityPeriod, fetchGitHubActivity, GitHubActivityError } from "./client";

const freshForMs = 30 * 60_000;
const staleForMs = 24 * 60 * 60_000;
const maximumCacheEntries = 512;
const maximumConcurrentLookups = 4;
const maximumLookupsPerMinute = 60;
const failureCacheMs = 60_000;

type CachedSnapshot = { data: ActivitySnapshot; storedAt: number };
type CachedFailure = { result: Extract<ActivityResult, { success: false }>; expiresAt: number };

const snapshots = new Map<string, CachedSnapshot>();
const failures = new Map<string, CachedFailure>();
const pending = new Map<string, Promise<ActivityResult>>();
let minuteStartedAt = 0;
let minuteLookups = 0;
let cooldownUntil = 0;
let credentialHash = "";
let credentialUnavailableUntil = 0;

function trimCache<T>(cache: Map<string, T>) {
  while (cache.size > maximumCacheEntries) {
    const first = cache.keys().next().value;
    if (first === undefined) break;
    cache.delete(first);
  }
}

function rateLimited(
  now: number,
  retryAt = Math.max(cooldownUntil, now + 60_000),
): Extract<ActivityResult, { success: false }> {
  return { success: false, code: "rate_limited", retryAt: new Date(retryAt).toISOString() };
}

function lastGoodOrFailure(
  cached: CachedSnapshot | undefined,
  now: number,
  failure: Extract<ActivityResult, { success: false }>,
): ActivityResult {
  if (
    cached &&
    now - cached.storedAt <= staleForMs &&
    failure.code !== "not_found" &&
    failure.code !== "not_configured"
  ) {
    return { success: true, data: cached.data, stale: true };
  }
  return failure;
}

export function getPublicActivityBaseUrl(): string | undefined {
  return normalizeActivityBaseUrl(process.env.APP_URL) ?? undefined;
}

export async function getGitHubActivity(rawUsername: string): Promise<ActivityResult> {
  const username = normalizeGitHubUsername(rawUsername);
  if (!username) return { success: false, code: "invalid_username" };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) return { success: false, code: "not_configured" };

  // Changing credentials must not reuse data or visibility checked under an old token.
  const hash = createHash("sha256").update(token).digest("hex");
  if (hash !== credentialHash) {
    snapshots.clear();
    failures.clear();
    cooldownUntil = 0;
    credentialUnavailableUntil = 0;
    credentialHash = hash;
  }
  const now = Date.now();
  const day = activityPeriod(new Date(now)).to;
  const snapshotKey = `${hash}:${username}`;
  const key = `${snapshotKey}:${day}`;
  if (now < credentialUnavailableUntil) return { success: false, code: "not_configured" };
  const cached = snapshots.get(snapshotKey);
  if (cached && cached.data.period.to === day && now - cached.storedAt < freshForMs) {
    return { success: true, data: cached.data, stale: false };
  }
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const cachedFailure = failures.get(key);
  if (cachedFailure && cachedFailure.expiresAt > now) {
    return lastGoodOrFailure(cached, now, cachedFailure.result);
  }
  failures.delete(key);

  if (now < cooldownUntil) {
    return lastGoodOrFailure(cached, now, rateLimited(now));
  }
  if (now - minuteStartedAt >= 60_000) {
    minuteStartedAt = now;
    minuteLookups = 0;
  }
  if (pending.size >= maximumConcurrentLookups || minuteLookups >= maximumLookupsPerMinute) {
    return lastGoodOrFailure(cached, now, rateLimited(now, minuteStartedAt + 60_000));
  }
  minuteLookups += 1;

  const lookup = fetchGitHubActivity(username, token, new Date(now))
    .then((data): ActivityResult => {
      if (hash === credentialHash) {
        snapshots.delete(snapshotKey);
        snapshots.set(snapshotKey, { data, storedAt: now });
        trimCache(snapshots);
      }
      return { success: true, data, stale: false };
    })
    .catch((error: unknown): ActivityResult => {
      const failure: Extract<ActivityResult, { success: false }> =
        error instanceof GitHubActivityError
          ? {
              success: false,
              code: error.code,
              ...(error.retryAt ? { retryAt: error.retryAt } : {}),
            }
          : { success: false, code: "unavailable" };
      const retryAt = failure.retryAt ? Date.parse(failure.retryAt) : now + failureCacheMs;
      if (hash === credentialHash) {
        if (failure.code === "rate_limited") cooldownUntil = retryAt;
        if (failure.code === "not_configured") {
          credentialUnavailableUntil = now + 10 * 60_000;
          snapshots.clear();
        }
        failures.set(key, { result: failure, expiresAt: Math.max(now + failureCacheMs, retryAt) });
        trimCache(failures);
        if (failure.code === "not_found" || failure.code === "not_configured") {
          snapshots.delete(snapshotKey);
        }
      }
      return lastGoodOrFailure(cached, now, failure);
    })
    .finally(() => pending.delete(key));
  pending.set(key, lookup);
  return lookup;
}
