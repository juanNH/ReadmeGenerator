import "server-only";

import { z } from "zod";
import {
  normalizeResourceTarget,
  resourceSnapshotSchema,
  type ResourceKind,
  type ResourceSnapshot,
} from "@/core/activity/resource-types";
import { GitHubActivityError, queryGitHub } from "./client";

const maximumResponseBytes = 2 * 1024 * 1024;
const maximumSeconds = 8 * 24 * 60 * 60;
const countSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const secondsSchema = z.number().nonnegative().max(maximumSeconds);
const repositorySchema = z.object({
  full_name: z.string().max(140),
  name: z.string().max(100),
  owner: z.object({ login: z.string().max(39) }),
  private: z.boolean(),
  visibility: z.enum(["public", "private", "internal"]),
  description: z.string().max(1000).nullable(),
  stargazers_count: countSchema,
  forks_count: countSchema,
  language: z.string().min(1).max(100).nullable(),
});
const gistSchema = z.object({
  id: z.string().max(64),
  node_id: z.string().min(1).max(400),
  public: z.boolean(),
  description: z.string().max(1000).nullable(),
  owner: z.object({ login: z.string().max(39) }),
  files: z.record(z.string().max(1000), z.object({})),
  comments: countSchema,
});
const gistDetailsSchema = z.object({
  node: z
    .object({
      __typename: z.literal("Gist"),
      id: z.string().min(1).max(400),
      name: z.string().min(1).max(64),
      isPublic: z.boolean(),
      owner: z.object({ login: z.string().min(1).max(39) }),
      stargazerCount: countSchema,
      forks: z.object({ totalCount: countSchema }),
      files: z
        .array(
          z
            .object({
              language: z
                .object({
                  name: z.string().min(1).max(100),
                  color: z
                    .string()
                    .regex(/^#[a-f\d]{6}$/i)
                    .nullable(),
                })
                .nullable(),
            })
            .nullable(),
        )
        .max(1)
        .nullable(),
    })
    .nullable(),
});
const gistDetailsQuery = `query PublicGistMetadata($id: ID!) {
  node(id: $id) {
    __typename
    ... on Gist {
      id name isPublic owner { login }
      stargazerCount forks { totalCount }
      files(limit: 1) { language { name color } }
    }
  }
}`;
const wakaTimeSchema = z.object({
  data: z.object({
    username: z.string().max(64).nullable(),
    user_id: z.string().max(64),
    start: z.iso.datetime({ offset: true }).optional(),
    end: z.iso.datetime({ offset: true }).optional(),
    range: z.literal("last_7_days").optional(),
    is_coding_activity_visible: z.boolean(),
    is_language_usage_visible: z.boolean(),
    is_up_to_date: z.boolean(),
    total_seconds_including_other_language: secondsSchema,
    languages: z
      .array(
        z.object({
          name: z.string().min(1).max(100),
          total_seconds: secondsSchema,
          percent: z.number().nonnegative().max(100),
        }),
      )
      .max(100),
  }),
});

function retryDate(headers: Headers, now: number): string {
  const after = Number(headers.get("retry-after"));
  const reset = Number(headers.get("x-ratelimit-reset"));
  if (Number.isFinite(after) && after > 0) {
    return new Date(now + Math.min(after, 86_400) * 1000).toISOString();
  }
  const httpDate = Date.parse(headers.get("retry-after") ?? "");
  if (Number.isFinite(httpDate) && httpDate > now) {
    return new Date(Math.min(httpDate, now + 86_400_000)).toISOString();
  }
  return new Date(
    Number.isFinite(reset) && reset * 1000 > now
      ? Math.min(reset * 1000, now + 86_400_000)
      : now + 60_000,
  ).toISOString();
}

async function boundedJson(response: Response): Promise<unknown> {
  const length = Number(response.headers.get("content-length"));
  if (!response.body || length > maximumResponseBytes) throw new GitHubActivityError("unavailable");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let source = "";
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maximumResponseBytes) {
        await reader.cancel();
        throw new GitHubActivityError("unavailable");
      }
      source += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(source + decoder.decode()) as unknown;
  } catch {
    throw new GitHubActivityError("unavailable");
  } finally {
    reader.releaseLock();
  }
}

async function publicJson(
  kind: ResourceKind,
  target: string,
  token: string | undefined,
  signal: AbortSignal,
  now: number,
): Promise<unknown> {
  const isGitHub = kind !== "wakatime";
  if (isGitHub && !token) throw new GitHubActivityError("not_configured");
  // The service never accepts arbitrary provider domains or forwards GitHub credentials to WakaTime.
  const endpoint =
    kind === "repository"
      ? `https://api.github.com/repos/${target}`
      : kind === "gist"
        ? `https://api.github.com/gists/${target}`
        : `https://api.wakatime.com/api/v1/users/${target}/stats/last_7_days`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers: isGitHub
        ? {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "User-Agent": "GitHub-Profile-Generator",
            "X-GitHub-Api-Version": "2022-11-28",
          }
        : { Accept: "application/json", "User-Agent": "GitHub-Profile-Generator" },
      cache: "no-store",
      redirect: "error",
      signal,
    });
  } catch {
    throw new GitHubActivityError("unavailable");
  }
  if (response.status === 401)
    throw new GitHubActivityError(isGitHub ? "not_configured" : "not_found");
  if (response.status === 404 || (!isGitHub && response.status === 403)) {
    throw new GitHubActivityError("not_found");
  }
  if (
    response.status === 429 ||
    response.status === 403 ||
    response.headers.get("x-ratelimit-remaining") === "0"
  ) {
    throw new GitHubActivityError("rate_limited", retryDate(response.headers, now));
  }
  if (response.status !== 200) throw new GitHubActivityError("unavailable");
  if (isGitHub) {
    const scopes = response.headers.get("x-oauth-scopes");
    if (scopes === null || !["", "public_repo"].includes(scopes.trim().toLowerCase())) {
      throw new GitHubActivityError("not_configured");
    }
  }
  return boundedJson(response);
}

/** Expose only public metadata. Embedded REST Gist content is discarded, never cached or returned. */
export async function fetchPublicResource(
  kind: ResourceKind,
  rawTarget: string,
  token: string | undefined,
  now: Date,
): Promise<ResourceSnapshot> {
  const target = normalizeResourceTarget(kind, rawTarget);
  if (!target) throw new GitHubActivityError("invalid_username");
  const signal = AbortSignal.timeout(15_000);
  const response = await publicJson(kind, target, token, signal, now.getTime());
  const common = { target, fetchedAt: now.toISOString() };
  let snapshot: unknown;
  if (kind === "repository") {
    const visibility = z
      .object({ private: z.boolean(), visibility: z.string() })
      .safeParse(response);
    if (
      visibility.success &&
      (visibility.data.private || visibility.data.visibility !== "public")
    ) {
      throw new GitHubActivityError("not_found");
    }
    const parsed = repositorySchema.safeParse(response);
    if (!parsed.success) throw new GitHubActivityError("unavailable");
    const repo = parsed.data;
    if (
      repo.private ||
      repo.visibility !== "public" ||
      normalizeResourceTarget(kind, repo.full_name) !== target ||
      normalizeResourceTarget(kind, `${repo.owner.login}/${repo.name}`) !== target
    ) {
      throw new GitHubActivityError("not_found");
    }
    snapshot = {
      kind,
      ...common,
      owner: repo.owner.login,
      name: repo.name,
      description: repo.description ?? "",
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language ? { name: repo.language, color: null } : null,
    };
  } else if (kind === "gist") {
    const visibility = z.object({ public: z.boolean() }).safeParse(response);
    if (visibility.success && !visibility.data.public) throw new GitHubActivityError("not_found");
    const parsed = gistSchema.safeParse(response);
    if (!parsed.success) throw new GitHubActivityError("unavailable");
    const gist = parsed.data;
    // Secret gists can be reachable by ID; that does not make them public.
    if (!gist.public || normalizeResourceTarget(kind, gist.id) !== target) {
      throw new GitHubActivityError("not_found");
    }
    // REST establishes public visibility and the opaque node ID before asking for
    // GraphQL-only counts. Both requests share the same 15-second deadline.
    if (!token) throw new GitHubActivityError("not_configured");
    const detailsResponse = await queryGitHub(
      token,
      gistDetailsQuery,
      { id: gist.node_id },
      signal,
      now.getTime(),
    );
    const detailsVisibility = z
      .object({ node: z.object({ isPublic: z.boolean() }).nullable() })
      .safeParse(detailsResponse);
    if (detailsVisibility.success && !detailsVisibility.data.node?.isPublic) {
      throw new GitHubActivityError("not_found");
    }
    const details = gistDetailsSchema.safeParse(detailsResponse);
    if (!details.success) throw new GitHubActivityError("unavailable");
    const publicGist = details.data.node;
    if (
      !publicGist ||
      !publicGist.isPublic ||
      publicGist.id !== gist.node_id ||
      normalizeResourceTarget(kind, publicGist.name) !== target ||
      publicGist.owner.login.toLowerCase() !== gist.owner.login.toLowerCase()
    ) {
      throw new GitHubActivityError("not_found");
    }
    snapshot = {
      kind,
      ...common,
      owner: gist.owner.login,
      description: gist.description ?? "",
      files: Object.keys(gist.files).length,
      comments: gist.comments,
      stars: publicGist.stargazerCount,
      forks: publicGist.forks.totalCount,
      language: publicGist.files?.[0]?.language ?? null,
    };
  } else {
    const visibility = z
      .object({
        data: z.object({
          is_coding_activity_visible: z.boolean().optional(),
          is_language_usage_visible: z.boolean().optional(),
        }),
      })
      .safeParse(response);
    if (
      !visibility.success ||
      visibility.data.data.is_coding_activity_visible !== true ||
      visibility.data.data.is_language_usage_visible !== true
    ) {
      throw new GitHubActivityError("not_found");
    }
    const parsed = wakaTimeSchema.safeParse(response);
    if (!parsed.success) throw new GitHubActivityError("unavailable");
    const stats = parsed.data.data;
    if (
      !stats.is_coding_activity_visible ||
      !stats.is_language_usage_visible ||
      (normalizeResourceTarget(kind, stats.username ?? "") !== target &&
        normalizeResourceTarget(kind, stats.user_id) !== target)
    ) {
      throw new GitHubActivityError("not_found");
    }
    if (!stats.is_up_to_date) throw new GitHubActivityError("unavailable");
    snapshot = {
      kind,
      ...common,
      range: "last_7_days",
      ...(stats.start && stats.end
        ? { period: { from: stats.start.slice(0, 10), to: stats.end.slice(0, 10) } }
        : {}),
      languages: stats.languages.map((language) => ({
        name: language.name,
        seconds: language.total_seconds,
        percent: language.percent,
      })),
      totalSeconds: stats.total_seconds_including_other_language,
    };
  }
  const parsed = resourceSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) throw new GitHubActivityError("unavailable");
  return parsed.data;
}
