import { normalizeGitHubUsername } from "@/core/activity";
import { parseCardOptions } from "@/core/activity/card-options";
import { getExtendedProfile } from "@/server/github/extended-service";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (
    url.searchParams.getAll("username").length !== 1 ||
    [...url.searchParams.keys()].some((key) => !["username", "stats", "languages"].includes(key))
  )
    return Response.json({ success: false, code: "invalid_username" }, { status: 400 });
  const username = normalizeGitHubUsername(url.searchParams.get("username") ?? "");
  const params = new URLSearchParams(url.searchParams);
  params.delete("username");
  const options = parseCardOptions(params);
  if (!username || !options)
    return Response.json({ success: false, code: "invalid_username" }, { status: 400 });
  const result = await getExtendedProfile(username, options.extended);
  const status = result.success
    ? 200
    : result.code === "not_found"
      ? 404
      : result.code === "rate_limited"
        ? 429
        : 503;
  return Response.json(result, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(!result.success && result.retryAt
        ? { "Retry-After": new Date(result.retryAt).toUTCString() }
        : {}),
    },
  });
}
