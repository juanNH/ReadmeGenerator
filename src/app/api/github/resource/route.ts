import { resourceKinds, normalizeResourceTarget } from "@/core/activity/resource-types";
import { getPublicResource } from "@/server/github/resource-service";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = resourceKinds.find((kind) => kind === url.searchParams.get("kind"));
  if (
    !kind ||
    url.searchParams.getAll("kind").length !== 1 ||
    url.searchParams.getAll("target").length !== 1 ||
    [...url.searchParams.keys()].some((key) => key !== "kind" && key !== "target")
  )
    return Response.json({ success: false, code: "invalid_username" }, { status: 400 });
  const target = normalizeResourceTarget(kind, url.searchParams.get("target") ?? "");
  if (!target) return Response.json({ success: false, code: "invalid_username" }, { status: 400 });
  const result = await getPublicResource(kind, target);
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
