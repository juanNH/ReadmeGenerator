import {
  defaultExtendedStats,
  type ExtendedLanguageOptions,
  type ExtendedStatId,
  type ExtendedStatsOptions,
} from "./extended-options";

export type ExtendedDataOptions = {
  stats?: ExtendedStatsOptions;
  languages?: ExtendedLanguageOptions;
};

export function selectedExtendedStats(options: ExtendedDataOptions): Set<ExtendedStatId> {
  const selected = new Set<ExtendedStatId>(
    options.languages !== undefined && options.stats === undefined
      ? []
      : (options.stats?.items ?? defaultExtendedStats),
  );
  if (options.stats?.showRank)
    for (const id of [
      "commits",
      "pullRequests",
      "issues",
      "reviews",
      "stars",
      "followers",
    ] as const)
      selected.add(id);
  if (selected.has("mergedPullRequestPercentage")) {
    selected.add("pullRequests");
    selected.add("mergedPullRequests");
  }
  return selected;
}

export function needsExtendedLanguages(options: ExtendedDataOptions): boolean {
  return options.languages !== undefined || options.stats === undefined;
}

function setKey(values: readonly string[] | undefined): string[] {
  return [...(values ?? [])].map((value) => value.toLowerCase()).sort();
}

/** Only repository/language bytes depend on the default OWNER affiliation. */
export function extendedFilterKey(
  options: ExtendedStatsOptions | ExtendedLanguageOptions,
  repositories = false,
): string {
  return JSON.stringify([
    setKey(options.repositories),
    setKey(options.owners),
    setKey(options.roles ?? (repositories ? ["OWNER"] : [])),
    repositories ? setKey(options.excludeRepositories) : [],
  ]);
}

/** A field's key contains its data dependencies, never its presentation or siblings. */
export function extendedMetricKey(
  id: ExtendedStatId,
  options: ExtendedStatsOptions,
  now: Date,
): string {
  if (id === "followers") return "followers";
  const filter = extendedFilterKey(options, id === "stars");
  const period = options.commitsPeriod ?? "period";
  const commitKey =
    id === "commits"
      ? [period, ...(period === "year" ? [options.year ?? now.getUTCFullYear()] : [])]
      : [];
  const ownKey =
    id === "repositoriesContributedTo" || id === "allTimeRepositoriesContributedTo"
      ? [options.includeOwnRepositories ?? false]
      : [];
  return JSON.stringify([id, filter, ...commitKey, ...ownKey]);
}
