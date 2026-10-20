import { parseActivityCardUrl } from "@/core/activity";
import { parseResourceCardUrl } from "@/core/activity/resource-urls";

/** Only the generator's exact, validated card URLs can be approved for local display. */
export function localActivityCardSources(
  sources: readonly string[],
  activityCardBaseUrl?: string,
): string[] {
  return [
    ...new Set(
      sources.flatMap((source) => {
        const card =
          parseActivityCardUrl(source, activityCardBaseUrl) ??
          parseResourceCardUrl(source, activityCardBaseUrl);
        return card ? [card.localUrl] : [];
      }),
    ),
  ];
}
