import { activityCardUrl, normalizeGitHubUsername, parseActivityCardUrl } from "@/core/activity";
import type { ActivityErrorCode } from "@/core/activity/activity-types";
import { extendedStatIds, type ExtendedOptions } from "@/core/activity/extended-options";
import { parseResourceCardUrl, resourceCardUrl } from "@/core/activity/resource-urls";
import { localActivityCardSources } from "./activity-card-requests";
import { createActivityDataCache } from "./activity-data-cache";
import { createActivityDataPersistence } from "./activity-data-persistence";
import type { ActivityDataStorage } from "./activity-indexed-db";

export type ActivitySearchState = {
  status: "idle" | "loading" | "ready" | "error";
  username?: string;
  code?: ActivityErrorCode;
  retryAt?: string;
  partial?: boolean;
};

/** All profile counters for the current scope; unrelated targets remain explicit selections. */
export function initialActivitySources(
  username: string,
  configuration: ExtendedOptions = {},
): string[] {
  const normalized = normalizeGitHubUsername(username);
  const languages = configuration.languages;
  const languageFilters = {
    ...(languages?.repositories ? { repositories: languages.repositories } : {}),
    ...(languages?.owners ? { owners: languages.owners } : {}),
    ...(languages?.roles ? { roles: languages.roles } : {}),
    ...(languages?.excludeRepositories
      ? { excludeRepositories: languages.excludeRepositories }
      : {}),
  };
  return normalized
    ? [
        activityCardUrl(normalized, "summary", "en"),
        activityCardUrl(normalized, "extended-stats", "en", undefined, undefined, {
          stats: { ...configuration.stats, items: [...extendedStatIds], showRank: false },
        }),
        activityCardUrl(normalized, "extended-languages", "en", undefined, undefined, {
          languages: languageFilters,
        }),
      ].filter((source): source is string => source !== null)
    : [];
}

type Options = {
  cache?: ReturnType<typeof createActivityDataCache>;
  debounceMs?: number;
  storage?: ActivityDataStorage;
};

/** Explicit searches authorize a mounted editor session; recovery never does. */
export function createActivitySearchSession(options: Options = {}) {
  const cache = options.cache ?? createActivityDataCache();
  const persistence = createActivityDataPersistence(cache, options.storage);
  const delay = options.debounceMs ?? 300;
  const accounts = new Set<string>();
  const contributionAuthors = new Set<string>();
  const listeners = new Set<() => void>();
  let sources: string[] = [];
  let username: string | null = null;
  let configuration: ExtendedOptions = {};
  let explicitlySearched = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timerSignature = "";
  let revision = 0;
  let generation = 0;
  const waitingSearches = new Map<string, number>();
  let leases = 0;
  let disposalTimer: ReturnType<typeof setTimeout> | undefined;
  const emit = () => {
    revision += 1;
    for (const listener of listeners) listener();
  };
  cache.subscribe(emit);
  persistence.subscribe(emit);

  function authorize(values: readonly string[], account: string | null) {
    if (account) accounts.add(account);
    for (const source of values) {
      const resource = parseResourceCardUrl(source);
      const author = resource?.options?.contributionUsername?.toLowerCase();
      if (author && resource?.kind === "repository" && resource.options?.contributionStats?.length)
        contributionAuthors.add(author);
    }
    while (accounts.size > 512) accounts.delete(accounts.values().next().value!);
    while (contributionAuthors.size > 512)
      contributionAuthors.delete(contributionAuthors.values().next().value!);
  }

  function automaticSources(values: readonly string[], account: string | null) {
    if (!explicitlySearched) return [];
    const result =
      account && accounts.has(account) ? initialActivitySources(account, configuration) : [];
    for (const source of values) {
      const profile = parseActivityCardUrl(source);
      if (profile) {
        if (accounts.has(profile.username) && profile.username === account) result.push(source);
        continue;
      }
      const resource = parseResourceCardUrl(source);
      if (!resource) continue;
      const author = resource.options?.contributionUsername?.toLowerCase();
      if (author && !accounts.has(author) && !contributionAuthors.has(author)) {
        const baseOptions = { ...resource.options };
        delete baseOptions.contributionUsername;
        delete baseOptions.contributionStats;
        const baseSource = resourceCardUrl(
          resource.kind,
          resource.target,
          resource.locale,
          undefined,
          resource.appearance,
          baseOptions,
        );
        if (baseSource) result.push(baseSource);
      } else result.push(source);
    }
    return [...new Set(result)];
  }

  function cancelTimer() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    timerSignature = "";
  }

  function setInputs(
    nextSources: readonly string[],
    rawUsername: string,
    nextConfiguration: ExtendedOptions = {},
  ) {
    const normalizedSources = localActivityCardSources(nextSources).slice(0, 100);
    const normalizedUsername = normalizeGitHubUsername(rawUsername);
    const changed =
      username !== normalizedUsername ||
      JSON.stringify(sources) !== JSON.stringify(normalizedSources) ||
      JSON.stringify(configuration) !== JSON.stringify(nextConfiguration);
    sources = normalizedSources;
    username = normalizedUsername;
    configuration = nextConfiguration;
    const allowed = automaticSources(sources, username);
    const signature = JSON.stringify(cache.missingKeys(allowed, false));
    if (signature === "[]") {
      const wasQueued = timer !== undefined;
      cancelTimer();
      if (changed || wasQueued) emit();
      return;
    }
    if (timer !== undefined && signature === timerSignature) {
      if (changed) emit();
      return;
    }
    cancelTimer();
    timerSignature = signature;
    const token = generation;
    timer = setTimeout(() => {
      timer = undefined;
      timerSignature = "";
      if (token !== generation) return;
      void cache.search(automaticSources(sources, username), { retryFailures: false });
      emit();
    }, delay);
    emit();
  }

  async function search(
    nextSources: readonly string[] = sources,
    rawUsername: string = username ?? "",
    nextConfiguration: ExtendedOptions = configuration,
  ) {
    cancelTimer();
    sources = localActivityCardSources(nextSources).slice(0, 100);
    username = normalizeGitHubUsername(rawUsername);
    configuration = nextConfiguration;
    const selected = sources.filter((source) => {
      const profile = parseActivityCardUrl(source);
      return !profile || profile.username === username;
    });
    const requested = [
      ...new Set([...initialActivitySources(username ?? "", configuration), ...selected]),
    ];
    if (!requested.length) return;
    const token = generation;
    const requestedUsername = username;
    const waitingKey = requestedUsername ?? "";
    waitingSearches.set(waitingKey, (waitingSearches.get(waitingKey) ?? 0) + 1);
    emit();
    try {
      await persistence.initialize();
      if (token !== generation) return;
      explicitlySearched = true;
      authorize(selected, requestedUsername);
      await cache.search(requested);
      if (token === generation) await persistence.flush();
    } finally {
      if (token === generation) {
        const count = (waitingSearches.get(waitingKey) ?? 1) - 1;
        if (count > 0) waitingSearches.set(waitingKey, count);
        else waitingSearches.delete(waitingKey);
        emit();
      }
    }
  }

  function state(
    nextSources: readonly string[] = sources,
    rawUsername: string = username ?? "",
    nextConfiguration: ExtendedOptions = configuration,
  ) {
    const selected = localActivityCardSources(nextSources).slice(0, 100);
    const account = normalizeGitHubUsername(rawUsername);
    const requested = [
      ...new Set([...initialActivitySources(account ?? "", nextConfiguration), ...selected]),
    ];
    const progress = cache.state(requested);
    const waiting = (waitingSearches.get(account ?? "") ?? 0) > 0;
    let searchState: ActivitySearchState = {
      status: "idle",
      ...(account ? { username: account } : {}),
    };
    if (requested.length > 0) {
      const results = requested.map(cache.getCard);
      const error = results.flatMap((result) =>
        result.status === "error"
          ? [result]
          : result.status === "ready" && result.supplement?.status === "error"
            ? [result.supplement]
            : [],
      )[0];
      const ready = results.filter((result) => result.status === "ready").length;
      if (timer !== undefined || progress.loading || waiting)
        searchState = { ...searchState, status: "loading" };
      else if (error)
        searchState = {
          ...searchState,
          status: "error",
          code: error.code ?? "unavailable",
          ...(error.retryAt ? { retryAt: error.retryAt } : {}),
          partial: ready > 0,
        };
      else if (ready > 0)
        searchState = {
          ...searchState,
          status: "ready",
          partial: results.some(
            (result) => result.status !== "ready" || !!result.supplement || result.partial,
          ),
        };
    }
    return {
      ...progress,
      loading: progress.loading || timer !== undefined || waiting,
      needsSearch: requested.length > 0 && progress.needsSearch,
      canSearch: !!account || selected.length > 0,
      searchState,
      ...persistence.state(),
    };
  }

  return {
    setInputs,
    search,
    state,
    getCard: cache.getCard,
    mount() {
      leases += 1;
      if (disposalTimer !== undefined) clearTimeout(disposalTimer);
      disposalTimer = undefined;
      void persistence.resume();
    },
    unmount() {
      leases = Math.max(0, leases - 1);
      if (leases === 0)
        disposalTimer = setTimeout(() => {
          disposalTimer = undefined;
          if (leases === 0) void dispose();
        }, 0);
    },
    flush: persistence.flush,
    dispose,
    async retry(source: string) {
      const selected = localActivityCardSources([source]);
      if (!selected.length) return;
      const token = generation;
      await persistence.initialize();
      if (token !== generation) return;
      explicitlySearched = true;
      const profile = parseActivityCardUrl(source);
      authorize(selected, profile?.username ?? null);
      await cache.retry(source);
      if (token === generation) await persistence.flush();
    },
    reset() {
      generation += 1;
      cancelTimer();
      explicitlySearched = false;
      accounts.clear();
      contributionAuthors.clear();
      waitingSearches.clear();
      return persistence.reset();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getRevision: () => revision,
    tick: cache.tick,
  };

  async function dispose() {
    generation += 1;
    cancelTimer();
    explicitlySearched = false;
    accounts.clear();
    contributionAuthors.clear();
    waitingSearches.clear();
    await persistence.dispose();
  }
}
