import { describe, expect, it } from "vitest";
import { activityCardUrl } from "@/core/activity";
import { resourceCardUrl } from "@/core/activity/resource-urls";
import { localActivityCardSources } from "./activity-card-requests";

describe("explicit card approval sources", () => {
  it("validates exact generated URLs and deduplicates only their local request", () => {
    const base = "https://cards.example.com";
    const card = activityCardUrl("example-dev", "extended-stats", "en", base)!;
    const resource = resourceCardUrl("repository", "owner/repo", "es", base)!;
    expect(localActivityCardSources([card, card, resource], base)).toEqual([
      card.slice(base.length),
      resource.slice(base.length),
    ]);
  });

  it("rejects arbitrary hosts, extra parameters and a public URL without configured origin", () => {
    const local = activityCardUrl("example-dev", "summary", "en")!;
    expect(
      localActivityCardSources([local, `${local}&other=true`, `https://other.example${local}`]),
    ).toEqual([local]);
  });
});
