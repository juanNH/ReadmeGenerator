import "server-only";

import { normalizeGitHubUsername } from "@/core/activity";
import type { ActivityResult } from "@/core/activity/activity-types";
import { parseCardOptions } from "@/core/activity/card-options";
import { profileActivityCardIds } from "@/core/profile/module-content";

export function parseActivityRequest(url: URL): string | null {
  if (
    [...url.searchParams.keys()].some((key) => key !== "username") ||
    url.searchParams.getAll("username").length !== 1
  ) {
    return null;
  }
  return normalizeGitHubUsername(url.searchParams.get("username") ?? "");
}

export function parseCardRequest(username: string, cardFilename: string, url: URL) {
  const normalizedUsername = normalizeGitHubUsername(username);
  const options = parseCardOptions(url.searchParams);
  const card = profileActivityCardIds.find((id) => `${id}.svg` === cardFilename);
  if (
    !normalizedUsername ||
    !card ||
    !options ||
    (url.searchParams.has("stats") && card !== "extended-stats") ||
    (url.searchParams.has("languages") && card !== "extended-languages")
  ) {
    return null;
  }
  return { username: normalizedUsername, card, ...options };
}

export function activityJsonResponse(result: ActivityResult): Response {
  const status = result.success
    ? 200
    : result.code === "invalid_username"
      ? 400
      : result.code === "not_found"
        ? 404
        : result.code === "rate_limited"
          ? 429
          : 503;
  const headers: Record<string, string> = {
    "Cache-Control": result.success
      ? result.stale
        ? "public, max-age=60, s-maxage=60"
        : "public, max-age=300, s-maxage=1800, stale-if-error=86400"
      : "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (!result.success && result.retryAt) {
    headers["Retry-After"] = new Date(result.retryAt).toUTCString();
  }
  return Response.json(result, { status, headers });
}

export function activitySvgResponse(svg: string, ready: boolean, stale: boolean): Response {
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": ready
        ? stale
          ? "public, max-age=60, s-maxage=60"
          : "public, max-age=300, s-maxage=1800, stale-if-error=86400"
        : "public, max-age=60, s-maxage=60",
      "Content-Security-Policy": "default-src 'none'; style-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "X-Activity-State": ready ? (stale ? "stale" : "ready") : "unavailable",
    },
  });
}
