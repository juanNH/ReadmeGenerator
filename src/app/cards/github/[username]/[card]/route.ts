import { renderActivityCard, renderActivityUnavailable } from "@/core/activity/render-card";
import { getGitHubActivity } from "@/server/github/activity-service";
import { activitySvgResponse, parseCardRequest } from "@/server/github/responses";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string; card: string }> },
) {
  const params = await context.params;
  const input = parseCardRequest(params.username, params.card, new URL(request.url));
  if (!input) return new Response("Invalid activity card request.", { status: 400 });
  const result = await getGitHubActivity(input.username);
  return result.success
    ? activitySvgResponse(
        renderActivityCard(result.data, input.card, input.locale, { stale: result.stale }),
        true,
        result.stale,
      )
    : activitySvgResponse(renderActivityUnavailable(input.card, input.locale), false, false);
}
