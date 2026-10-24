import type { Element, ElementContent, Root } from "hast";
import { toHtml } from "hast-util-to-html";
import type { ProfileModuleData } from "../profile/module-content";
import { findTechnology } from "../technologies";
import { escapeInlineText, normalizeInlineText, normalizeParagraphText } from "./escape-markdown";
import { renderProfileHtml, type ProfileHtmlBudget } from "./derived-profile-html";
import type { CustomHtmlFragment, ReadmeIssue } from "./readme-result";
import { joinBlocks, renderList, renderSection, renderTitledDescription } from "./render-helpers";
import type { ReadmeLabels } from "./readme-labels";
import { namedTechnologyIconMarkup } from "./technology-icons";

export function renderTechnologies(
  data: ProfileModuleData["technologies"],
  labels: ReadmeLabels,
  errors: ReadmeIssue[],
  htmlBudget: ProfileHtmlBudget,
): { markdown: string; htmlFragments: readonly CustomHtmlFragment[] } {
  if (data.layout !== "compact")
    return { markdown: renderGroupedTechnologies(data, labels), htmlFragments: [] };
  const blocks: string[] = [];
  const htmlFragments: CustomHtmlFragment[] = [];
  let cursor = 0;
  function append(markdown: string) {
    if (blocks.length) cursor += 2;
    blocks.push(markdown);
    cursor += markdown.length;
  }
  append(`## ${labels.technologies}`);
  for (const [groupIndex, group] of data.groups.entries()) {
    const children: ElementContent[] = [];
    const groupName = normalizeInlineText(group.name);
    let paragraph: ElementContent[] = groupName
      ? [
          {
            type: "element",
            tagName: "strong",
            properties: {},
            children: [{ type: "text", value: `${groupName}: ` }],
          },
        ]
      : [];
    let hasContent = false;
    function flush() {
      if (paragraph.length)
        children.push({ type: "element", tagName: "p", properties: {}, children: paragraph });
      paragraph = [];
    }
    for (const item of group.items) {
      const technology = findTechnology(item.name);
      const name = normalizeInlineText(technology?.name ?? item.name);
      const context = normalizeParagraphText(item.context);
      if (!name && !context) continue;
      hasContent = true;
      if (name) {
        const chipChildren: ElementContent[] = [];
        if (technology)
          chipChildren.push(
            {
              type: "element",
              tagName: "img",
              properties: { width: 20, height: 20, src: technology.iconUrl, alt: "" },
              children: [],
            },
            { type: "text", value: " " },
          );
        chipChildren.push({ type: "text", value: name });
        const chip: Element = {
          type: "element",
          tagName: "kbd",
          properties: {},
          children: chipChildren,
        };
        paragraph.push(chip);
      }
      if (context) {
        const [first, ...rest] = context.split("\n\n");
        paragraph.push({ type: "text", value: `${name ? ": " : ""}${first}` });
        flush();
        for (const text of rest) {
          paragraph.push({ type: "text", value: text });
          flush();
        }
      } else paragraph.push({ type: "text", value: " " });
    }
    if (!hasContent) continue;
    flush();
    const tree: Root = { type: "root", children };
    const fragment = renderProfileHtml(
      toHtml(tree),
      ["data", "technologies", "groups", groupIndex],
      errors,
      htmlBudget,
    );
    if (!fragment) continue;
    if (blocks.length) cursor += 2;
    htmlFragments.push({
      ...fragment,
      start: cursor,
      end: cursor + fragment.html.length,
      headingLevel: 4,
    });
    blocks.push(fragment.html);
    cursor += fragment.html.length;
  }
  return { markdown: blocks.length > 1 ? blocks.join("\n\n") : "", htmlFragments };
}

/** Absence of layout keeps the exact legacy output for recovered v1/v2 drafts. */
function renderGroupedTechnologies(
  data: ProfileModuleData["technologies"],
  labels: ReadmeLabels,
): string {
  const groups = data.groups.map((group) => {
    const blocks: string[] = [];
    let icons: string[] = [];
    function flushIcons() {
      if (icons.length > 0) blocks.push(icons.join(" · "));
      icons = [];
    }
    for (const item of group.items) {
      const technology = findTechnology(item.name);
      if (!item.context.trim() && item.name.trim()) {
        const name = escapeInlineText(technology?.name ?? item.name);
        icons.push(technology ? `${namedTechnologyIconMarkup(technology)}&nbsp;${name}` : name);
      } else {
        flushIcons();
        const text = renderTitledDescription(item.name, item.context);
        if (text)
          blocks.push(
            renderList([technology ? `${namedTechnologyIconMarkup(technology)} ${text}` : text]),
          );
      }
    }
    flushIcons();
    const items = joinBlocks(blocks);
    if (!items) return "";
    const name = escapeInlineText(group.name);
    return name ? `### ${name}\n\n${items}` : items;
  });
  return renderSection(labels.technologies, joinBlocks(groups));
}
