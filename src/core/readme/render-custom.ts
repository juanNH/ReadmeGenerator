import type { Root } from "hast";
import { CODE_MAX_SOURCE_LENGTH, normalizeCodeLanguage, renderCodeFence } from "../code";
import type { CustomSection } from "../profile/custom-content";
import {
  escapeInlineText,
  escapeParagraphText,
  normalizeInlineText,
  normalizeParagraphText,
} from "./escape-markdown";
import { normalizePublicImageUrl } from "./public-image";
import {
  formattedTextSource,
  renderProfileHtml,
  type ProfileHtmlBudget,
} from "./derived-profile-html";
import { renderLink } from "./render-helpers";
import type { CustomHtmlFragment, CustomImageSource, ReadmeIssue } from "./readme-result";
import { escapeLinkDestination } from "./web-url";

export type CustomSectionRenderResult = {
  readonly markdown: string;
  readonly nextListIndex: number;
  readonly htmlFragments?: readonly CustomHtmlFragment[];
};

export type CustomHtmlBudget = ProfileHtmlBudget;

/** Alternate emitted list markers so CommonMark keeps independently authored lists separate. */
export function renderCustomSectionWithListIndex(
  section: CustomSection,
  sectionIndex: number,
  errors: ReadmeIssue[],
  initialListIndex: number,
  images?: CustomImageSource[],
  htmlBudget: CustomHtmlBudget = { sourceLength: 0 },
): CustomSectionRenderResult {
  let nextListIndex = initialListIndex;
  if (!section.visible) return { markdown: "", nextListIndex };
  const title = section.showTitle === false ? "" : escapeInlineText(section.title);
  const htmlBlocks = new Map<number, Root>();
  function html(source: string, path: readonly (string | number)[], blockIndex: number): string {
    const rendered = renderProfileHtml(source, path, errors, htmlBudget);
    if (!rendered) return "";
    htmlBlocks.set(blockIndex, rendered.tree);
    return rendered.html;
  }
  const blocks = section.blocks.map((block, blockIndex) => {
    const path = ["customSections", sectionIndex, "blocks", blockIndex] as const;
    switch (block.type) {
      case "paragraph": {
        if (block.alignment && block.alignment !== "left") {
          const text = normalizeParagraphText(block.text);
          return text
            ? html(formattedTextSource("p", text, block.alignment), [...path, "text"], blockIndex)
            : "";
        }
        return escapeParagraphText(block.text);
      }
      case "heading": {
        const text = escapeInlineText(block.text);
        if (!text) return "";
        const level = block.level ?? (title ? 3 : 2);
        return block.alignment && block.alignment !== "left"
          ? html(
              formattedTextSource(`h${level}`, normalizeInlineText(block.text), block.alignment),
              [...path, "text"],
              blockIndex,
            )
          : `${"#".repeat(level)} ${text}`;
      }
      case "code": {
        const language = normalizeCodeLanguage(block.language);
        if (language === null) errors.push({ code: "invalid_code", path: [...path, "language"] });
        if (block.source.length > CODE_MAX_SOURCE_LENGTH)
          errors.push({ code: "invalid_code", path: [...path, "source"] });
        if (language === null || block.source.length > CODE_MAX_SOURCE_LENGTH || !block.source)
          return "";
        return renderCodeFence(block.source, language);
      }
      case "divider":
        return "---";
      case "quote": {
        const text = escapeParagraphText(block.text);
        return text
          ? text
              .split("\n")
              .map((line) => (line ? `> ${line}` : ">"))
              .join("\n")
          : "";
      }
      case "image": {
        const alt = normalizeInlineText(block.alt);
        if (!block.url.trim() && !alt) return "";
        const src = normalizePublicImageUrl(block.url);
        const path = ["customSections", sectionIndex, "blocks", blockIndex] as const;
        if (src === null) errors.push({ code: "invalid_url", path: [...path, "url"] });
        if (!alt && block.url.trim()) {
          errors.push({ code: "missing_image_alt", path: [...path, "alt"] });
        }
        if (src === null || !alt) return "";
        images?.push({ src, alt });
        return `![${escapeInlineText(alt)}](${escapeLinkDestination(src)})`;
      }
      case "html": {
        return html(block.source, [...path, "source"], blockIndex);
      }
      case "list": {
        const items = block.items.map((item) => escapeParagraphText(item.text)).filter(Boolean);
        if (items.length === 0) return "";
        const even = nextListIndex % 2 === 0;
        const marker = block.style === "ordered" ? (even ? "." : ")") : even ? "+" : "*";
        nextListIndex += 1;
        return items
          .map((text, index) => {
            const prefix = block.style === "ordered" ? `${index + 1}${marker} ` : `${marker} `;
            const indentation = " ".repeat(prefix.length);
            return `${prefix}${text.replace(/\n/g, `\n${indentation}`)}`;
          })
          .join("\n");
      }
      case "link":
        return renderLink(
          block.label,
          block.url,
          ["customSections", sectionIndex, "blocks", blockIndex, "url"],
          errors,
        );
    }
  });
  if (!blocks.some(Boolean)) return { markdown: "", nextListIndex };
  const heading = !title
    ? ""
    : section.titleAlignment && section.titleAlignment !== "left"
      ? html(
          formattedTextSource(
            `h${section.titleLevel ?? 2}`,
            normalizeInlineText(section.title),
            section.titleAlignment,
          ),
          ["customSections", sectionIndex, "title"],
          -1,
        )
      : `${"#".repeat(section.titleLevel ?? 2)} ${title}`;
  const prefix = heading ? `${heading}\n\n` : "";
  const htmlFragments: CustomHtmlFragment[] = [];
  let content = "";
  blocks.forEach((text, blockIndex) => {
    if (!text) return;
    if (content) content += "\n\n";
    const tree = htmlBlocks.get(blockIndex);
    if (tree) {
      const start = prefix.length + content.length;
      htmlFragments.push({
        html: text,
        tree,
        start,
        end: start + text.length,
        headingLevel: title ? 4 : 3,
      });
    }
    content += text;
  });
  if (!content) return { markdown: "", nextListIndex };
  const titleTree = htmlBlocks.get(-1);
  if (titleTree) {
    htmlFragments.unshift({
      html: heading,
      tree: titleTree,
      start: 0,
      end: heading.length,
      headingLevel: 3,
    });
  }
  return {
    markdown: `${prefix}${content}`,
    nextListIndex,
    ...(htmlFragments.length ? { htmlFragments } : {}),
  };
}

/** Standalone callers start a fresh list sequence; all authored text remains escaped. */
export function renderCustomSection(
  section: CustomSection,
  sectionIndex: number,
  errors: ReadmeIssue[],
): string {
  return renderCustomSectionWithListIndex(section, sectionIndex, errors, 0).markdown;
}
