import type {
  CustomBlock,
  CustomHeadingLevel,
  CustomSection,
  CustomTextAlignment,
} from "@/core/profile/custom-content";
import { normalizeInlineText } from "@/core/readme/escape-markdown";

export type CustomTextBlock = Extract<CustomBlock, { type: "paragraph" | "heading" }>;
export type CustomTextKind = "paragraph" | "1" | "2" | "3";

/** Older headings adapt to the optional section title until a level is explicitly chosen. */
export function getCustomTextKind(block: CustomTextBlock, sectionTitle: string): CustomTextKind {
  return block.type === "paragraph"
    ? "paragraph"
    : (String(block.level ?? (normalizeInlineText(sectionTitle) ? 3 : 2)) as "1" | "2" | "3");
}

/** An explicit heading choice stays stable when the optional section title changes. */
export function changeCustomTextKind(
  block: CustomTextBlock,
  kind: CustomTextKind,
): CustomTextBlock {
  const content = {
    id: block.id,
    text: block.text,
    ...(block.alignment ? { alignment: block.alignment } : {}),
  };
  return kind === "paragraph"
    ? { ...content, type: "paragraph" }
    : {
        ...content,
        type: "heading",
        level: Number(kind) as CustomHeadingLevel,
      };
}

export function changeCustomTextAlignment(
  block: CustomTextBlock,
  alignment: CustomTextAlignment,
): CustomTextBlock {
  const content = { ...block };
  delete content.alignment;
  return alignment === "left" ? content : { ...content, alignment };
}

export function changeCustomTitleLevel(
  section: CustomSection,
  level: CustomHeadingLevel,
): CustomSection {
  const content = { ...section };
  delete content.titleLevel;
  return level === 2 ? content : { ...content, titleLevel: level };
}

export function changeCustomTitleAlignment(
  section: CustomSection,
  alignment: CustomTextAlignment,
): CustomSection {
  const content = { ...section };
  delete content.titleAlignment;
  return alignment === "left" ? content : { ...content, titleAlignment: alignment };
}
