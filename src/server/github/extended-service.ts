import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizeGitHubUsername } from "@/core/activity";
import {
  extendedLanguageOptionsSchema,
  extendedStatsOptionsSchema,
  type ExtendedLanguageOptions,
  type ExtendedStatsOptions,
} from "@/core/activity/extended-options";
import type {
  ExtendedProfileResult,
  ExtendedProfileSnapshot,
} from "@/core/activity/extended-types";
import { activityPeriod, GitHubActivityError } from "./client";
import { fetchExtendedProfile } from "./extended-client";
import { enqueuePublicLookup, PublicLookupQueueError } from "./public-lookup-queue";

const freshForMs = 30 * 60_000;
const staleForMs = 24 * 60 * 60_000;
const maximumCacheEntries = 512;
const failureCacheMs = 60_000;
type Failure = Extract<ExtendedProfileResult, { success: false }>;
type CachedSnapshot = { data: ExtendedProfileSnapshot; storedAt: number };
const snapshots = new Map<string, CachedSnapshot>();
const failures = new Map<string, { result: Failure; expiresAt: number }>();
const pending = new Map<string, Promise<ExtendedProfileResult>>();
let credentialHash = "";
let credentialUnavailableUntil = 0;
let cooldownUntil = 0;

function currentCredential() {
  const token = process.env.GITHUB_TOKEN?.trim();
  const hash = token ? createHash("sha256").update(token).digest("hex") : "";
  if (hash !== credentialHash) {
    snapshots.clear();
    failures.clear();
    cooldownUntil = 0;
    credentialUnavailableUntil = 0;
    credentialHash = hash;
  }
  return { token, hash };
}

/** Objects and set-like options have one cache key regardless of URL/input order. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value))
    return value
      .map(canonicalize)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (typeof value === "object" && value !== null)
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  return typeof value === "string" ? value.toLowerCase() : value;
}

function trimCaches(): void {
  while (snapshots.size + failures.size > maximumCacheEntries) {
    // Expiring failures are expendable before the last successful public result.
    const failureKey = failures.keys().next().value;
    if (failureKey !== undefined) {
      failures.delete(failureKey);
      continue;
    }
    const snapshotKey = snapshots.keys().next().value;
    if (snapshotKey === undefined) break;
    snapshots.delete(snapshotKey);
  }
}

function lastGoodOrFailure(
  cached: CachedSnapshot | undefined,
  now: number,
  failure: Failure,
): ExtendedProfileResult {
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

function rateLimited(now: number, retryAt = Math.max(cooldownUntil, now + 60_000)): Failure {
  return {
    success: false,
    code: "rate_limited",
    retryAt: new Date(Math.max(now + 1000, retryAt)).toISOString(),
  };
}

export async function getExtendedProfile(
  rawUsername: string,
  options: { stats?: ExtendedStatsOptions; languages?: ExtendedLanguageOptions } = {},
): Promise<ExtendedProfileResult> {
  const username = normalizeGitHubUsername(rawUsername);
  if (!username) return { success: false, code: "invalid_username" };
  const parsed = z
    .strictObject({
      stats: extendedStatsOptionsSchema.optional(),
      languages: extendedLanguageOptionsSchema.optional(),
    })
    .safeParse(options);
  if (!parsed.success) return { success: false, code: "unavailable" };
  // Credential removal invalidates the old generation as well as credential replacement.
  const { token, hash } = currentCredential();
  if (!token) return { success: false, code: "not_configured" };
  const now = Date.now();
  if (now < credentialUnavailableUntil) return { success: false, code: "not_configured" };
  const day = activityPeriod(new Date(now)).to;
  const optionsKey = JSON.stringify(canonicalize(parsed.data));
  const snapshotKey = `${hash}:${username}:${optionsKey}`;
  const key = `${snapshotKey}:${day}`;
  const cached = snapshots.get(snapshotKey);
  if (cached && cached.data.period.to === day && now - cached.storedAt < freshForMs)
    return { success: true, data: cached.data, stale: false };
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const failure = failures.get(key);
  if (failure && failure.expiresAt > now) return lastGoodOrFailure(cached, now, failure.result);
  failures.delete(key);
  if (now < cooldownUntil) return lastGoodOrFailure(cached, now, rateLimited(now));
  let startedAt = now;
  const handleFailure = (error: unknown): ExtendedProfileResult => {
    const finishedAt = Date.now();
    if (hash !== currentCredential().hash) return { success: false, code: "not_configured" };
    const result: Failure =
      error instanceof GitHubActivityError
        ? { success: false, code: error.code, ...(error.retryAt ? { retryAt: error.retryAt } : {}) }
        : { success: false, code: "unavailable" };
    const parsedRetryAt = result.retryAt ? Date.parse(result.retryAt) : NaN;
    const retryAt = Number.isFinite(parsedRetryAt) ? parsedRetryAt : finishedAt + failureCacheMs;
    const localQueueFailure = error instanceof PublicLookupQueueError;
    if (result.code === "rate_limited" && !localQueueFailure) cooldownUntil = retryAt;
    if (result.code === "not_configured") {
      credentialUnavailableUntil = finishedAt + 10 * 60_000;
      snapshots.clear();
    }
    if (result.code === "not_found" || result.code === "not_configured")
      snapshots.delete(snapshotKey);
    failures.set(key, {
      result,
      expiresAt: Math.max(finishedAt + (localQueueFailure ? 1000 : failureCacheMs), retryAt),
    });
    trimCaches();
    return lastGoodOrFailure(cached, finishedAt, result);
  };
  const lookup = enqueuePublicLookup(
    () =>
      fetchExtendedProfile(username, token, new Date(startedAt), parsed.data)
        .then((data): ExtendedProfileResult => {
          if (hash !== currentCredential().hash) return { success: false, code: "not_configured" };
          snapshots.delete(snapshotKey);
          snapshots.set(snapshotKey, { data, storedAt: startedAt });
          trimCaches();
          return { success: true, data, stale: false };
        })
        .catch(handleFailure),
    () => {
      startedAt = Date.now();
      if (hash !== currentCredential().hash || !token || startedAt < credentialUnavailableUntil) {
        throw new GitHubActivityError("not_configured");
      }
      if (startedAt < cooldownUntil) {
        throw new GitHubActivityError("rate_limited", new Date(cooldownUntil).toISOString());
      }
    },
  )
    .catch(handleFailure)
    .finally(() => {
      pending.delete(key);
    });
  pending.set(key, lookup);
  return lookup;
}
