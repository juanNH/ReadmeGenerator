import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizeGitHubUsername } from "@/core/activity";
import {
  extendedLanguageOptionsSchema,
  extendedStatIds,
  extendedStatsOptionsSchema,
  type ExtendedStatId,
} from "@/core/activity/extended-options";
import type {
  ExtendedMetric,
  ExtendedProfileResult,
  ExtendedProfileSnapshot,
} from "@/core/activity/extended-types";
import { activityPeriod, GitHubActivityError } from "./client";
import { fetchExtendedProfile, type ExtendedProfileIdentity } from "./extended-client";
import {
  extendedFilterKey,
  extendedMetricKey,
  needsExtendedLanguages,
  selectedExtendedStats,
  type ExtendedDataOptions,
} from "./extended-data-plan";
import { enqueuePublicLookup, PublicLookupQueueError } from "./public-lookup-queue";

const freshForMs = 30 * 60_000;
const staleForMs = 24 * 60 * 60_000;
const maximumCacheEntries = 512;
const failureCacheMs = 60_000;
const maximumFollowers = 32;
type Failure = Extract<ExtendedProfileResult, { success: false }>;
type CachedField = {
  identity: ExtendedProfileIdentity;
  fetchedAt: string;
  period: ExtendedProfileSnapshot["period"];
  storedAt: number;
} & (
  | { kind: "metric"; value: ExtendedMetric }
  | { kind: "languages"; value: ExtendedProfileSnapshot["languages"] }
  | { kind: "identity" }
);
// Coverage is per field/source, not per subset of checkboxes (2^18 combinations).
// A known null/partial value is covered; an absent field has never been requested.
const snapshots = new Map<string, CachedField>();
const failures = new Map<string, { result: Failure; expiresAt: number }>();
const pending = new Map<string, Promise<ExtendedProfileResult>>();
const followers = new Map<string, number>();
let credentialHash = "";
let credentialGeneration = 0;
let credentialUnavailableUntil = 0;
let cooldownUntil = 0;

function currentCredential() {
  const token = process.env.GITHUB_TOKEN?.trim();
  const hash = token ? createHash("sha256").update(token).digest("hex") : "";
  if (hash !== credentialHash) {
    credentialGeneration += 1;
    snapshots.clear();
    failures.clear();
    cooldownUntil = 0;
    credentialUnavailableUntil = 0;
    credentialHash = hash;
  }
  return { token, hash, generation: credentialGeneration };
}

function trimCaches(): void {
  while (snapshots.size + failures.size > maximumCacheEntries) {
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

function rateLimited(now: number, retryAt = Math.max(cooldownUntil, now + 1000)): Failure {
  return {
    success: false,
    code: "rate_limited",
    retryAt: new Date(Math.max(now + 1000, retryAt)).toISOString(),
  };
}

function usable(field: CachedField | undefined, now: number, stale = false): field is CachedField {
  return (
    !!field &&
    now - field.storedAt < (stale ? staleForMs : freshForMs) &&
    (stale || field.period.to === activityPeriod(new Date(now)).to)
  );
}

function requestedFields(prefix: string, options: ExtendedDataOptions, now: Date) {
  const stats = selectedExtendedStats(options);
  const metricKeys = new Map<ExtendedStatId, string>();
  for (const id of stats)
    if (id !== "mergedPullRequestPercentage")
      metricKeys.set(id, `${prefix}:metric:${extendedMetricKey(id, options.stats ?? {}, now)}`);
  const languageKey = needsExtendedLanguages(options)
    ? `${prefix}:languages:${extendedFilterKey(options.languages ?? {}, true)}`
    : undefined;
  return {
    stats,
    metricKeys,
    languageKey,
    keys: [...metricKeys.values(), ...(languageKey ? [languageKey] : [])],
  };
}

function assemble(
  fields: ReturnType<typeof requestedFields>,
  now: number,
  stale = false,
): ExtendedProfileResult | undefined {
  const records = fields.keys.map((key) => snapshots.get(key));
  if (records.some((record) => !usable(record, now, stale))) return undefined;
  const dated = records as CachedField[];
  const oldest = dated.reduce<CachedField | undefined>(
    (oldest, record) => (!oldest || record.storedAt < oldest.storedAt ? record : oldest),
    undefined,
  );
  if (!oldest) return undefined;
  const temporal = [...fields.metricKeys.values()]
    .map((key) => snapshots.get(key))
    .filter(
      (record): record is CachedField =>
        record?.kind === "metric" && record.value.scope === "period",
    );
  // Snapshot metadata may be older than a rolling period. Two rolling periods
  // must never be blended under one interval after a UTC day change.
  if (new Set(temporal.map((record) => JSON.stringify(record.period))).size > 1) return undefined;
  const stats = Object.fromEntries(
    extendedStatIds.map((id) => [
      id,
      {
        value: null,
        partial: false,
        scope:
          id === "stars" || id === "followers"
            ? "snapshot"
            : id === "reviews" || id === "repositoriesContributedTo" || id === "commits"
              ? "period"
              : "lifetime",
      },
    ]),
  ) as Record<ExtendedStatId, ExtendedMetric>;
  for (const [id, key] of fields.metricKeys) {
    const record = snapshots.get(key);
    if (record?.kind === "metric") stats[id] = record.value;
  }
  if (fields.stats.has("mergedPullRequestPercentage")) {
    const total = stats.pullRequests;
    const merged = stats.mergedPullRequests;
    stats.mergedPullRequestPercentage = {
      value:
        total.value === null || merged.value === null || merged.value > total.value
          ? null
          : total.value === 0
            ? 0
            : (merged.value / total.value) * 100,
      partial: total.partial || merged.partial || total.value === null || merged.value === null,
      scope: "lifetime",
    };
  }
  const languageRecord = fields.languageKey ? snapshots.get(fields.languageKey) : undefined;
  return {
    success: true,
    stale: dated.some((record) => !usable(record, now)),
    data: {
      ...oldest.identity,
      fetchedAt: oldest.fetchedAt,
      period: temporal[0]?.period ?? oldest.period,
      stats,
      languages:
        languageRecord?.kind === "languages"
          ? languageRecord.value
          : {
              items: [],
              repositoriesAnalyzed: 0,
              repositoriesTotal: 0,
              truncated: false,
            },
    },
  };
}

function invalidateProfile(prefix: string): void {
  for (const key of snapshots.keys()) if (key.startsWith(`${prefix}:`)) snapshots.delete(key);
  for (const key of failures.keys()) if (key.startsWith(`${prefix}:`)) failures.delete(key);
}

export async function getExtendedProfile(
  rawUsername: string,
  options: ExtendedDataOptions = {},
): Promise<ExtendedProfileResult> {
  return getExtendedProfileWithinDeadline(rawUsername, options, Date.now() + 60_000);
}

async function getExtendedProfileWithinDeadline(
  rawUsername: string,
  options: ExtendedDataOptions,
  deadline: number,
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
  const { token, hash, generation } = currentCredential();
  if (!token) return { success: false, code: "not_configured" };
  const now = Date.now();
  if (now < credentialUnavailableUntil) return { success: false, code: "not_configured" };
  const prefix = `${generation}:${hash}:${username.toLowerCase()}`;
  let fields = requestedFields(prefix, parsed.data, new Date(now));
  const ready = assemble(fields, now);
  if (ready) return ready;
  const globalFailure = failures.get(`${prefix}:failure`);
  if (globalFailure && globalFailure.expiresAt > now) return globalFailure.result;
  let missingKeys = fields.keys.filter((key) => !usable(snapshots.get(key), now));
  for (const key of missingKeys) {
    const failure = failures.get(key);
    if (failure && failure.expiresAt > now) return assemble(fields, now, true) ?? failure.result;
    failures.delete(key);
  }
  if (now < cooldownUntil) return assemble(fields, now, true) ?? rateLimited(now);
  const inFlight = pending.get(prefix);
  if (inFlight) {
    const count = followers.get(prefix) ?? 0;
    if (count >= maximumFollowers) return assemble(fields, now, true) ?? rateLimited(now);
    followers.set(prefix, count + 1);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    try {
      await Promise.race([
        inFlight,
        new Promise<void>((resolve) => {
          timer = setTimeout(
            () => {
              timedOut = true;
              resolve();
            },
            Math.max(0, deadline - Date.now()),
          );
        }),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      const remaining = (followers.get(prefix) ?? 1) - 1;
      if (remaining) followers.set(prefix, remaining);
      else followers.delete(prefix);
    }
    if (timedOut || Date.now() >= deadline)
      return assemble(fields, Date.now(), true) ?? rateLimited(Date.now());
    return getExtendedProfileWithinDeadline(username, parsed.data, deadline);
  }
  if (Date.now() >= deadline) return assemble(fields, now, true) ?? rateLimited(now);

  let startedAt = now;
  let requestOptions: ExtendedDataOptions = {};
  let identity: CachedField | undefined;
  const handleFailure = (error: unknown): ExtendedProfileResult => {
    const finishedAt = Date.now();
    if (generation !== currentCredential().generation)
      return { success: false, code: "not_configured" };
    const result: Failure =
      error instanceof GitHubActivityError
        ? { success: false, code: error.code, ...(error.retryAt ? { retryAt: error.retryAt } : {}) }
        : { success: false, code: "unavailable" };
    const parsedRetryAt = result.retryAt ? Date.parse(result.retryAt) : NaN;
    const retryAt = Number.isFinite(parsedRetryAt) ? parsedRetryAt : finishedAt + failureCacheMs;
    const localQueueFailure = error instanceof PublicLookupQueueError;
    if (result.code === "rate_limited" && !localQueueFailure) cooldownUntil = retryAt;
    if (result.code === "not_configured") {
      credentialGeneration += 1;
      credentialUnavailableUntil = finishedAt + 10 * 60_000;
      snapshots.clear();
      failures.clear();
    }
    if (result.code === "not_found" || result.code === "not_configured") {
      invalidateProfile(prefix);
      failures.set(`${prefix}:failure`, { result, expiresAt: retryAt });
    } else
      for (const key of missingKeys)
        failures.set(key, {
          result,
          expiresAt: Math.max(finishedAt + (localQueueFailure ? 1000 : failureCacheMs), retryAt),
        });
    trimCaches();
    return result.code === "not_found" || result.code === "not_configured"
      ? result
      : (assemble(fields, finishedAt, true) ?? result);
  };
  const lookup = enqueuePublicLookup<ExtendedProfileResult>(
    async () => {
      try {
        const result = await fetchExtendedProfile(
          username,
          token,
          new Date(startedAt),
          requestOptions,
          usable(identity, startedAt) ? identity.identity : undefined,
          deadline,
        );
        if (generation !== currentCredential().generation)
          return { success: false, code: "not_configured" } as const;
        const { data, coverage } = result;
        const metadata = {
          identity: { username: data.username, displayName: data.displayName },
          fetchedAt: data.fetchedAt,
          period: data.period,
          storedAt: startedAt,
        };
        const store = (key: string, record: CachedField) => {
          // A newly requested sibling cannot rejuvenate retained data's age.
          if (usable(snapshots.get(key), startedAt)) return;
          snapshots.delete(key);
          snapshots.set(key, record);
          failures.delete(key);
        };
        store(`${prefix}:identity`, { ...metadata, kind: "identity" });
        for (const id of coverage.stats) {
          if (id === "mergedPullRequestPercentage") continue;
          const key = `${prefix}:metric:${extendedMetricKey(id, requestOptions.stats ?? {}, new Date(startedAt))}`;
          store(key, { ...metadata, kind: "metric", value: data.stats[id] });
        }
        if (coverage.languages)
          store(`${prefix}:languages:${extendedFilterKey(requestOptions.languages ?? {}, true)}`, {
            ...metadata,
            kind: "languages",
            value: data.languages,
          });
        const complete = assemble(fields, Date.now());
        trimCaches();
        return complete ?? { success: false, code: "unavailable" };
      } catch (error) {
        return handleFailure(error);
      }
    },
    () => {
      startedAt = Date.now();
      if (generation !== currentCredential().generation || startedAt < credentialUnavailableUntil)
        throw new GitHubActivityError("not_configured");
      if (startedAt >= deadline)
        throw new PublicLookupQueueError(new Date(startedAt + 1000).toISOString());
      if (startedAt < cooldownUntil)
        throw new GitHubActivityError("rate_limited", new Date(cooldownUntil).toISOString());
      // Queue waiting may cross UTC days/years or expire previously fresh fields.
      // Plan against the actual source timestamp, including an implicit commit year.
      fields = requestedFields(prefix, parsed.data, new Date(startedAt));
      missingKeys = fields.keys.filter((key) => !usable(snapshots.get(key), startedAt));
      const missingStats = [...fields.metricKeys]
        .filter(([, key]) => missingKeys.includes(key))
        .map(([id]) => id);
      const missingLanguages = !!fields.languageKey && missingKeys.includes(fields.languageKey);
      requestOptions = {
        ...(missingStats.length
          ? { stats: { ...parsed.data.stats, items: missingStats, showRank: false } }
          : {}),
        ...(missingLanguages ? { languages: parsed.data.languages ?? {} } : {}),
      };
      identity = snapshots.get(`${prefix}:identity`);
    },
    deadline,
  )
    .catch(handleFailure)
    .finally(() => {
      pending.delete(prefix);
    });
  pending.set(prefix, lookup);
  return lookup;
}
