import { activityCardUrl, normalizeActivityBaseUrl, normalizeGitHubUsername } from "../activity";
import type { ProfileDocument } from "../profile/profile-schema";
import type { ReadmeLabels } from "./readme-labels";
import type { ReadmeIssue } from "./readme-result";
import { renderContributionItems } from "./render-contributions";
import { joinBlocks, renderSection } from "./render-helpers";

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
  const username = normalizeGitHubUsername(metrics.username);
  if (!username) {
    errors.push({ code: "invalid_username", path: ["data", "metrics", "username"] });
    return "";
  }
  const origin = normalizeActivityBaseUrl(activityCardBaseUrl);
  if (!origin) exportIssues.push({ code: "activity_not_configured", path: ["data", "metrics"] });
  const images = metrics.cards.map((card) => {
    const url = activityCardUrl(username, card, document.contentLocale, origin ?? undefined)!;
    return `[![${labels[card]} (@${username})](${url})](${url})`;
  });
  return renderSection(
    labels.activity,
    joinBlocks([...images, highlights ? `### ${labels.highlights}\n\n${highlights}` : ""]),
  );
}
