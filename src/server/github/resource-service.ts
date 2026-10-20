import "server-only";

import { createHash } from "node:crypto";
import {
  normalizeResourceTarget,
  resourceKinds,
  type ResourceKind,
  type ResourceResult,
  type ResourceSnapshot,
} from "@/core/activity/resource-types";
import { GitHubActivityError } from "./client";
import { enqueuePublicLookup, PublicLookupQueueError } from "./public-lookup-queue";
import { fetchPublicResource } from "./resource-client";

const freshForMs = 30 * 60_000;
const staleForMs = 24 * 60 * 60_000;
const failureForMs = 60_000;
const maximumCacheEntries = 512;

type Failure = Extract<ResourceResult, { success: false }>;
type CacheEntry =
  | { type: "snapshot"; data: ResourceSnapshot; storedAt: number }
  | { type: "failure"; result: Failure; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<ResourceResult>>();
let credentialHash = "";
let credentialUnavailableUntil = 0;
const cooldowns = { github: 0, wakatime: 0 };

function store(key: string, value: CacheEntry) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > maximumCacheEntries) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function clearGitHubCache() {
  for (const key of cache.keys()) {
    if (!key.startsWith("wakatime:")) cache.delete(key);
  }
}

function currentCredential() {
  const token = process.env.GITHUB_TOKEN?.trim();
  const hash = createHash("sha256")
    .update(token ?? "")
    .digest("hex");
  if (hash !== credentialHash) {
    clearGitHubCache();
    credentialHash = hash;
    credentialUnavailableUntil = 0;
    cooldowns.github = 0;
  }
  return { token, hash };
}

function staleOrFailure(
  cached: Extract<CacheEntry, { type: "snapshot" }> | undefined,
  now: number,
  failure: Failure,
): ResourceResult {
  return cached &&
    now - cached.storedAt <= staleForMs &&
    failure.code !== "not_found" &&
    failure.code !== "not_configured"
    ? { success: true, data: cached.data, stale: true }
    : failure;
}

/** Optional public lookups, isolated from ProfileDocument and never accepting external URLs. */
export async function getPublicResource(
  kind: ResourceKind,
  rawTarget: string,
): Promise<ResourceResult> {
  if (!resourceKinds.includes(kind) || typeof rawTarget !== "string") {
    return { success: false, code: "invalid_username" };
  }
  const target = normalizeResourceTarget(kind, rawTarget);
  if (!target) return { success: false, code: "invalid_username" };
  const isGitHub = kind !== "wakatime";
  const { token, hash } = isGitHub ? currentCredential() : { token: undefined, hash: "anonymous" };
  if (isGitHub && !token) return { success: false, code: "not_configured" };
  const now = Date.now();
  if (isGitHub && credentialUnavailableUntil > now)
    return { success: false, code: "not_configured" };
  const key = isGitHub ? `${kind}:${hash}:${target}` : `${kind}:${target}`;
  const failureKey = `${key}:failure`;
  const entry = cache.get(key);
  const cached = entry?.type === "snapshot" ? entry : undefined;
  if (cached && now - cached.storedAt < freshForMs) {
    return { success: true, data: cached.data, stale: false };
  }
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const failure = cache.get(failureKey);
  if (failure?.type === "failure" && failure.expiresAt > now) {
    return staleOrFailure(cached, now, failure.result);
  }
  cache.delete(failureKey);
  const provider = isGitHub ? "github" : "wakatime";
  if (now < cooldowns[provider]) {
    return staleOrFailure(cached, now, {
      success: false,
      code: "rate_limited",
      retryAt: new Date(cooldowns[provider]).toISOString(),
    });
  }
  let startedAt = now;
  const handleFailure = (error: unknown): ResourceResult => {
    const finishedAt = Date.now();
    if (isGitHub && hash !== currentCredential().hash)
      return { success: false, code: "not_configured" };
    const result: Failure =
      error instanceof GitHubActivityError
        ? { success: false, code: error.code, ...(error.retryAt ? { retryAt: error.retryAt } : {}) }
        : { success: false, code: "unavailable" };
    const parsedRetryAt = result.retryAt ? Date.parse(result.retryAt) : NaN;
    const retryAt = Number.isFinite(parsedRetryAt) ? parsedRetryAt : finishedAt + failureForMs;
    const localQueueFailure = error instanceof PublicLookupQueueError;
    if (result.code === "rate_limited" && !localQueueFailure) cooldowns[provider] = retryAt;
    if (isGitHub && result.code === "not_configured") {
      credentialUnavailableUntil = finishedAt + 10 * 60_000;
      clearGitHubCache();
    }
    if (result.code === "not_found" || result.code === "not_configured") cache.delete(key);
    store(failureKey, {
      type: "failure",
      result,
      expiresAt: Math.max(finishedAt + (localQueueFailure ? 1000 : failureForMs), retryAt),
    });
    return staleOrFailure(cached, finishedAt, result);
  };
  const lookup = enqueuePublicLookup(
    () =>
      fetchPublicResource(kind, target, token, new Date(startedAt))
        .then((data): ResourceResult => {
          // A request started with previous credentials cannot repopulate or return its old result.
          if (isGitHub && hash !== currentCredential().hash)
            return { success: false, code: "not_configured" };
          store(key, { type: "snapshot", data, storedAt: startedAt });
          cache.delete(failureKey);
          return { success: true, data, stale: false };
        })
        .catch(handleFailure),
    () => {
      startedAt = Date.now();
      if (
        isGitHub &&
        (hash !== currentCredential().hash || !token || startedAt < credentialUnavailableUntil)
      ) {
        throw new GitHubActivityError("not_configured");
      }
      if (startedAt < cooldowns[provider]) {
        throw new GitHubActivityError("rate_limited", new Date(cooldowns[provider]).toISOString());
      }
    },
  )
    .catch(handleFailure)
    .finally(() => pending.delete(key));
  pending.set(key, lookup);
  return lookup;
}
