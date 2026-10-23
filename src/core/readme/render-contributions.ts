import type { ElementContent, Root } from "hast";
import { toHtml } from "hast-util-to-html";
import type { ProfileModuleData } from "../profile/module-content";
import { renderProfileHtml, type ProfileHtmlBudget } from "./derived-profile-html";
import { normalizeInlineText } from "./escape-markdown";
import { parseGitHubRepositoryUrl } from "./github-repository";
import { joinBlocks, renderList, renderLink, renderTitledDescription } from "./render-helpers";
import type { ReadmeLabels } from "./readme-labels";
import type { CustomHtmlFragment, ReadmeIssue } from "./readme-result";
import { normalizePublicImageUrl } from "./public-image";

export type RenderedContributions = {
  readonly markdown: string;
  readonly htmlFragments: readonly CustomHtmlFragment[];
};

export function renderContributions(
  data: ProfileModuleData["contributions"],
  labels: ReadmeLabels,
  errors: ReadmeIssue[],
  htmlBudget: ProfileHtmlBudget,
): RenderedContributions {
  const rendered = renderContributionItems(data, labels, errors, htmlBudget);
  return {
    markdown: rendered.markdown ? `## ${labels.contributions}\n\n${rendered.markdown}` : "",
    htmlFragments: rendered.htmlFragments.map((fragment) => ({
      ...fragment,
      start: fragment.start + `## ${labels.contributions}\n\n`.length,
      end: fragment.end + `## ${labels.contributions}\n\n`.length,
    })),
  };
}

/** The Markdown and ranges are relative to this contribution list. */
export function renderContributionItems(
  data: ProfileModuleData["contributions"],
  labels: ReadmeLabels,
  errors: ReadmeIssue[],
  htmlBudget: ProfileHtmlBudget,
): RenderedContributions {
  const blocks: string[] = [];
  const htmlFragments: CustomHtmlFragment[] = [];
  let cursor = 0;

  function append(
    markdown: string,
    fragment?: Omit<CustomHtmlFragment, "start" | "end" | "headingLevel">,
  ) {
    if (!markdown) return;
    if (blocks.length > 0) cursor += 2;
    if (fragment) {
      htmlFragments.push({
        ...fragment,
        start: cursor,
        end: cursor + markdown.length,
        headingLevel: 4,
      });
    }
    blocks.push(markdown);
    cursor += markdown.length;
  }

  for (const [index, item] of data.items.entries()) {
    const links =
      item.links === undefined
        ? [
            item.url.trim()
              ? renderLink(
                  labels.moreInformation,
                  item.url,
                  ["data", "contributions", "items", index, "url"],
                  errors,
                )
              : "",
          ]
        : item.links.map((link, linkIndex) => {
            if (!link.label.trim() && !link.url.trim()) return "";
            return renderLink(
              link.label.trim() ? link.label : labels.moreInformation,
              link.url,
              ["data", "contributions", "items", index, "links", linkIndex, "url"],
              errors,
            );
          });
    append(
      renderList([
        joinBlocks([
          renderTitledDescription(item.title, item.description),
          links.filter(Boolean).join(" · "),
        ]),
      ]),
    );

    for (const [imageIndex, image] of (item.images ?? []).entries()) {
      if (!image.url.trim() && !image.alt.trim()) continue;
      const path = ["data", "contributions", "items", index, "images", imageIndex] as const;
      const src = normalizePublicImageUrl(image.url);
      const alt = normalizeInlineText(image.alt);
      if (!src) errors.push({ code: "invalid_url", path: [...path, "url"] });
      if (!alt) errors.push({ code: "missing_image_alt", path: [...path, "alt"] });
      if (!src || !alt) continue;

      const tree: Root = {
        type: "root",
        children: [
          {
            type: "element",
            tagName: "p",
            properties: {},
            children: [
              {
                type: "element",
                tagName: "img",
                properties: { src, alt, width: 480 },
                children: [],
              },
            ],
          },
        ],
      };
      const fragment = renderProfileHtml(toHtml(tree), [...path, "url"], errors, htmlBudget);
      if (fragment) append(fragment.html, fragment);
    }

    const repository = item.repository;
    if (repository && (repository.url.trim() || repository.description.trim())) {
      const path = ["data", "contributions", "items", index, "repository"] as const;
      const target = parseGitHubRepositoryUrl(repository.url);
      if (!target) {
        errors.push({ code: "invalid_url", path: [...path, "url"] });
        continue;
      }

      const link: ElementContent = {
        type: "element",
        tagName: "a",
        properties: { href: target.url },
        children: [
          {
            type: "element",
            tagName: "strong",
            properties: {},
            children: [{ type: "text", value: target.fullName }],
          },
        ],
      };
      const children: ElementContent[] = [link];
      const description = normalizeInlineText(repository.description);
      if (description) {
        children.push(
          { type: "element", tagName: "br", properties: {}, children: [] },
          { type: "text", value: description },
        );
      }
      const tree: Root = {
        type: "root",
        children: [
          {
            type: "element",
            tagName: "p",
            properties: {},
            children,
          },
        ],
      };
      const fragment = renderProfileHtml(toHtml(tree), [...path, "url"], errors, htmlBudget);
      if (fragment) append(fragment.html, fragment);
    }
  }

  return {
    markdown: blocks.join("\n\n"),
    htmlFragments,
  };
}
