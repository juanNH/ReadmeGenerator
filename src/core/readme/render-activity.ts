import { activityCardUrl, normalizeActivityBaseUrl, normalizeGitHubUsername } from "../activity";
import type { ProfileDocument } from "../profile/profile-schema";
import type { ReadmeLabels } from "./readme-labels";
import type { CustomHtmlFragment, ReadmeIssue } from "./readme-result";
import { renderContributionItems } from "./render-contributions";
import { joinBlocks } from "./render-helpers";
import { resourceCardUrl } from "../activity/resource-urls";
import type { ResourceKind } from "../activity/resource-types";
import type { ProfileHtmlBudget } from "./derived-profile-html";

type RenderedActivity = {
  readonly markdown: string;
  readonly htmlFragments: readonly CustomHtmlFragment[];
};

function layoutActivityCards(images: readonly string[], columns: 1 | 2): string {
  if (columns === 1) return images.join("\n\n");
  const rows: string[] = [];
  for (let index = 0; index < images.length; index += 2) {
    const cells = images.slice(index, index + 2);
    rows.push(`| ${cells.join(" | ")} |\n| ${cells.map(() => "---").join(" | ")} |`);
  }
  return rows.join("\n\n");
}

export function renderActivity(
  document: ProfileDocument,
  labels: ReadmeLabels,
  errors: ReadmeIssue[],
  exportIssues: ReadmeIssue[],
  activityCardBaseUrl: string | undefined,
  activityCards: string[],
  htmlBudget: ProfileHtmlBudget,
): RenderedActivity {
  const highlights = document.visibility.contributions
    ? renderContributionItems(document.data.contributions, labels, errors, htmlBudget)
    : { markdown: "", htmlFragments: [] };
  const metrics = document.data.metrics;
  if (!document.visibility.metrics || metrics.cards.length === 0) {
    const heading = `## ${labels.contributions}\n\n`;
    return {
      markdown: highlights.markdown ? `${heading}${highlights.markdown}` : "",
      htmlFragments: highlights.htmlFragments.map((fragment) => ({
        ...fragment,
        start: fragment.start + heading.length,
        end: fragment.end + heading.length,
      })),
    };
  }
  const images: string[] = [];

  if (document.visibility.metrics && metrics.cards.length > 0) {
    const origin = normalizeActivityBaseUrl(activityCardBaseUrl);
    if (!origin) exportIssues.push({ code: "activity_not_configured", path: ["data", "metrics"] });
    const username = normalizeGitHubUsername(metrics.username);
    for (const card of metrics.cards) {
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
          continue;
        }
        for (const [index, target] of targets.entries()) {
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
            continue;
          }
          activityCards.push(url);
          images.push(`[![${labels[card]} (${target})](${url})](${url})`);
        }
        continue;
      }
      if (!username) {
        if (!errors.some((error) => error.code === "invalid_username"))
          errors.push({ code: "invalid_username", path: ["data", "metrics", "username"] });
        continue;
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
        continue;
      }
      activityCards.push(url);
      images.push(`[![${labels[card]} (@${username})](${url})](${url})`);
    }
  }

  const blocks: { markdown: string; htmlFragments: readonly CustomHtmlFragment[] }[] = [];
  const imageMarkdown = layoutActivityCards(images, metrics.cardColumns ?? 1);
  if (imageMarkdown) blocks.push({ markdown: imageMarkdown, htmlFragments: [] });
  if (highlights.markdown) {
    const heading = `### ${labels.highlights}\n\n`;
    blocks.push({
      markdown: `${heading}${highlights.markdown}`,
      htmlFragments: highlights.htmlFragments.map((fragment) => ({
        ...fragment,
        start: fragment.start + heading.length,
        end: fragment.end + heading.length,
      })),
    });
  }

  const content = joinBlocks(blocks.map((block) => block.markdown));
  const sectionHeading = content ? `## ${labels.activity}\n\n` : "";
  let bodyCursor = 0;
  const htmlFragments: CustomHtmlFragment[] = [];
  for (const [index, block] of blocks.entries()) {
    if (index > 0) bodyCursor += 2;
    for (const fragment of block.htmlFragments) {
      htmlFragments.push({
        ...fragment,
        start: sectionHeading.length + bodyCursor + fragment.start,
        end: sectionHeading.length + bodyCursor + fragment.end,
      });
    }
    bodyCursor += block.markdown.length;
  }

  return {
    markdown: content ? `${sectionHeading}${content}` : "",
    htmlFragments,
  };
}
