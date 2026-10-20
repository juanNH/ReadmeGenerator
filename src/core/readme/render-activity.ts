import { activityCardUrl, normalizeActivityBaseUrl, normalizeGitHubUsername } from "../activity";
import type { ProfileDocument } from "../profile/profile-schema";
import type { ReadmeLabels } from "./readme-labels";
import type { ReadmeIssue } from "./readme-result";
import { renderContributionItems } from "./render-contributions";
import { joinBlocks, renderSection } from "./render-helpers";
import { resourceCardUrl } from "../activity/resource-urls";
import type { ResourceKind } from "../activity/resource-types";

export function renderActivity(
  document: ProfileDocument,
  labels: ReadmeLabels,
  errors: ReadmeIssue[],
  exportIssues: ReadmeIssue[],
  activityCardBaseUrl?: string,
) {
  const highlights = document.visibility.contributions
    ? renderContributionItems(document.data.contributions, labels, errors)
    : "";
  const metrics = document.data.metrics;
  if (!document.visibility.metrics || metrics.cards.length === 0) {
    return renderSection(labels.contributions, highlights);
  }
  const origin = normalizeActivityBaseUrl(activityCardBaseUrl);
  if (!origin) exportIssues.push({ code: "activity_not_configured", path: ["data", "metrics"] });
  const username = normalizeGitHubUsername(metrics.username);
  const images = metrics.cards.flatMap((card) => {
    const kind: ResourceKind | null =
      card === "extended-repository"
        ? "repository"
        : card === "extended-gist"
          ? "gist"
          : card === "extended-wakatime"
            ? "wakatime"
            : null;
    if (kind) {
      const field =
        kind === "repository" ? "repositories" : kind === "gist" ? "gists" : "wakatimeUsername";
      const targets =
        kind === "repository"
          ? (metrics.extended?.repositories ?? [])
          : kind === "gist"
            ? (metrics.extended?.gists ?? [])
            : metrics.extended?.wakatimeUsername
              ? [metrics.extended.wakatimeUsername]
              : [];
      if (!targets.length) {
        errors.push({
          code: "invalid_activity_options",
          path: ["data", "metrics", "extended", field],
        });
        return [];
      }
      return targets.flatMap((target, index) => {
        const url = resourceCardUrl(
          kind,
          target,
          document.contentLocale,
          origin ?? undefined,
          metrics.appearance,
          metrics.extended?.resourceOptions,
        );
        if (!url) {
          errors.push({
            code: "invalid_activity_options",
            path: ["data", "metrics", "extended", field, index],
          });
          return [];
        }
        return [`[![${labels[card]} (${target})](${url})](${url})`];
      });
    }
    if (!username) {
      if (!errors.some((error) => error.code === "invalid_username"))
        errors.push({ code: "invalid_username", path: ["data", "metrics", "username"] });
      return [];
    }
    const url = activityCardUrl(
      username,
      card,
      document.contentLocale,
      origin ?? undefined,
      metrics.appearance,
      card === "extended-stats"
        ? { stats: metrics.extended?.stats }
        : card === "extended-languages"
          ? { languages: metrics.extended?.languages }
          : undefined,
    );
    if (!url) {
      errors.push({ code: "invalid_activity_options", path: ["data", "metrics", "extended"] });
      return [];
    }
    return [`[![${labels[card]} (@${username})](${url})](${url})`];
  });
  return renderSection(
    labels.activity,
    joinBlocks([...images, highlights ? `### ${labels.highlights}\n\n${highlights}` : ""]),
  );
}
