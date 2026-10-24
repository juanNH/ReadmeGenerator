import { renderActivityCard, renderActivityUnavailable } from "@/core/activity/render-card";
import { getGitHubActivity } from "@/server/github/activity-service";
import { activitySvgResponse, parseCardRequest } from "@/server/github/responses";
import { getExtendedProfile } from "@/server/github/extended-service";
import { renderExtendedProfileCard } from "@/core/activity/render-extended-profile";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string; card: string }> },
) {
  const params = await context.params;
  const input = parseCardRequest(params.username, params.card, new URL(request.url));
  if (!input) return new Response("Invalid activity card request.", { status: 400 });
  if (input.card === "extended-stats" || input.card === "extended-languages") {
    const cardOptions =
      input.card === "extended-stats"
        ? { stats: input.extended?.stats ?? {} }
        : { languages: input.extended?.languages ?? {} };
    const extended = await getExtendedProfile(input.username, cardOptions);
    return extended.success
      ? activitySvgResponse(
          renderExtendedProfileCard(extended.data, input.card, input.locale, {
            cardColumns: input.cardColumns,
            appearance: input.appearance,
            extended: cardOptions,
            stale: extended.stale,
          }),
          true,
          extended.stale,
        )
      : activitySvgResponse(
          renderActivityUnavailable(input.card, input.locale, {
            appearance: input.appearance,
            cardColumns: input.cardColumns,
          }),
          false,
          false,
        );
  }
  const result = await getGitHubActivity(input.username);
  return result.success
    ? activitySvgResponse(
        renderActivityCard(result.data, input.card, input.locale, {
          cardColumns: input.cardColumns,
          stale: result.stale,
          appearance: input.appearance,
        }),
        true,
        result.stale,
      )
    : activitySvgResponse(
        renderActivityUnavailable(input.card, input.locale, {
          appearance: input.appearance,
          cardColumns: input.cardColumns,
        }),
        false,
        false,
      );
}
