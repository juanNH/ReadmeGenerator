import { parseResourceCardRequest } from "@/core/activity/resource-urls";
import {
  renderResourceCard,
  renderResourceUnavailable,
} from "@/core/activity/render-resource-card";
import { getPublicResource } from "@/server/github/resource-service";
import { activitySvgResponse } from "@/server/github/responses";
import { getExtendedProfile } from "@/server/github/extended-service";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ card: string }> }) {
  const { card } = await context.params;
  const input = parseResourceCardRequest(card, new URL(request.url));
  if (!input) return new Response("Invalid public resource card request.", { status: 400 });
  const result = await getPublicResource(input.kind, input.target);
  const selectedContributions =
    input.kind === "repository" ? (input.options?.contributionStats ?? []) : [];
  const author = input.options?.contributionUsername;
  const profile =
    result.success && selectedContributions.length && author
      ? await getExtendedProfile(author, {
          stats: { items: selectedContributions, repositories: [input.target] },
        })
      : undefined;
  const contributions =
    author && selectedContributions.length
      ? {
          username: author,
          fetchedAt: profile?.success ? profile.data.fetchedAt : undefined,
          stale: profile?.success ? profile.stale : false,
          items: selectedContributions.map((id) => ({
            id,
            metric: profile?.success
              ? profile.data.stats[id]
              : { value: null, scope: "lifetime" as const, partial: true },
          })),
        }
      : undefined;
  return result.success
    ? activitySvgResponse(
        renderResourceCard(result.data, input.locale, {
          appearance: input.appearance,
          stale: result.stale || (profile?.success === true && profile.stale),
          ...input.options,
          ...(contributions ? { contributions } : {}),
        }),
        true,
        result.stale || (profile?.success === true && profile.stale),
      )
    : activitySvgResponse(
        renderResourceUnavailable(input.kind, input.locale, { appearance: input.appearance }),
        false,
        false,
      );
}
