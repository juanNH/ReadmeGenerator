import { z } from "zod";
import { normalizeGitHubUsername } from "@/core/activity";
import { activitySnapshotSchema } from "@/core/activity/activity-types";
import { extendedFilterKey, extendedMetricKey } from "@/core/activity/extended-data-plan";
import {
  extendedLanguageOptionsSchema,
  extendedStatIds,
  extendedStatsOptionsSchema,
} from "@/core/activity/extended-options";
import {
  extendedMetricSchema,
  extendedProfileSnapshotSchema,
} from "@/core/activity/extended-types";
import { resourceSnapshotSchema } from "@/core/activity/resource-types";

export const activityCacheVersion = 1;
export const maximumActivityCacheEntries = 512;
export const maximumActivityCacheBytes = 8 * 1024 * 1024;
const date = z.iso.date();
const common = { fetchedAt: z.iso.datetime(), stale: z.boolean(), day: date };
const profile = {
  ...common,
  username: z
    .string()
    .min(1)
    .max(39)
    .refine((value) => normalizeGitHubUsername(value) === value.toLowerCase()),
  displayName: z.string().min(1).max(200),
  period: z.strictObject({ from: date, to: date }),
};
const entrySchema = z.discriminatedUnion("kind", [
  z.strictObject({ ...common, kind: z.literal("basic"), data: activitySnapshotSchema }),
  z.strictObject({ ...common, kind: z.literal("resource"), data: resourceSnapshotSchema }),
  z.strictObject({ ...profile, kind: z.literal("metric"), data: extendedMetricSchema }),
  z.strictObject({
    ...profile,
    kind: z.literal("languages"),
    data: extendedProfileSnapshotSchema.shape.languages,
  }),
]);
const rowSchema = z.strictObject({ key: z.string().min(1).max(24_000), value: entrySchema });
export type PersistedActivityEntry = z.infer<typeof entrySchema>;
export type ActivityDataRecord = {
  version: 1;
  entries: { key: string; value: PersistedActivityEntry }[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFilter(source: string) {
  try {
    const input: unknown = JSON.parse(source);
    const result = z
      .tuple([
        z.array(z.string()).max(20),
        z.array(z.string()).max(20),
        z.array(z.string()).max(3),
        z.array(z.string()).max(20),
      ])
      .safeParse(input);
    if (!result.success) return;
    const [repositories, owners, roles, excludeRepositories] = result.data;
    return {
      repositories,
      owners,
      ...(roles.length ? { roles: roles.map((role) => role.toUpperCase()) } : {}),
      excludeRepositories,
    };
  } catch {
    return;
  }
}

function validMetricKey(source: string, keyDay: string): boolean {
  if (source === "followers") return true;
  try {
    const input: unknown = JSON.parse(source);
    const result = z.array(z.unknown()).min(2).max(4).safeParse(input);
    if (!result.success) return false;
    const [rawId, rawFilter] = result.data;
    const id = z.enum(extendedStatIds).safeParse(rawId);
    if (
      !id.success ||
      id.data === "followers" ||
      id.data === "mergedPullRequestPercentage" ||
      typeof rawFilter !== "string"
    )
      return false;
    const filters = parseFilter(rawFilter);
    if (!filters) return false;
    const special =
      id.data === "commits"
        ? {
            commitsPeriod: result.data[2],
            ...(result.data[2] === "year" ? { year: result.data[3] } : {}),
          }
        : id.data === "repositoriesContributedTo" || id.data === "allTimeRepositoriesContributedTo"
          ? { includeOwnRepositories: result.data[2] }
          : {};
    const options = extendedStatsOptionsSchema.safeParse({ ...filters, ...special });
    return (
      options.success &&
      extendedMetricKey(id.data, options.data, new Date(`${keyDay}T00:00:00Z`)) === source
    );
  } catch {
    return false;
  }
}

function validKey(key: string, value: PersistedActivityEntry): boolean {
  if (value.kind === "resource")
    return (
      key === `resource:${value.data.kind}:${value.data.target}` &&
      value.fetchedAt === value.data.fetchedAt &&
      value.day === value.fetchedAt.slice(0, 10)
    );
  if (value.kind === "basic") {
    const match = /^basic:([^:]+):(\d{4}-\d{2}-\d{2})$/.exec(key);
    return (
      !!match &&
      normalizeGitHubUsername(match[1]!) === match[1] &&
      match[1] === value.data.username.toLowerCase() &&
      date.safeParse(match[2]).success &&
      value.fetchedAt === value.data.fetchedAt &&
      value.day === value.data.period.to &&
      value.day <= match[2]!
    );
  }
  const match = /^extended:([^:]+):(\d{4}-\d{2}-\d{2}):(metric|languages):(.+)$/.exec(key);
  if (
    !match ||
    normalizeGitHubUsername(match[1]!) !== match[1] ||
    value.username.toLowerCase() !== match[1] ||
    !date.safeParse(match[2]).success ||
    value.day !== value.period.to ||
    value.day > match[2]! ||
    value.period.from > value.period.to ||
    value.kind !== match[3]
  )
    return false;
  if (value.kind === "metric") return validMetricKey(match[4]!, match[2]!);
  const filters = parseFilter(match[4]!);
  const options = extendedLanguageOptionsSchema.safeParse(filters);
  return options.success && extendedFilterKey(options.data, true) === match[4];
}

/** Disposable public cache only. Invalid rows never affect the profile draft. */
export function parseActivityDataRecord(input: unknown, now: number): ActivityDataRecord {
  const empty: ActivityDataRecord = { version: 1, entries: [] };
  if (
    !isObject(input) ||
    Object.keys(input).some((key) => key !== "version" && key !== "entries") ||
    input.version !== activityCacheVersion ||
    !Array.isArray(input.entries) ||
    input.entries.length > maximumActivityCacheEntries
  )
    return empty;
  try {
    if (new TextEncoder().encode(JSON.stringify(input)).byteLength > maximumActivityCacheBytes)
      return empty;
  } catch {
    return empty;
  }
  const seen = new Set<string>();
  for (const row of input.entries) {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) continue;
    const { key, value } = parsed.data;
    const age = now - Date.parse(value.fetchedAt);
    if (age < -5_000 || age >= 24 * 60 * 60_000 || seen.has(key) || !validKey(key, value)) continue;
    seen.add(key);
    empty.entries.push({ key, value });
  }
  return empty;
}
