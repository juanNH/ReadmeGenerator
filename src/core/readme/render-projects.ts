import type { Root } from "hast";
import { toHtml } from "hast-util-to-html";
import type { ProfileModuleData } from "../profile/module-content";
import { renderProfileHtml, type ProfileHtmlBudget } from "./derived-profile-html";
import { escapeInlineText, escapeParagraphText, normalizeInlineText } from "./escape-markdown";
import { renderLabeledText, renderLink } from "./render-helpers";
import { normalizePublicImageUrl } from "./public-image";
import type { ReadmeLabels } from "./readme-labels";
import type { CustomHtmlFragment, ReadmeIssue } from "./readme-result";
import { escapeLinkDestination, normalizeWebUrl } from "./web-url";

/** A project remains useful without a name, public repository or cover. */
export function renderProjects(
  data: ProfileModuleData["projects"],
  labels: ReadmeLabels,
  errors: ReadmeIssue[],
  htmlBudget: ProfileHtmlBudget,
): { markdown: string; htmlFragments: readonly CustomHtmlFragment[] } {
  const blocks: string[] = [];
  const htmlFragments: CustomHtmlFragment[] = [];
  let cursor = 0;

  function append(markdown: string, fragment?: { html: string; tree: Root }) {
    if (!markdown) return;
    if (blocks.length) cursor += 2;
    if (fragment)
      htmlFragments.push({
        ...fragment,
        start: cursor,
        end: cursor + markdown.length,
        headingLevel: 4,
      });
    blocks.push(markdown);
    cursor += markdown.length;
  }

  append(`## ${labels.projects}`);
  for (const [index, item] of data.items.entries()) {
    const name = escapeInlineText(item.name);
    let primaryUrl: string | null = null;
    if (item.titleUrl !== undefined) {
      if (item.titleUrl.trim()) {
        primaryUrl = normalizeWebUrl(item.titleUrl);
        if (!primaryUrl)
          errors.push({
            code: "invalid_url",
            path: ["data", "projects", "items", index, "titleUrl"],
          });
      }
    } else {
      // Older v2 documents store the title destination inside a repeated links array.
      const legacyIndex = item.links.findIndex((link) =>
        Boolean(link.url.trim() || link.label.trim()),
      );
      if (legacyIndex >= 0) {
        const link = item.links[legacyIndex]!;
        const validLink = renderLink(
          link.label,
          link.url,
          ["data", "projects", "items", index, "links", legacyIndex, "url"],
          errors,
        );
        if (validLink) primaryUrl = normalizeWebUrl(link.url);
      }
    }
    const title = name
      ? `### ${primaryUrl ? `[${name}](${escapeLinkDestination(primaryUrl)})` : name}`
      : "";
    const technologies = item.technologies.map(escapeInlineText).filter(Boolean).join(", ");
    const details = [
      renderLabeledText(labels.role, item.role),
      technologies ? `${labels.technologies}: ${technologies}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    // Keep legacy structured details visible in the description after their form fields are retired.
    const description = [escapeParagraphText(item.description), details]
      .filter(Boolean)
      .join(" · ");
    const cover = item.cover;
    const hasCover = cover && Boolean(cover.url.trim() || cover.alt.trim());
    if (!title && !description && !hasCover) continue;

    append(title);
    append(description);
    if (hasCover) {
      const path = ["data", "projects", "items", index, "cover"];
      const src = normalizePublicImageUrl(cover.url);
      const alt = normalizeInlineText(cover.alt);
      if (!src) errors.push({ code: "invalid_url", path: [...path, "url"] });
      if (!alt) errors.push({ code: "missing_image_alt", path: [...path, "alt"] });
      if (src && alt) {
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
    }
  }
  return { markdown: blocks.length > 1 ? blocks.join("\n\n") : "", htmlFragments };
}
