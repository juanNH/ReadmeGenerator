import type { CustomSection } from "../profile/custom-content";
import { escapeInlineText, escapeParagraphText, normalizeInlineText } from "./escape-markdown";
import { normalizePublicImageUrl } from "./public-image";
import { joinBlocks, renderLink, renderSection } from "./render-helpers";
import type { CustomImageSource, ReadmeIssue } from "./readme-result";
import { escapeLinkDestination } from "./web-url";

export type CustomSectionRenderResult = {
  readonly markdown: string;
  readonly nextListIndex: number;
};

/** Alternate emitted list markers so CommonMark keeps independently authored lists separate. */
export function renderCustomSectionWithListIndex(
  section: CustomSection,
  sectionIndex: number,
  errors: ReadmeIssue[],
  initialListIndex: number,
  images?: CustomImageSource[],
): CustomSectionRenderResult {
  let nextListIndex = initialListIndex;
  if (!section.visible) return { markdown: "", nextListIndex };
  const title = escapeInlineText(section.title);
  const blocks = section.blocks.map((block, blockIndex) => {
    switch (block.type) {
      case "paragraph":
        return escapeParagraphText(block.text);
      case "heading": {
        const text = escapeInlineText(block.text);
        return text ? `${title ? "###" : "##"} ${text}` : "";
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
  const content = joinBlocks(blocks);
  if (!content) return { markdown: "", nextListIndex };
  return { markdown: title ? renderSection(title, content) : content, nextListIndex };
}

/** Standalone callers start a fresh list sequence; all authored text remains escaped. */
export function renderCustomSection(
  section: CustomSection,
  sectionIndex: number,
  errors: ReadmeIssue[],
): string {
  return renderCustomSectionWithListIndex(section, sectionIndex, errors, 0).markdown;
}
