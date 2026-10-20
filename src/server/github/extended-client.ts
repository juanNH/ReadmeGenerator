import "server-only";

import { z } from "zod";
import {
  defaultExtendedStats,
  extendedLanguageOptionsSchema,
  extendedStatIds,
  extendedStatsOptionsSchema,
  type ExtendedLanguageOptions,
  type ExtendedStatId,
  type ExtendedStatsOptions,
} from "@/core/activity/extended-options";
import {
  extendedProfileSnapshotSchema,
  type ExtendedMetric,
  type ExtendedProfileSnapshot,
} from "@/core/activity/extended-types";
import { normalizeGitHubUsername } from "@/core/activity";
import { activityPeriod, GitHubActivityError, queryGitHub, readBoundedJson } from "./client";

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const identity = {
  login: z.string().min(1).max(39),
  userViewType: z.enum(["PUBLIC", "PRIVATE"]),
  isViewer: z.boolean(),
};
const repositorySchema = z.object({
  nameWithOwner: z.string().min(3).max(200),
  isPrivate: z.boolean(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "INTERNAL"]),
  isFork: z.boolean(),
  owner: z.object({ login: z.string().min(1).max(39) }),
});
type Repository = z.infer<typeof repositorySchema>;
const pageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  endCursor: z.string().min(1).max(1024).nullable(),
});
const contributionGroupSchema = z
  .array(
    z.object({
      repository: repositorySchema,
      contributions: z.object({ totalCount: count }),
    }),
  )
  .max(100);
const collectionSchema = z.object({
  totalCommitContributions: count,
  totalIssueContributions: count,
  totalPullRequestContributions: count,
  totalPullRequestReviewContributions: count,
  totalRepositoryContributions: count,
  totalRepositoriesWithContributedCommits: count,
  totalRepositoriesWithContributedIssues: count,
  totalRepositoriesWithContributedPullRequests: count,
  restrictedContributionsCount: count,
  contributionCalendar: z.object({ totalContributions: count }),
  commitContributionsByRepository: contributionGroupSchema,
  issueContributionsByRepository: contributionGroupSchema,
  pullRequestContributionsByRepository: contributionGroupSchema,
  pullRequestReviewContributionsByRepository: contributionGroupSchema,
  repositoryContributions: z.object({
    pageInfo: z.object({ hasNextPage: z.boolean() }),
    nodes: z
      .array(
        z
          .object({
            isRestricted: z.boolean(),
            repository: repositorySchema,
          })
          .nullable(),
      )
      .max(100),
  }),
});
type Collection = z.infer<typeof collectionSchema>;
const repositoryFields = "nameWithOwner isPrivate visibility isFork owner { login }";
const collectionFields = `
  totalCommitContributions totalIssueContributions totalPullRequestContributions
  totalPullRequestReviewContributions totalRepositoryContributions
  totalRepositoriesWithContributedCommits totalRepositoriesWithContributedIssues
  totalRepositoriesWithContributedPullRequests restrictedContributionsCount
  contributionCalendar { totalContributions }
  commitContributionsByRepository(maxRepositories: 100) {
    repository { ${repositoryFields} } contributions { totalCount }
  }
  issueContributionsByRepository(maxRepositories: 100) {
    repository { ${repositoryFields} } contributions { totalCount }
  }
  pullRequestContributionsByRepository(maxRepositories: 100) {
    repository { ${repositoryFields} } contributions { totalCount }
  }
  pullRequestReviewContributionsByRepository(maxRepositories: 100) {
    repository { ${repositoryFields} } contributions { totalCount }
  }
  repositoryContributions(first: 100) {
    pageInfo { hasNextPage }
    nodes { isRestricted repository { ${repositoryFields} } }
  }`;
const identityFields = "login userViewType isViewer";
type Filters = Pick<
  ExtendedStatsOptions,
  "repositories" | "owners" | "roles" | "excludeRepositories"
>;
type RepositorySet = {
  repositories: Repository[];
  stars: number;
  languages: ExtendedProfileSnapshot["languages"];
  truncated: boolean;
};

function validateIdentity(user: z.infer<z.ZodObject<typeof identity>>, username: string): void {
  if (
    user.login.toLowerCase() !== username.toLowerCase() ||
    (user.userViewType === "PRIVATE" && !user.isViewer)
  ) {
    throw new GitHubActivityError("unavailable");
  }
}

function isPublic(repository: Repository): boolean {
  const parts = repository.nameWithOwner.split("/");
  return (
    !repository.isPrivate &&
    repository.visibility === "PUBLIC" &&
    parts.length === 2 &&
    parts[0]?.toLowerCase() === repository.owner.login.toLowerCase() &&
    /^[a-z\d-]+\/[a-z\d_.-]+$/i.test(repository.nameWithOwner)
  );
}

function matches(repository: Repository, filters: Filters, allowed?: Set<string>): boolean {
  if (!isPublic(repository)) return false;
  const fullName = repository.nameWithOwner.toLowerCase();
  const [owner, name] = fullName.split("/");
  return (
    (!filters.repositories?.length ||
      filters.repositories.some((value) => value.toLowerCase() === fullName)) &&
    (!filters.owners?.length || filters.owners.some((value) => value.toLowerCase() === owner)) &&
    !filters.excludeRepositories?.some((value) => value.toLowerCase() === name) &&
    (!allowed || allowed.has(fullName))
  );
}

function add(left: number, right: number): number {
  const sum = left + right;
  if (!Number.isSafeInteger(sum)) throw new GitHubActivityError("unavailable");
  return sum;
}

function yearRange(year: number, now: Date): { from: string; to: string } {
  return {
    from: `${year}-01-01T00:00:00Z`,
    to: year === now.getUTCFullYear() ? now.toISOString() : `${year}-12-31T23:59:59Z`,
  };
}

function retryDate(headers: Headers, now: number): string {
  const after = Number(headers.get("retry-after"));
  const reset = Number(headers.get("x-ratelimit-reset"));
  const retry =
    Number.isFinite(after) && after > 0
      ? now + Math.min(after, 86_400) * 1000
      : Number.isFinite(reset) && reset * 1000 > now
        ? Math.min(reset * 1000, now + 86_400_000)
        : now + 60_000;
  return new Date(retry).toISOString();
}

/** Search has its own public constraint, even when the token belongs to the requested user. */
async function searchPublic(
  token: string,
  kind: "issues" | "commits",
  query: string,
  signal: AbortSignal,
  now: number,
): Promise<{ value: number; partial: boolean }> {
  const url = new URL(`https://api.github.com/search/${kind}`);
  url.searchParams.set("q", `is:public ${query}`);
  url.searchParams.set("per_page", "1");
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "GitHub-Profile-Generator",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
      redirect: "error",
      signal,
    });
  } catch {
    throw new GitHubActivityError("unavailable");
  }
  if (response.status === 401) throw new GitHubActivityError("not_configured");
  if (
    response.status === 403 ||
    response.status === 429 ||
    response.headers.get("x-ratelimit-remaining") === "0"
  ) {
    throw new GitHubActivityError("rate_limited", retryDate(response.headers, now));
  }
  if (!response.ok) throw new GitHubActivityError("unavailable");
  // Validate credentials before consuming the body, independently of the GraphQL check.
  const scopes = response.headers.get("x-oauth-scopes");
  const normalizedScopes = scopes?.trim().toLowerCase();
  if (scopes === null || (normalizedScopes !== "" && normalizedScopes !== "public_repo")) {
    throw new GitHubActivityError("not_configured");
  }
  const parsed = z
    .object({ total_count: count, incomplete_results: z.boolean() })
    .safeParse(await readBoundedJson(response));
  if (!parsed.success) throw new GitHubActivityError("unavailable");
  return { value: parsed.data.total_count, partial: parsed.data.incomplete_results };
}

/** Independent from ActivitySnapshot: only the selected Extended data is queried. */
export async function fetchExtendedProfile(
  rawUsername: string,
  token: string,
  now: Date,
  options: { stats?: ExtendedStatsOptions; languages?: ExtendedLanguageOptions } = {},
): Promise<ExtendedProfileSnapshot> {
  const username = normalizeGitHubUsername(rawUsername);
  if (!username) throw new GitHubActivityError("invalid_username");
  const parsedOptions = z
    .strictObject({
      stats: extendedStatsOptionsSchema.optional(),
      languages: extendedLanguageOptionsSchema.optional(),
    })
    .safeParse(options);
  if (!parsedOptions.success) throw new GitHubActivityError("unavailable");
  const statsOptions = parsedOptions.data.stats ?? {};
  const languageOptions = parsedOptions.data.languages ?? {};
  const languageOnly = options.languages !== undefined && options.stats === undefined;
  const selected = new Set<ExtendedStatId>(
    languageOnly ? [] : (statsOptions.items ?? defaultExtendedStats),
  );
  if (statsOptions.showRank) {
    for (const item of [
      "commits",
      "pullRequests",
      "issues",
      "reviews",
      "stars",
      "followers",
    ] as const)
      selected.add(item);
  }
  const period = activityPeriod(now);
  const signal = AbortSignal.timeout(15_000);
  let requests = 0;
  const request = async (query: string, variables: Record<string, unknown>): Promise<unknown> => {
    if (requests >= 15 || signal.aborted) throw new GitHubActivityError("unavailable");
    requests += 1;
    return queryGitHub(token, query, variables, signal, now.getTime());
  };
  const optional = async <T>(operation: () => Promise<T>): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      // An unverifiable credential or vanished user invalidates every result.
      if (
        error instanceof GitHubActivityError &&
        (error.code === "not_configured" ||
          error.code === "not_found" ||
          error.code === "rate_limited")
      )
        throw error;
      return null;
    }
  };
  const wantsCollection =
    selected.has("reviews") ||
    selected.has("repositoriesContributedTo") ||
    (selected.has("commits") && (statsOptions.commitsPeriod ?? "period") === "period");
  const baseSchema = z.object({
    user: z
      .object({
        ...identity,
        name: z.string().max(200).nullable(),
        followers: z.object({ totalCount: count }).optional(),
        current: collectionSchema.optional(),
        contributionYears: z
          .object({ contributionYears: z.array(z.number().int().min(2008).max(2100)).max(100) })
          .optional(),
      })
      .nullable(),
  });
  const wantsHistory =
    selected.has("allTimeContributions") || selected.has("allTimeRepositoriesContributedTo");
  const base = baseSchema.safeParse(
    await request(
      `query ExtendedIdentity($login: String!${wantsCollection ? ", $from: DateTime!, $to: DateTime!" : ""}) {
    user(login: $login) { ${identityFields} name
      ${selected.has("followers") ? "followers { totalCount }" : ""}
      ${wantsCollection ? `current: contributionsCollection(from: $from, to: $to) { ${collectionFields} }` : ""}
      ${wantsHistory ? "contributionYears: contributionsCollection { contributionYears }" : ""}
    }
  }`,
      {
        login: username,
        ...(wantsCollection ? { from: `${period.from}T00:00:00Z`, to: now.toISOString() } : {}),
      },
    ),
  );
  if (!base.success) throw new GitHubActivityError("unavailable");
  if (!base.data.user) throw new GitHubActivityError("not_found");
  const user = base.data.user;
  validateIdentity(user, username);
  const emptyLanguages: ExtendedProfileSnapshot["languages"] = {
    items: [],
    repositoriesAnalyzed: 0,
    repositoriesTotal: 0,
    truncated: false,
  };
  const stats = Object.fromEntries(
    extendedStatIds.map((id) => [
      id,
      {
        value: null,
        scope:
          id === "stars" || id === "followers"
            ? "snapshot"
            : id === "reviews" ||
                id === "repositoriesContributedTo" ||
                (id === "commits" && statsOptions.commitsPeriod !== "all")
              ? "period"
              : "lifetime",
        partial: false,
      } satisfies ExtendedMetric,
    ]),
  ) as Record<ExtendedStatId, ExtendedMetric>;
  const setMetric = (id: ExtendedStatId, value: number | null, partial = false): void => {
    stats[id] = { ...stats[id], value, partial: partial || value === null };
  };
  if (selected.has("followers")) setMetric("followers", user.followers?.totalCount ?? null);

  async function readRepositories(
    filters: Filters,
    includeLanguages: boolean,
  ): Promise<RepositorySet> {
    const map = new Map<string, ExtendedProfileSnapshot["languages"]["items"][number]>();
    const repositories: Repository[] = [];
    let stars = 0;
    let repositoriesAnalyzed = 0;
    let repositoriesTotal = 0;
    let truncated = false;
    let after: string | null = null;
    const cursors = new Set<string>();
    const seenRepositories = new Set<string>();
    const schema = z.object({
      user: z
        .object({
          ...identity,
          repositories: z.object({
            totalCount: count,
            pageInfo: pageInfoSchema,
            nodes: z
              .array(
                repositorySchema
                  .extend({
                    stargazerCount: count,
                    languages: z
                      .object({
                        pageInfo: z.object({ hasNextPage: z.boolean() }),
                        edges: z
                          .array(
                            z
                              .object({
                                size: count,
                                node: z.object({
                                  name: z.string().min(1).max(100),
                                  color: z.string().max(100).nullable(),
                                }),
                              })
                              .nullable(),
                          )
                          .max(20),
                      })
                      .nullable()
                      .optional(),
                  })
                  .nullable(),
              )
              .max(100),
          }),
        })
        .nullable(),
    });
    for (let page = 0; page < 3; page += 1) {
      const parsed = schema.safeParse(
        await request(
          `query ExtendedRepositories($login: String!, $after: String, $roles: [RepositoryAffiliation!]) {
        user(login: $login) { ${identityFields}
          repositories(first:100, after:$after, privacy:PUBLIC, isFork:false, ownerAffiliations:$roles,
            orderBy:{field:UPDATED_AT,direction:DESC}) {
            totalCount pageInfo { hasNextPage endCursor }
            nodes { ${repositoryFields} stargazerCount ${
              includeLanguages
                ? `languages(first:20, orderBy:{field:SIZE,direction:DESC}) {
              pageInfo { hasNextPage } edges { size node { name color } }
            }`
                : ""
            } }
          }
        }
      }`,
          { login: user.login, after, roles: filters.roles ?? ["OWNER"] },
        ),
      );
      if (!parsed.success || !parsed.data.user) throw new GitHubActivityError("unavailable");
      validateIdentity(parsed.data.user, user.login);
      const connection = parsed.data.user.repositories;
      repositoriesTotal = connection.totalCount;
      for (const repository of connection.nodes) {
        if (!repository || !isPublic(repository) || repository.isFork) {
          truncated = true;
          continue;
        }
        // OWNER alone can be independently checked; other affiliations are constrained by the provider query.
        if (
          (filters.roles ?? ["OWNER"]).every((role) => role === "OWNER") &&
          repository.owner.login.toLowerCase() !== user.login.toLowerCase()
        ) {
          truncated = true;
          continue;
        }
        const repositoryKey = repository.nameWithOwner.toLowerCase();
        if (seenRepositories.has(repositoryKey)) {
          truncated = true;
          continue;
        }
        seenRepositories.add(repositoryKey);
        repositories.push(repository);
        if (!matches(repository, filters)) continue;
        repositoriesAnalyzed += 1;
        if (repository.owner.login.toLowerCase() === user.login.toLowerCase()) {
          stars = add(stars, repository.stargazerCount);
        }
        if (!includeLanguages) continue;
        if (!repository.languages) throw new GitHubActivityError("unavailable");
        truncated ||= repository.languages.pageInfo.hasNextPage;
        const seenLanguages = new Set<string>();
        for (const edge of repository.languages.edges) {
          if (!edge || edge.size === 0 || seenLanguages.has(edge.node.name)) continue;
          seenLanguages.add(edge.node.name);
          const previous = map.get(edge.node.name);
          map.set(edge.node.name, {
            name: edge.node.name,
            bytes: add(previous?.bytes ?? 0, edge.size),
            repositoryCount: (previous?.repositoryCount ?? 0) + 1,
            color: /^#[a-f\d]{6}$/i.test(edge.node.color ?? "") ? edge.node.color : null,
          });
        }
      }
      if (!connection.pageInfo.hasNextPage) break;
      if (page === 2) {
        truncated = true;
        break;
      }
      after = connection.pageInfo.endCursor;
      if (!after || cursors.has(after)) throw new GitHubActivityError("unavailable");
      cursors.add(after);
    }
    const items = [...map.values()].sort(
      (a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name),
    );
    truncated ||= items.length > 100;
    return {
      repositories,
      stars,
      truncated,
      languages: { items: items.slice(0, 100), repositoriesAnalyzed, repositoriesTotal, truncated },
    };
  }

  const needsStatsRepositories = selected.has("stars") || !!statsOptions.roles?.length;
  const needsLanguages =
    options.languages !== undefined ||
    (options.stats === undefined && options.languages === undefined);
  const filterKey = (filters: Filters): string =>
    JSON.stringify([
      filters.repositories?.map((value) => value.toLowerCase()).sort() ?? [],
      filters.owners?.map((value) => value.toLowerCase()).sort() ?? [],
      [...(filters.roles ?? ["OWNER"])].sort(),
      filters.excludeRepositories?.map((value) => value.toLowerCase()).sort() ?? [],
    ]);
  const shareRepositories =
    needsStatsRepositories &&
    needsLanguages &&
    filterKey(statsOptions) === filterKey(languageOptions);
  const statsRepositories = needsStatsRepositories
    ? await optional(() => readRepositories(statsOptions, shareRepositories))
    : null;
  if (selected.has("stars")) {
    // Stars belong to public, non-fork repositories owned by this profile.
    setMetric("stars", statsRepositories?.stars ?? null, statsRepositories?.truncated ?? true);
  }
  const languagesRead = shareRepositories
    ? statsRepositories
    : needsLanguages
      ? await optional(() => readRepositories(languageOptions, true))
      : null;
  const languages = languagesRead?.languages ?? { ...emptyLanguages, truncated: needsLanguages };
  const allowed = statsOptions.roles?.length
    ? new Set(
        statsRepositories?.repositories.map((repository) =>
          repository.nameWithOwner.toLowerCase(),
        ) ?? [],
      )
    : undefined;
  const rolesUnavailable = !!statsOptions.roles?.length && !statsRepositories;
  const filtersIncomplete =
    !!statsOptions.roles?.length && (!statsRepositories || statsRepositories.truncated);
  const contributionFilters = { ...statsOptions, excludeRepositories: undefined };
  const filtered = !!(
    statsOptions.repositories?.length ||
    statsOptions.owners?.length ||
    statsOptions.roles?.length
  );
  const permitted = (repository: Repository): boolean =>
    matches(repository, contributionFilters, allowed);
  const groupedCount = (
    groups: Collection["commitContributionsByRepository"],
  ): { value: number; partial: boolean } => ({
    value: groups.reduce(
      (sum, group) =>
        permitted(group.repository) ? add(sum, group.contributions.totalCount) : sum,
      0,
    ),
    partial: groups.length >= 100 || filtersIncomplete,
  });
  const contributedRepositories = (
    collection: Collection,
  ): { names: Set<string>; partial: boolean } => {
    const groups = [
      collection.commitContributionsByRepository,
      collection.issueContributionsByRepository,
      collection.pullRequestContributionsByRepository,
    ] as const;
    const names = new Set<string>();
    for (const group of groups.flat()) {
      if (
        permitted(group.repository) &&
        (statsOptions.includeOwnRepositories ||
          group.repository.owner.login.toLowerCase() !== user.login.toLowerCase())
      ) {
        names.add(group.repository.nameWithOwner.toLowerCase());
      }
    }
    for (const entry of collection.repositoryContributions.nodes) {
      if (
        entry &&
        !entry.isRestricted &&
        permitted(entry.repository) &&
        (statsOptions.includeOwnRepositories ||
          entry.repository.owner.login.toLowerCase() !== user.login.toLowerCase())
      ) {
        names.add(entry.repository.nameWithOwner.toLowerCase());
      }
    }
    return {
      names,
      partial:
        filtersIncomplete ||
        groups.some((group) => group.length >= 100) ||
        collection.repositoryContributions.pageInfo.hasNextPage ||
        collection.totalRepositoriesWithContributedCommits > groups[0].length ||
        collection.totalRepositoriesWithContributedIssues > groups[1].length ||
        collection.totalRepositoriesWithContributedPullRequests > groups[2].length,
    };
  };
  if (user.current) {
    if (selected.has("reviews")) {
      const result = filtered
        ? groupedCount(user.current.pullRequestReviewContributionsByRepository)
        : { value: user.current.totalPullRequestReviewContributions, partial: false };
      setMetric("reviews", result.value, result.partial);
    }
    if (selected.has("commits") && (statsOptions.commitsPeriod ?? "period") === "period") {
      const result = filtered
        ? groupedCount(user.current.commitContributionsByRepository)
        : { value: user.current.totalCommitContributions, partial: false };
      setMetric("commits", result.value, result.partial);
    }
    if (selected.has("repositoriesContributedTo")) {
      const result = contributedRepositories(user.current);
      setMetric("repositoriesContributedTo", result.names.size, result.partial);
    }
  }

  // Search supports explicit public repository/owner scopes. Role scopes are converted
  // into the validated public repository set; no token-viewer affiliation is inferred.
  function searchScope(): { text: string; partial: boolean; empty: boolean; unavailable: boolean } {
    let targets = statsOptions.repositories?.length
      ? statsOptions.repositories.map((value) => value.toLowerCase())
      : undefined;
    if (allowed) targets = (targets ?? [...allowed]).filter((value) => allowed.has(value));
    if (targets) {
      targets = targets.filter(
        (value) =>
          !statsOptions.owners?.length ||
          statsOptions.owners.some((owner) => value.startsWith(`${owner.toLowerCase()}/`)),
      );
      return {
        text: targets
          .slice(0, 20)
          .map((value) => `repo:${value}`)
          .join(" "),
        partial: filtersIncomplete || targets.length > 20,
        empty: targets.length === 0,
        unavailable: rolesUnavailable,
      };
    }
    return {
      text: (statsOptions.owners ?? []).map((value) => `user:${value}`).join(" "),
      partial: false,
      empty: false,
      unavailable: false,
    };
  }
  const scope = searchScope();
  async function searched(
    id: ExtendedStatId,
    kind: "issues" | "commits",
    filter: string,
  ): Promise<void> {
    if (scope.unavailable) {
      setMetric(id, null, true);
      return;
    }
    if (scope.empty) {
      setMetric(id, 0, scope.partial);
      return;
    }
    const result = await optional(async () => {
      if (requests >= 15 || signal.aborted) throw new GitHubActivityError("unavailable");
      requests += 1;
      return searchPublic(token, kind, `${scope.text} ${filter}`.trim(), signal, now.getTime());
    });
    setMetric(id, result?.value ?? null, (result?.partial ?? true) || scope.partial);
  }
  const publicSearches: [ExtendedStatId, string][] = [
    ["pullRequests", `author:${user.login} type:pr`],
    ["issues", `author:${user.login} type:issue`],
    ["mergedPullRequests", `author:${user.login} type:pr is:merged`],
    ["authoredPullRequests", `author:${user.login} type:pr`],
    ["commentedPullRequests", `commenter:${user.login} -author:${user.login} type:pr`],
    ["reviewedPullRequests", `reviewed-by:${user.login} -author:${user.login} type:pr`],
    ["authoredIssues", `author:${user.login} type:issue`],
    ["commentedIssues", `commenter:${user.login} -author:${user.login} type:issue`],
  ];
  if (selected.has("mergedPullRequestPercentage")) {
    selected.add("mergedPullRequests");
    selected.add("pullRequests");
  }
  // Batch selected issue/PR counters; identical aliases share the same public search.
  const requestedSearches = publicSearches.filter(([id]) => selected.has(id));
  const uniqueFilters = [...new Set(requestedSearches.map(([, filter]) => filter))];
  if (uniqueFilters.length) {
    const searchCounts = scope.unavailable
      ? null
      : scope.empty
        ? uniqueFilters.map(() => 0)
        : await optional(async () => {
            const variables = Object.fromEntries(
              uniqueFilters.map((filter, index) => [
                `q${index}`,
                `is:public ${scope.text} ${filter}`.trim(),
              ]),
            );
            const declarations = uniqueFilters.map((_, index) => `$q${index}:String!`).join(",");
            const fields = uniqueFilters
              .map(
                (_, index) =>
                  `count${index}:search(type:ISSUE,first:1,query:$q${index}) { issueCount }`,
              )
              .join("\n");
            const parsed = z
              .record(z.string(), z.object({ issueCount: count }))
              .safeParse(
                await request(
                  `query ExtendedPublicSearches(${declarations}) { ${fields} }`,
                  variables,
                ),
              );
            if (!parsed.success) throw new GitHubActivityError("unavailable");
            return uniqueFilters.map((_, index) => {
              const value = parsed.data[`count${index}`];
              if (!value) throw new GitHubActivityError("unavailable");
              return value.issueCount;
            });
          });
    for (const [id, filter] of requestedSearches) {
      setMetric(
        id,
        searchCounts?.[uniqueFilters.indexOf(filter)] ?? null,
        scope.partial || !searchCounts,
      );
    }
  }
  if (selected.has("mergedPullRequestPercentage")) {
    const total = stats.pullRequests;
    const merged = stats.mergedPullRequests;
    setMetric(
      "mergedPullRequestPercentage",
      total.value === null || merged.value === null || merged.value > total.value
        ? null
        : total.value === 0
          ? 0
          : (merged.value / total.value) * 100,
      total.partial || merged.partial,
    );
  }
  if (selected.has("commits") && statsOptions.commitsPeriod === "all") {
    await searched("commits", "commits", `author:${user.login}`);
  }
  if (selected.has("commits") && statsOptions.commitsPeriod === "year") {
    const year = statsOptions.year ?? now.getUTCFullYear();
    if (year > now.getUTCFullYear()) {
      setMetric("commits", null, true);
    } else {
      const range = yearRange(year, now);
      const result = await optional(async () => {
        const parsed = z
          .object({ user: z.object({ ...identity, value: collectionSchema }).nullable() })
          .safeParse(
            await request(
              `query ExtendedYear($login: String!, $from:DateTime!, $to:DateTime!) {
          user(login:$login) { ${identityFields} value:contributionsCollection(from:$from,to:$to) { ${collectionFields} } }
        }`,
              { login: user.login, ...range },
            ),
          );
        if (!parsed.success || !parsed.data.user) throw new GitHubActivityError("unavailable");
        validateIdentity(parsed.data.user, user.login);
        return filtered
          ? groupedCount(parsed.data.user.value.commitContributionsByRepository)
          : { value: parsed.data.user.value.totalCommitContributions, partial: false };
      });
      setMetric("commits", result?.value ?? null, result?.partial ?? true);
    }
  }

  if (wantsHistory) {
    const availableYears = [...new Set(user.contributionYears?.contributionYears ?? [])]
      .filter((year) => year <= now.getUTCFullYear())
      .sort((a, b) => b - a);
    const years = availableYears.slice(0, 10);
    const history = await optional(async () => {
      if (!user.contributionYears) throw new GitHubActivityError("unavailable");
      if (years.length === 0) return [];
      const aliases = years
        .map((year, index) => {
          const range = yearRange(year, now);
          return `year${index}:contributionsCollection(from:"${range.from}",to:"${range.to}") { ${collectionFields} }`;
        })
        .join("\n");
      const parsed = z
        .object({ user: z.object(identity).catchall(z.unknown()).nullable() })
        .safeParse(
          await request(
            `query ExtendedHistory($login:String!) { user(login:$login) { ${identityFields} ${aliases} } }`,
            { login: user.login },
          ),
        );
      if (!parsed.success || !parsed.data.user) throw new GitHubActivityError("unavailable");
      validateIdentity(parsed.data.user, user.login);
      return years.map((_, index) => {
        const collection = collectionSchema.safeParse(parsed.data.user?.[`year${index}`]);
        if (!collection.success) throw new GitHubActivityError("unavailable");
        return collection.data;
      });
    });
    if (selected.has("allTimeContributions")) {
      let value = 0;
      let partial = filtered || availableYears.length > 10 || filtersIncomplete;
      for (const collection of history ?? []) {
        if (!filtered) {
          // Calendar totals can contain voluntarily shared anonymous private counts.
          // Extended's public-only total removes these rather than attributing them.
          if (
            collection.contributionCalendar.totalContributions <
            collection.restrictedContributionsCount
          ) {
            partial = true;
            continue;
          }
          value = add(
            value,
            collection.contributionCalendar.totalContributions -
              collection.restrictedContributionsCount,
          );
        } else {
          for (const groups of [
            collection.commitContributionsByRepository,
            collection.issueContributionsByRepository,
            collection.pullRequestContributionsByRepository,
            collection.pullRequestReviewContributionsByRepository,
          ]) {
            const group = groupedCount(groups);
            value = add(value, group.value);
            partial ||= group.partial;
          }
          for (const entry of collection.repositoryContributions.nodes) {
            if (entry && !entry.isRestricted && permitted(entry.repository)) value = add(value, 1);
          }
          partial ||= collection.repositoryContributions.pageInfo.hasNextPage;
        }
      }
      setMetric("allTimeContributions", history ? value : null, partial || !history);
    }
    if (selected.has("allTimeRepositoriesContributedTo")) {
      const names = new Set<string>();
      let partial = availableYears.length > 10 || filtersIncomplete;
      for (const collection of history ?? []) {
        const result = contributedRepositories(collection);
        partial ||= result.partial;
        for (const name of result.names) names.add(name);
      }
      setMetric(
        "allTimeRepositoriesContributedTo",
        history ? names.size : null,
        partial || !history,
      );
    }
  }

  if (selected.has("discussionsStarted") || selected.has("discussionsAnswered")) {
    const discussions = await optional(async () => {
      const started = new Set<string>();
      const answered = new Set<string>();
      let afterStarted: string | null = null;
      let afterAnswered: string | null = null;
      let hasStarted = selected.has("discussionsStarted");
      let hasAnswered = selected.has("discussionsAnswered");
      let partialStarted = filtersIncomplete;
      let partialAnswered = filtersIncomplete;
      const cursors = new Set<string>();
      const node = z.object({ id: z.string().min(1).max(200), repository: repositorySchema });
      const connection = z.object({
        pageInfo: pageInfoSchema,
        nodes: z.array(node.nullable()).max(100),
      });
      const schema = z.object({
        user: z
          .object({
            ...identity,
            started: connection.optional(),
            answered: z
              .object({
                pageInfo: pageInfoSchema,
                nodes: z
                  .array(z.object({ id: z.string().min(1).max(200), discussion: node }).nullable())
                  .max(100),
              })
              .optional(),
          })
          .nullable(),
      });
      for (let page = 0; page < 3 && (hasStarted || hasAnswered); page += 1) {
        const parsed = schema.safeParse(
          await request(
            `query ExtendedDiscussions($login:String!${hasStarted ? ", $afterStarted:String" : ""}${hasAnswered ? ", $afterAnswered:String" : ""}) {
          user(login:$login) { ${identityFields}
            ${
              hasStarted
                ? `started:repositoryDiscussions(first:100,after:$afterStarted) {
              pageInfo { hasNextPage endCursor } nodes { id repository { ${repositoryFields} } }
            }`
                : ""
            }
            ${
              hasAnswered
                ? `answered:repositoryDiscussionComments(first:100,after:$afterAnswered,onlyAnswers:true) {
              pageInfo { hasNextPage endCursor } nodes { id discussion { id repository { ${repositoryFields} } } }
            }`
                : ""
            }
          }
        }`,
            {
              login: user.login,
              ...(hasStarted ? { afterStarted } : {}),
              ...(hasAnswered ? { afterAnswered } : {}),
            },
          ),
        );
        if (!parsed.success || !parsed.data.user) throw new GitHubActivityError("unavailable");
        validateIdentity(parsed.data.user, user.login);
        if (hasStarted) {
          const entries = parsed.data.user.started;
          if (!entries) throw new GitHubActivityError("unavailable");
          for (const entry of entries.nodes)
            if (entry && permitted(entry.repository)) started.add(entry.id);
          hasStarted = entries.pageInfo.hasNextPage;
          afterStarted = entries.pageInfo.endCursor;
          if (hasStarted && (!afterStarted || cursors.has(`started:${afterStarted}`)))
            throw new GitHubActivityError("unavailable");
          if (afterStarted) cursors.add(`started:${afterStarted}`);
        }
        if (hasAnswered) {
          const entries = parsed.data.user.answered;
          if (!entries) throw new GitHubActivityError("unavailable");
          for (const entry of entries.nodes)
            if (entry && permitted(entry.discussion.repository)) answered.add(entry.discussion.id);
          hasAnswered = entries.pageInfo.hasNextPage;
          afterAnswered = entries.pageInfo.endCursor;
          if (hasAnswered && (!afterAnswered || cursors.has(`answered:${afterAnswered}`)))
            throw new GitHubActivityError("unavailable");
          if (afterAnswered) cursors.add(`answered:${afterAnswered}`);
        }
      }
      partialStarted ||= hasStarted;
      partialAnswered ||= hasAnswered;
      return { started: started.size, answered: answered.size, partialStarted, partialAnswered };
    });
    if (selected.has("discussionsStarted"))
      setMetric(
        "discussionsStarted",
        discussions?.started ?? null,
        discussions?.partialStarted ?? true,
      );
    if (selected.has("discussionsAnswered"))
      setMetric(
        "discussionsAnswered",
        discussions?.answered ?? null,
        discussions?.partialAnswered ?? true,
      );
  }

  if (rolesUnavailable) {
    for (const id of selected) if (id !== "followers" && id !== "stars") setMetric(id, null, true);
  }
  for (const id of selected) {
    if (stats[id].value === null) stats[id].partial = true;
  }
  const snapshot = extendedProfileSnapshotSchema.safeParse({
    username: user.login,
    displayName: user.name?.trim() || user.login,
    fetchedAt: now.toISOString(),
    period,
    stats,
    languages,
  });
  if (!snapshot.success) throw new GitHubActivityError("unavailable");
  return snapshot.data;
}
