import "server-only";

import { z } from "zod";
import {
  activitySnapshotSchema,
  type ActivityErrorCode,
  type ActivitySnapshot,
} from "@/core/activity/activity-types";

const endpoint = "https://api.github.com/graphql";
const maximumResponseBytes = 2 * 1024 * 1024;
const maximumRepositoryPages = 3;
const requestTimeoutMs = 15_000;

const countSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const repositorySchema = z.object({
  nameWithOwner: z.string().min(1).max(200),
  isPrivate: z.boolean(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "INTERNAL"]),
});
const highlightSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().max(1000),
  url: z.string().max(500),
  repository: repositorySchema,
});
const contributionLevels = Object.freeze({
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
} as const);

const activityResponseSchema = z.object({
  user: z
    .object({
      login: z.string().min(1).max(39),
      userViewType: z.enum(["PUBLIC", "PRIVATE"]),
      isViewer: z.boolean(),
      contributionsCollection: z.object({
        restrictedContributionsCount: countSchema,
        totalCommitContributions: countSchema,
        totalPullRequestContributions: countSchema,
        totalIssueContributions: countSchema,
        totalPullRequestReviewContributions: countSchema,
        contributionCalendar: z.object({
          totalContributions: countSchema,
          weeks: z
            .array(
              z.object({
                contributionDays: z
                  .array(
                    z.object({
                      date: z.iso.date(),
                      contributionCount: countSchema,
                      contributionLevel: z.enum(Object.keys(contributionLevels)),
                    }),
                  )
                  .max(7),
              }),
            )
            .max(54),
        }),
        pullRequestContributions: z.object({
          nodes: z
            .array(
              z
                .object({
                  isRestricted: z.boolean(),
                  occurredAt: z.iso.datetime(),
                  pullRequest: highlightSchema,
                })
                .nullable(),
            )
            .max(50),
        }),
        issueContributions: z.object({
          nodes: z
            .array(
              z
                .object({
                  isRestricted: z.boolean(),
                  occurredAt: z.iso.datetime(),
                  issue: highlightSchema,
                })
                .nullable(),
            )
            .max(50),
        }),
      }),
    })
    .nullable(),
});

const repositoriesResponseSchema = z.object({
  user: z
    .object({
      repositories: z.object({
        totalCount: countSchema,
        pageInfo: z.object({
          hasNextPage: z.boolean(),
          endCursor: z.string().max(1024).nullable(),
        }),
        nodes: z
          .array(
            z
              .object({
                isPrivate: z.boolean(),
                visibility: z.enum(["PUBLIC", "PRIVATE", "INTERNAL"]),
                isFork: z.boolean(),
                owner: z.object({ login: z.string().max(39) }),
                languages: z
                  .object({
                    pageInfo: z.object({ hasNextPage: z.boolean() }),
                    edges: z
                      .array(
                        z
                          .object({
                            size: countSchema,
                            node: z.object({
                              name: z.string().min(1).max(100),
                              color: z.string().max(100).nullable(),
                            }),
                          })
                          .nullable(),
                      )
                      .max(20),
                  })
                  .nullable(),
              })
              .nullable(),
          )
          .max(100),
      }),
    })
    .nullable(),
});

const activityQuery = `query ProfileActivity($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    login
    userViewType
    isViewer
    contributionsCollection(from: $from, to: $to) {
      restrictedContributionsCount
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
      pullRequestContributions(first: 50, orderBy: {direction: DESC}) {
        nodes {
          isRestricted occurredAt
          pullRequest { id title url repository { nameWithOwner isPrivate visibility } }
        }
      }
      issueContributions(first: 50, orderBy: {direction: DESC}) {
        nodes {
          isRestricted occurredAt
          issue { id title url repository { nameWithOwner isPrivate visibility } }
        }
      }
    }
  }
}`;

const repositoriesQuery = `query ProfileLanguages($login: String!, $after: String) {
  user(login: $login) {
    repositories(first: 100, after: $after, privacy: PUBLIC, isFork: false,
      ownerAffiliations: [OWNER], orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        isPrivate visibility isFork owner { login }
        languages(first: 20, orderBy: {field: SIZE, direction: DESC}) {
          pageInfo { hasNextPage }
          edges { size node { name color } }
        }
      }
    }
  }
}`;

export class GitHubActivityError extends Error {
  constructor(
    readonly code: ActivityErrorCode,
    readonly retryAt?: string,
  ) {
    super(code);
    this.name = "GitHubActivityError";
  }
}

function retryDate(headers: Headers, now: number): string {
  const after = Number(headers.get("retry-after"));
  const reset = Number(headers.get("x-ratelimit-reset"));
  if (Number.isFinite(after) && after > 0) {
    return new Date(now + Math.min(after, 86_400) * 1000).toISOString();
  }
  if (Number.isFinite(reset) && reset * 1000 > now) {
    return new Date(Math.min(reset * 1000, now + 86_400_000)).toISOString();
  }
  return new Date(now + 60_000).toISOString();
}

export async function readBoundedJson(response: Response): Promise<unknown> {
  const length = Number(response.headers.get("content-length"));
  if (length > maximumResponseBytes || !response.body) {
    throw new GitHubActivityError("unavailable");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maximumResponseBytes) {
        await reader.cancel();
        throw new GitHubActivityError("unavailable");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof GitHubActivityError) throw error;
    throw new GitHubActivityError("unavailable");
  } finally {
    reader.releaseLock();
  }
}

export async function queryGitHub(
  token: string,
  query: string,
  variables: Record<string, unknown>,
  signal: AbortSignal,
  now: number,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "GitHub-Profile-Generator",
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      redirect: "error",
      signal,
    });
  } catch {
    throw new GitHubActivityError("unavailable");
  }

  if (response.status === 401) throw new GitHubActivityError("not_configured");
  if (
    response.status === 429 ||
    response.headers.get("x-ratelimit-remaining") === "0" ||
    response.status === 403
  ) {
    throw new GitHubActivityError("rate_limited", retryDate(response.headers, now));
  }
  if (!response.ok) throw new GitHubActivityError("unavailable");

  // Classic public_repo is sufficient for repository fields. Never accept repo,
  // read:user or another scope that could expose private contribution visibility.
  // An empty scope list remains valid for public fields available without scopes.
  const scopes = response.headers.get("x-oauth-scopes");
  const normalizedScopes = scopes?.trim().toLowerCase();
  if (scopes === null || (normalizedScopes !== "" && normalizedScopes !== "public_repo")) {
    throw new GitHubActivityError("not_configured");
  }

  const envelope = z
    .object({
      data: z.unknown().optional(),
      errors: z
        .array(
          z.object({
            type: z.string().optional(),
            extensions: z.object({ code: z.string().optional() }).optional(),
          }),
        )
        .optional(),
    })
    .safeParse(await readBoundedJson(response));
  if (!envelope.success) throw new GitHubActivityError("unavailable");
  if (envelope.data.errors?.length) {
    const codes = envelope.data.errors.map((error) => error.type ?? error.extensions?.code);
    if (codes.includes("RATE_LIMITED")) {
      throw new GitHubActivityError("rate_limited", retryDate(response.headers, now));
    }
    if (codes.includes("NOT_FOUND")) throw new GitHubActivityError("not_found");
    throw new GitHubActivityError("unavailable");
  }
  return envelope.data.data;
}

export function activityPeriod(now: Date): { from: string; to: string } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 364);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

async function readLanguages(
  username: string,
  token: string,
  signal: AbortSignal,
  now: number,
): Promise<ActivitySnapshot["languages"]> {
  const languages = new Map<string, { name: string; bytes: number; color: string | null }>();
  let after: string | null = null;
  let repositoriesAnalyzed = 0;
  let repositoriesTotal = 0;
  let truncated = false;
  const cursors = new Set<string>();

  for (let page = 0; page < maximumRepositoryPages; page += 1) {
    const parsed = repositoriesResponseSchema.safeParse(
      await queryGitHub(token, repositoriesQuery, { login: username, after }, signal, now),
    );
    if (!parsed.success || !parsed.data.user) throw new GitHubActivityError("unavailable");
    const connection = parsed.data.user.repositories;
    repositoriesTotal = connection.totalCount;
    for (const repository of connection.nodes) {
      if (
        !repository ||
        repository.isPrivate ||
        repository.visibility !== "PUBLIC" ||
        repository.isFork ||
        repository.owner.login.toLowerCase() !== username.toLowerCase()
      ) {
        truncated = true;
        continue;
      }
      repositoriesAnalyzed += 1;
      if (!repository.languages) throw new GitHubActivityError("unavailable");
      truncated ||= repository.languages.pageInfo.hasNextPage;
      for (const edge of repository.languages.edges) {
        if (!edge || edge.size === 0) continue;
        const previous = languages.get(edge.node.name);
        const bytes = (previous?.bytes ?? 0) + edge.size;
        if (!Number.isSafeInteger(bytes)) throw new GitHubActivityError("unavailable");
        languages.set(edge.node.name, {
          name: edge.node.name,
          bytes,
          color: /^#[a-f\d]{6}$/i.test(edge.node.color ?? "") ? edge.node.color : null,
        });
      }
    }
    if (!connection.pageInfo.hasNextPage) break;
    if (page === maximumRepositoryPages - 1) {
      truncated = true;
      break;
    }
    after = connection.pageInfo.endCursor;
    if (!after || cursors.has(after)) throw new GitHubActivityError("unavailable");
    cursors.add(after);
  }
  const items = [...languages.values()].sort(
    (a, b) => b.bytes - a.bytes || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );
  truncated ||= items.length > 100;
  return { items: items.slice(0, 100), repositoriesAnalyzed, repositoriesTotal, truncated };
}

export async function fetchGitHubActivity(
  username: string,
  token: string,
  now: Date,
): Promise<ActivitySnapshot> {
  const period = activityPeriod(now);
  const signal = AbortSignal.timeout(requestTimeoutMs);
  const parsed = activityResponseSchema.safeParse(
    await queryGitHub(
      token,
      activityQuery,
      { login: username, from: `${period.from}T00:00:00Z`, to: now.toISOString() },
      signal,
      now.getTime(),
    ),
  );
  if (!parsed.success) throw new GitHubActivityError("unavailable");
  if (!parsed.data.user) throw new GitHubActivityError("not_found");
  const user = parsed.data.user;
  // PRIVATE describes the authenticated view, including the token owner's own user.
  // ContributionsCollection excludes private/internal details without read:user,
  // which queryGitHub rejects before consuming data; repository filters still apply.
  if (
    user.login.toLowerCase() !== username.toLowerCase() ||
    (user.userViewType === "PRIVATE" && !user.isViewer)
  ) {
    throw new GitHubActivityError("unavailable");
  }
  const collection = user.contributionsCollection;
  const weeks = collection.contributionCalendar.weeks.map((week) => ({
    days: week.contributionDays
      .filter((day) => day.date >= period.from && day.date <= period.to)
      .map((day) => ({
        date: day.date,
        count: day.contributionCount,
        level: contributionLevels[day.contributionLevel as keyof typeof contributionLevels],
      })),
  }));
  const candidates = [
    ...collection.pullRequestContributions.nodes.flatMap((entry) =>
      !entry ||
      entry.isRestricted ||
      entry.pullRequest.repository.isPrivate ||
      entry.pullRequest.repository.visibility !== "PUBLIC"
        ? []
        : [{ ...entry.pullRequest, kind: "pull-request" as const, occurredAt: entry.occurredAt }],
    ),
    ...collection.issueContributions.nodes.flatMap((entry) =>
      !entry ||
      entry.isRestricted ||
      entry.issue.repository.isPrivate ||
      entry.issue.repository.visibility !== "PUBLIC"
        ? []
        : [{ ...entry.issue, kind: "issue" as const, occurredAt: entry.occurredAt }],
    ),
  ].sort((a, b) => (a.occurredAt > b.occurredAt ? -1 : a.occurredAt < b.occurredAt ? 1 : 0));
  const seen = new Set<string>();
  const highlights = candidates.flatMap((candidate) => {
    if (seen.has(candidate.id)) return [];
    seen.add(candidate.id);
    return [
      {
        id: candidate.id,
        title: candidate.title,
        url: candidate.url,
        kind: candidate.kind,
        repository: candidate.repository.nameWithOwner,
      },
    ];
  });
  const snapshot = activitySnapshotSchema.safeParse({
    username: user.login,
    fetchedAt: now.toISOString(),
    period,
    calendar: {
      total: weeks.flatMap((week) => week.days).reduce((sum, day) => sum + day.count, 0),
      weeks,
      includesPrivateCounts: collection.restrictedContributionsCount > 0,
    },
    summary: {
      commits: collection.totalCommitContributions,
      pullRequests: collection.totalPullRequestContributions,
      issues: collection.totalIssueContributions,
      reviews: collection.totalPullRequestReviewContributions,
    },
    languages: await readLanguages(user.login, token, signal, now.getTime()),
    highlights,
  });
  if (!snapshot.success) throw new GitHubActivityError("unavailable");
  return snapshot.data;
}
