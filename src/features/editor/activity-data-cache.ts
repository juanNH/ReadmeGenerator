import { z } from "zod";
import { parseActivityCardUrl } from "@/core/activity";
import {
  activityErrorCodes,
  activitySnapshotSchema,
  type ActivityErrorCode,
  type ActivitySnapshot,
} from "@/core/activity/activity-types";
import { cardConfigJson } from "@/core/activity/card-config-json";
import {
  extendedFilterKey,
  extendedMetricKey,
  selectedExtendedStats,
  type ExtendedDataOptions,
} from "@/core/activity/extended-data-plan";
import {
  extendedStatIds,
  type ExtendedLanguageOptions,
  type ExtendedStatId,
  type ExtendedStatsOptions,
} from "@/core/activity/extended-options";
import {
  extendedProfileSnapshotSchema,
  type ExtendedMetric,
  type ExtendedProfileSnapshot,
} from "@/core/activity/extended-types";
import { renderActivityCard } from "@/core/activity/render-card";
import { renderExtendedProfileCard } from "@/core/activity/render-extended-profile";
import { renderResourceCard } from "@/core/activity/render-resource-card";
import { resourceSnapshotSchema, type ResourceSnapshot } from "@/core/activity/resource-types";
import { parseResourceCardUrl } from "@/core/activity/resource-urls";
import { parseActivityDataRecord } from "./activity-data-record";

export type ActivityDataCardState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; code: ActivityErrorCode; retryAt?: string }
  | {
      status: "ready";
      svg: string;
      stale: boolean;
      partial?: boolean;
      supplement?: {
        status: "idle" | "loading" | "error";
        code?: ActivityErrorCode;
        retryAt?: string;
      };
    };

const freshFor = 30 * 60_000;
const staleFor = 24 * 60 * 60_000;
const maximumClockSkew = 5_000;
const maximumSources = 100;
const failureSchema = z.strictObject({
  success: z.literal(false),
  code: z.enum(activityErrorCodes),
  retryAt: z.iso.datetime().optional(),
});
type Failure = z.infer<typeof failureSchema>;
type ProfileCard = NonNullable<ReturnType<typeof parseActivityCardUrl>>;
type ResourceCard = NonNullable<ReturnType<typeof parseResourceCardUrl>>;
type ExtendedPlan = {
  username: string;
  options: ExtendedDataOptions;
  metrics: Map<ExtendedStatId, string>;
  languageKey?: string;
};
type Card =
  | { kind: "basic"; input: ProfileCard; keys: string[] }
  | { kind: "extended"; input: ProfileCard; plan: ExtendedPlan; keys: string[] }
  | { kind: "resource"; input: ResourceCard; plan?: ExtendedPlan; keys: string[] };
type Metadata = {
  fetchedAt: string;
  stale: boolean;
  day: string;
  username?: string;
  displayName?: string;
  period?: ExtendedProfileSnapshot["period"];
};
type Entry = Metadata &
  (
    | { kind: "basic"; data: ActivitySnapshot }
    | { kind: "resource"; data: ResourceSnapshot }
    | { kind: "metric"; data: ExtendedMetric }
    | { kind: "languages"; data: ExtendedProfileSnapshot["languages"] }
  );
type Job = {
  keys: string[];
  url: string;
  identityPrefixes: string[];
  accept: (value: unknown) => Map<string, Entry> | undefined;
};
type Options = {
  fetch?: typeof fetch;
  now?: () => number;
  maximumEntries?: number;
  maximumBytes?: number;
  concurrency?: number;
};

function day(now: number) {
  return new Date(now).toISOString().slice(0, 10);
}

async function readPublicJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing public data response.");
  const decoder = new TextDecoder();
  let bytes = 0;
  let source = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 2 * 1024 * 1024) throw new Error("Response exceeds the public data limit.");
      source += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(source + decoder.decode()) as unknown;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function dataFilters(options: ExtendedStatsOptions | ExtendedLanguageOptions) {
  return {
    ...(options.repositories ? { repositories: [...options.repositories].sort() } : {}),
    ...(options.owners ? { owners: [...options.owners].sort() } : {}),
    ...(options.roles ? { roles: [...options.roles].sort() } : {}),
    ...(options.excludeRepositories
      ? { excludeRepositories: [...options.excludeRepositories].sort() }
      : {}),
  };
}

function statsDataOptions(options: ExtendedStatsOptions): ExtendedStatsOptions {
  return {
    ...dataFilters(options),
    ...(options.commitsPeriod ? { commitsPeriod: options.commitsPeriod } : {}),
    ...(options.year !== undefined ? { year: options.year } : {}),
    ...(options.includeOwnRepositories !== undefined
      ? { includeOwnRepositories: options.includeOwnRepositories }
      : {}),
  };
}

function extendedPlan(username: string, options: ExtendedDataOptions, now: number): ExtendedPlan {
  const prefix = `extended:${username.toLowerCase()}:${day(now)}`;
  const metrics = new Map<ExtendedStatId, string>();
  for (const id of selectedExtendedStats(options))
    if (id !== "mergedPullRequestPercentage")
      metrics.set(
        id,
        `${prefix}:metric:${extendedMetricKey(id, options.stats ?? {}, new Date(now))}`,
      );
  return {
    username,
    options,
    metrics,
    ...(options.languages !== undefined
      ? { languageKey: `${prefix}:languages:${extendedFilterKey(options.languages, true)}` }
      : {}),
  };
}

function planKeys(plan: ExtendedPlan): string[] {
  return [...plan.metrics.values(), ...(plan.languageKey ? [plan.languageKey] : [])];
}

function parseSource(source: string, now: number): Card | undefined {
  const input = parseActivityCardUrl(source);
  if (input) {
    if (input.card === "extended-stats" || input.card === "extended-languages") {
      const options =
        input.card === "extended-stats"
          ? { stats: input.extended?.stats ?? {} }
          : { languages: input.extended?.languages ?? {} };
      const plan = extendedPlan(input.username, options, now);
      return { kind: "extended", input, plan, keys: planKeys(plan) };
    }
    return { kind: "basic", input, keys: [`basic:${input.username}:${day(now)}`] };
  }
  const resource = parseResourceCardUrl(source);
  if (!resource) return undefined;
  const author = resource.options?.contributionUsername;
  const items = resource.options?.contributionStats;
  const plan =
    resource.kind === "repository" && author && items?.length
      ? extendedPlan(author, { stats: { items, repositories: [resource.target] } }, now)
      : undefined;
  return {
    kind: "resource",
    input: resource,
    plan,
    keys: [`resource:${resource.kind}:${resource.target}`, ...(plan ? planKeys(plan) : [])],
  };
}

/** An editor-local cache. It stores validated public data, never the persisted profile. */
export function createActivityDataCache(options: Options = {}) {
  const clock = options.now ?? Date.now;
  const fetcher = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const maximumEntries = Math.max(1, options.maximumEntries ?? 512);
  const maximumBytes = Math.max(1, options.maximumBytes ?? 8 * 1024 * 1024);
  const concurrency = Math.max(1, Math.min(3, options.concurrency ?? 3));
  const entries = new Map<string, Entry>();
  const errors = new Map<string, Failure>();
  const pending = new Set<string>();
  const controllers = new Set<AbortController>();
  const listeners = new Set<() => void>();
  const rendered = new Map<
    string,
    {
      records: (Entry | undefined)[];
      stale: boolean;
      signals: string;
      availability: string;
      state: ActivityDataCardState;
    }
  >();
  let generation = 0;
  let credentialGeneration = 0;
  const identityGenerations = new Map<string, number>();
  let revision = 0;
  let dataRevision = 0;
  let active = 0;
  const slots: (() => void)[] = [];
  const emit = () => {
    revision += 1;
    for (const listener of listeners) listener();
  };

  function fresh(entry: Entry | undefined, now: number): entry is Entry {
    const age = entry ? now - Date.parse(entry.fetchedAt) : Infinity;
    return (
      !!entry &&
      !entry.stale &&
      age >= -maximumClockSkew &&
      Math.max(0, age) < freshFor &&
      entry.day === day(now)
    );
  }

  function available(entry: Entry | undefined, now: number): entry is Entry {
    const age = entry ? now - Date.parse(entry.fetchedAt) : Infinity;
    return !!entry && age >= -maximumClockSkew && Math.max(0, age) < staleFor;
  }

  function trim() {
    const rowBytes = (key: string, value: Entry) =>
      new TextEncoder().encode(JSON.stringify({ key, value })).byteLength + 1;
    let bytes = [...entries].reduce((total, [key, entry]) => total + rowBytes(key, entry), 30);
    while (entries.size + errors.size > maximumEntries || bytes > maximumBytes) {
      const error = errors.keys().next().value;
      if (error !== undefined) {
        errors.delete(error);
        continue;
      }
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      const entry = entries.get(oldest)!;
      bytes -= rowBytes(oldest, entry);
      entries.delete(oldest);
      dataRevision += 1;
    }
  }

  function assemble(plan: ExtendedPlan, now: number): ExtendedProfileSnapshot | undefined {
    const records = planKeys(plan).map((key) => entries.get(key));
    if (!records.length || records.some((entry) => !available(entry, now))) return undefined;
    const dated = records as Entry[];
    const oldest = dated.reduce((first, next) =>
      Date.parse(first.fetchedAt) <= Date.parse(next.fetchedAt) ? first : next,
    );
    const temporal = [...plan.metrics.values()].flatMap((key) => {
      const entry = entries.get(key);
      return entry?.kind === "metric" && entry.data.scope === "period" ? [entry.period] : [];
    });
    if (new Set(temporal.map((period) => JSON.stringify(period))).size > 1) return undefined;
    const stats = Object.fromEntries(
      extendedStatIds.map((id) => [id, { value: null, scope: "lifetime", partial: false }]),
    ) as ExtendedProfileSnapshot["stats"];
    for (const [id, key] of plan.metrics) {
      const entry = entries.get(key);
      if (entry?.kind === "metric") stats[id] = entry.data;
    }
    if (selectedExtendedStats(plan.options).has("mergedPullRequestPercentage")) {
      const total = stats.pullRequests;
      const merged = stats.mergedPullRequests;
      stats.mergedPullRequestPercentage = {
        value:
          total.value === null || merged.value === null || merged.value > total.value
            ? null
            : total.value === 0
              ? 0
              : (merged.value / total.value) * 100,
        scope: "lifetime",
        partial: total.partial || merged.partial || total.value === null || merged.value === null,
      };
    }
    const languages = plan.languageKey ? entries.get(plan.languageKey) : undefined;
    return {
      username: plan.username,
      displayName: oldest.displayName ?? plan.username,
      fetchedAt: oldest.fetchedAt,
      period: temporal[0] ?? oldest.period!,
      stats,
      languages:
        languages?.kind === "languages"
          ? languages.data
          : { items: [], repositoriesAnalyzed: 0, repositoriesTotal: 0, truncated: false },
    };
  }

  function resolveCard(source: string): ActivityDataCardState {
    const now = clock();
    const card = parseSource(source, now);
    if (!card) return { status: "idle" };
    const records = card.keys.map((key) => entries.get(key));
    const complete = records.every((entry) => available(entry, now));
    if (!complete && !(card.kind === "resource" && available(records[0], now))) {
      if (card.keys.some((key) => pending.has(key))) return { status: "loading" };
      const error = card.keys.map((key) => errors.get(key)).find(Boolean);
      return error
        ? {
            status: "error",
            code: error.code,
            ...(error.retryAt ? { retryAt: error.retryAt } : {}),
          }
        : { status: "idle" };
    }
    const stale = records.some((entry) => !!entry && !fresh(entry, now));
    if (card.kind === "basic") {
      const entry = records[0];
      if (entry?.kind !== "basic") return { status: "idle" };
      return {
        status: "ready",
        stale,
        ...((card.input.card === "languages" || card.input.card === "panorama") &&
        entry.data.languages.truncated
          ? { partial: true }
          : {}),
        svg: renderActivityCard(entry.data, card.input.card, card.input.locale, {
          appearance: card.input.appearance,
          stale,
        }),
      };
    }
    if (card.kind === "extended") {
      const data = assemble(card.plan, now);
      if (
        !data ||
        (card.input.card !== "extended-stats" && card.input.card !== "extended-languages")
      )
        return { status: "idle" };
      return {
        status: "ready",
        stale,
        ...(card.input.card === "extended-languages"
          ? data.languages.truncated
            ? { partial: true }
            : {}
          : [...selectedExtendedStats(card.plan.options)].some(
                (id) => data.stats[id].value === null || data.stats[id].partial,
              )
            ? { partial: true }
            : {}),
        svg: renderExtendedProfileCard(data, card.input.card, card.input.locale, {
          appearance: card.input.appearance,
          extended: card.plan.options,
          stale,
        }),
      };
    }
    const resource = records[0];
    if (resource?.kind !== "resource") return { status: "idle" };
    const profile = card.plan ? assemble(card.plan, now) : undefined;
    const contributions =
      card.plan && card.input.options?.contributionUsername
        ? {
            username: card.input.options.contributionUsername,
            fetchedAt: profile?.fetchedAt,
            stale: profile ? stale : false,
            items: (card.input.options.contributionStats ?? []).map((id) => ({
              id,
              metric: profile?.stats[id] ?? {
                value: null,
                scope: "lifetime" as const,
                partial: true,
              },
            })),
          }
        : undefined;
    let supplement: Extract<ActivityDataCardState, { status: "ready" }>["supplement"];
    if (card.plan && !profile) {
      const keys = planKeys(card.plan);
      const error = keys.map((key) => errors.get(key)).find(Boolean);
      supplement = keys.some((key) => pending.has(key))
        ? { status: "loading" }
        : error
          ? {
              status: "error",
              code: error.code,
              ...(error.retryAt ? { retryAt: error.retryAt } : {}),
            }
          : { status: "idle" };
    }
    return {
      status: "ready",
      stale,
      ...(card.plan &&
      (!profile ||
        [...card.plan.metrics.keys()].some(
          (id) => profile.stats[id].value === null || profile.stats[id].partial,
        ))
        ? { partial: true }
        : {}),
      ...(supplement ? { supplement } : {}),
      svg: renderResourceCard(resource.data, card.input.locale, {
        ...card.input.options,
        appearance: card.input.appearance,
        stale,
        ...(contributions ? { contributions } : {}),
      }),
    };
  }

  function getCard(source: string): ActivityDataCardState {
    const now = clock();
    const card = parseSource(source, now);
    if (!card) return { status: "idle" };
    const records = card.keys.map((key) => entries.get(key));
    const stale = records.some((entry) => !!entry && !fresh(entry, now));
    const availability = records.map((entry) => (available(entry, now) ? "1" : "0")).join("");
    const signals = card.keys
      .map((key) => (pending.has(key) ? "loading" : JSON.stringify(errors.get(key) ?? null)))
      .join("|");
    const previous = rendered.get(source);
    // A calendar is expensive to draw; unrelated text edits and loading siblings do not redraw it.
    if (
      previous &&
      previous.stale === stale &&
      previous.signals === signals &&
      previous.availability === availability &&
      records.every((entry, index) => entry === previous.records[index]) &&
      (card.kind === "resource"
        ? available(records[0], now)
        : records.every((entry) => available(entry, now)))
    )
      return previous.state;
    const state = resolveCard(source);
    if (state.status === "ready") {
      rendered.delete(source);
      rendered.set(source, { records, stale, signals, availability, state });
      while (rendered.size > maximumSources) rendered.delete(rendered.keys().next().value!);
    }
    return state;
  }

  function missingField(key: string, now: number, retryFailures = true) {
    return (
      !fresh(entries.get(key), now) &&
      !pending.has(key) &&
      (retryFailures || !errors.has(key)) &&
      !(Date.parse(errors.get(key)?.retryAt ?? "") > now)
    );
  }

  function jobsFor(sources: readonly string[], now: number, retryFailures = true): Job[] {
    const jobs: Job[] = [];
    const scheduled = new Set<string>();
    const groups: {
      username: string;
      stats?: ExtendedStatsOptions;
      languages?: ExtendedLanguageOptions;
      metrics: Map<ExtendedStatId, string>;
      languageKey?: string;
    }[] = [];
    const missing = (key: string) => missingField(key, now, retryFailures) && !scheduled.has(key);
    for (const source of [...new Set(sources)].slice(0, maximumSources)) {
      const card = parseSource(source, now);
      if (!card) continue;
      const firstKey = card.keys[0]!;
      if ((card.kind === "basic" || card.kind === "resource") && missing(firstKey)) {
        scheduled.add(firstKey);
        const params =
          card.kind === "basic"
            ? new URLSearchParams({ username: card.input.username })
            : new URLSearchParams({ kind: card.input.kind, target: card.input.target });
        jobs.push({
          keys: [firstKey],
          url: `/api/github/${card.kind === "basic" ? "activity" : "resource"}?${params}`,
          identityPrefixes:
            card.kind === "basic"
              ? [`basic:${card.input.username}:`, `extended:${card.input.username}:`]
              : [firstKey],
          accept(value) {
            if (card.kind === "basic") {
              const parsed = activitySnapshotSchema.safeParse(value);
              if (
                !parsed.success ||
                parsed.data.username.toLowerCase() !== card.input.username.toLowerCase()
              )
                return;
              return new Map([
                [
                  firstKey,
                  {
                    kind: "basic",
                    data: parsed.data,
                    fetchedAt: parsed.data.fetchedAt,
                    stale: false,
                    day: parsed.data.period.to,
                  },
                ],
              ]);
            }
            const parsed = resourceSnapshotSchema.safeParse(value);
            if (
              !parsed.success ||
              parsed.data.kind !== card.input.kind ||
              parsed.data.target !== card.input.target
            )
              return;
            return new Map([
              [
                firstKey,
                {
                  kind: "resource",
                  data: parsed.data,
                  fetchedAt: parsed.data.fetchedAt,
                  stale: false,
                  day: day(Date.parse(parsed.data.fetchedAt)),
                },
              ],
            ]);
          },
        });
      }
      if (card.kind === "basic" || !card.plan) continue;
      const plan = card.plan;
      const metrics = [...plan.metrics].filter(([, key]) => missing(key));
      const languageKey =
        plan.languageKey && missing(plan.languageKey) ? plan.languageKey : undefined;
      if (!metrics.length && !languageKey) continue;
      const stats = statsDataOptions(plan.options.stats ?? {});
      const languages = dataFilters(plan.options.languages ?? {});
      let group = groups.find(
        (candidate) =>
          candidate.username.toLowerCase() === plan.username.toLowerCase() &&
          (!metrics.length ||
            !candidate.stats ||
            cardConfigJson(candidate.stats) === cardConfigJson(stats)) &&
          (!languageKey || !candidate.languageKey || candidate.languageKey === languageKey),
      );
      if (!group) {
        group = { username: plan.username, metrics: new Map() };
        groups.push(group);
      }
      if (metrics.length) group.stats = stats;
      for (const [id, key] of metrics) {
        group.metrics.set(id, key);
        scheduled.add(key);
      }
      if (languageKey) {
        group.languages = languages;
        group.languageKey = languageKey;
        scheduled.add(languageKey);
      }
    }
    for (const group of groups) {
      const params = new URLSearchParams({ username: group.username });
      if (group.stats)
        params.set(
          "stats",
          cardConfigJson({ ...group.stats, items: [...group.metrics.keys()], showRank: false }),
        );
      if (group.languageKey) params.set("languages", cardConfigJson(group.languages ?? {}));
      jobs.push({
        keys: [...group.metrics.values(), ...(group.languageKey ? [group.languageKey] : [])],
        url: `/api/github/extended?${params}`,
        identityPrefixes: [
          `basic:${group.username.toLowerCase()}:`,
          `extended:${group.username.toLowerCase()}:`,
        ],
        accept(value) {
          const parsed = extendedProfileSnapshotSchema.safeParse(value);
          if (
            !parsed.success ||
            parsed.data.username.toLowerCase() !== group.username.toLowerCase()
          )
            return;
          const data = parsed.data;
          const metadata = {
            fetchedAt: data.fetchedAt,
            stale: false,
            username: data.username,
            displayName: data.displayName,
            period: data.period,
            day: data.period.to,
          };
          const result = new Map<string, Entry>();
          for (const [id, key] of group.metrics)
            result.set(key, { ...metadata, kind: "metric", data: data.stats[id] });
          if (group.languageKey)
            result.set(group.languageKey, { ...metadata, kind: "languages", data: data.languages });
          return result;
        },
      });
    }
    return jobs;
  }

  async function search(
    sources: readonly string[],
    requestOptions: { retryFailures?: boolean } = {},
  ): Promise<void> {
    const token = generation;
    const jobs = jobsFor(sources, clock(), requestOptions.retryFailures ?? true);
    if (!jobs.length) return;
    for (const job of jobs)
      for (const key of job.keys) {
        pending.add(key);
        errors.delete(key);
      }
    emit();
    let cursor = 0;
    async function worker() {
      while (token === generation) {
        const job = jobs[cursor++];
        if (!job) return;
        while (active >= concurrency && token === generation)
          await new Promise<void>((resolve) => slots.push(resolve));
        if (token !== generation) return;
        active += 1;
        const credentialToken = credentialGeneration;
        const identityTokens = job.identityPrefixes.map(
          (prefix) => identityGenerations.get(prefix) ?? 0,
        );
        const obsolete = () =>
          (credentialToken !== credentialGeneration && !job.url.includes("kind=wakatime")) ||
          job.identityPrefixes.some(
            (prefix, index) => (identityGenerations.get(prefix) ?? 0) !== identityTokens[index],
          );
        const controller = new AbortController();
        controllers.add(controller);
        const timeout = setTimeout(() => controller.abort(), 65_000);
        let failure: Failure | undefined = { success: false, code: "unavailable" };
        try {
          const response = await fetcher(job.url, {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          });
          const value = await readPublicJson(response);
          const error = failureSchema.safeParse(value);
          if (error.success) failure = error.data;
          else {
            const envelope = z
              .strictObject({ success: z.literal(true), data: z.unknown(), stale: z.boolean() })
              .safeParse(value);
            if (response.ok && envelope.success) {
              const data = job.accept(envelope.data.data);
              if (
                !obsolete() &&
                data &&
                [...data.values()].every((entry) => available(entry, clock())) &&
                token === generation
              ) {
                for (const [key, entry] of data) {
                  // Preserve the age of existing siblings even if another metric was loaded later.
                  if (!fresh(entries.get(key), clock()) && available(entry, clock())) {
                    entries.delete(key);
                    entries.set(key, { ...entry, stale: envelope.data.stale });
                    dataRevision += 1;
                  }
                  errors.delete(key);
                }
                failure = undefined;
              }
            }
          }
        } catch {
          // Network, invalid JSON and validation failures remain unavailable, never zero counts.
        } finally {
          clearTimeout(timeout);
          controllers.delete(controller);
          active -= 1;
          slots.shift()?.();
          if (token === generation) {
            // An older request cannot invalidate a newer successful recovery.
            if (obsolete()) failure = undefined;
            if (failure?.code === "not_found" || failure?.code === "not_configured") {
              if (failure.code === "not_configured") credentialGeneration += 1;
              else
                for (const prefix of job.identityPrefixes)
                  identityGenerations.set(prefix, (identityGenerations.get(prefix) ?? 0) + 1);
              while (identityGenerations.size > maximumEntries)
                identityGenerations.delete(identityGenerations.keys().next().value!);
              for (const [key, entry] of entries) {
                if (
                  failure.code === "not_configured"
                    ? !(entry.kind === "resource" && entry.data.kind === "wakatime")
                    : job.identityPrefixes.some(
                        (prefix) =>
                          key === prefix || (prefix.endsWith(":") && key.startsWith(prefix)),
                      )
                )
                  if (entries.delete(key)) dataRevision += 1;
              }
              rendered.clear();
            }
            for (const key of job.keys) {
              pending.delete(key);
              if (failure) {
                if (failure.code === "not_found" || failure.code === "not_configured")
                  if (entries.delete(key)) dataRevision += 1;
                errors.set(key, failure);
              }
            }
            trim();
            emit();
          }
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  }

  return {
    getCard,
    search,
    retry: (source: string) => search([source]),
    getDataRevision: () => dataRevision,
    entryCount: () => [...entries.values()].filter((entry) => available(entry, clock())).length,
    exportRecord() {
      for (const [key, entry] of entries)
        if (!available(entry, clock())) {
          entries.delete(key);
          dataRevision += 1;
        }
      return parseActivityDataRecord(
        { version: 1, entries: [...entries].map(([key, value]) => ({ key, value })) },
        clock(),
      );
    },
    restoreRecord(input: unknown) {
      const restored = parseActivityDataRecord(input, clock());
      for (const { key, value } of restored.entries) {
        const previous = entries.get(key);
        if (!previous || Date.parse(previous.fetchedAt) < Date.parse(value.fetchedAt)) {
          entries.set(key, value);
          dataRevision += 1;
        }
      }
      trim();
      rendered.clear();
      emit();
      return restored.entries.length;
    },
    cancel() {
      generation += 1;
      for (const controller of controllers) controller.abort();
      controllers.clear();
      for (const release of slots.splice(0)) release();
      pending.clear();
      errors.clear();
      emit();
    },
    missingKeys(sources: readonly string[], retryFailures = true) {
      return [
        ...new Set(
          sources
            .slice(0, maximumSources)
            .flatMap((source) => parseSource(source, clock())?.keys ?? []),
        ),
      ]
        .filter((key) => missingField(key, clock(), retryFailures))
        .sort();
    },
    reset() {
      generation += 1;
      for (const controller of controllers) controller.abort();
      controllers.clear();
      for (const release of slots.splice(0)) release();
      pending.clear();
      errors.clear();
      entries.clear();
      dataRevision += 1;
      rendered.clear();
      identityGenerations.clear();
      emit();
    },
    state(sources: readonly string[]) {
      const keys = new Set(
        sources
          .slice(0, maximumSources)
          .flatMap((source) => parseSource(source, clock())?.keys ?? []),
      );
      const total = keys.size;
      return {
        loading: [...keys].some((key) => pending.has(key)),
        needsSearch: [...keys].some((key) => !fresh(entries.get(key), clock())),
        completed: [...keys].filter(
          (key) => !pending.has(key) && (available(entries.get(key), clock()) || errors.has(key)),
        ).length,
        total,
      };
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getRevision: () => revision,
    tick: emit,
  };
}
