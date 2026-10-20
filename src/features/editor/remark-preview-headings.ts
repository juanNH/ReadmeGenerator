import type { RootContent } from "hast";
import type { CustomHtmlFragment } from "@/core/readme";

type MarkdownNode = {
  type: string;
  depth?: number;
  children?: MarkdownNode[];
  data?: { hProperties?: Record<string, unknown>; [key: string]: unknown };
};

function containsHeading(fragment: CustomHtmlFragment): boolean {
  const pending: RootContent[] = [...fragment.tree.children];
  while (pending.length) {
    const node = pending.pop();
    if (!node || node.type !== "element") continue;
    if (/^h[1-6]$/.test(node.tagName)) return true;
    pending.push(...node.children);
  }
  return false;
}

/** Keep Markdown appearance while avoiding skipped semantic levels below the editor's h2. */
export function remarkPreviewHeadings(options: { fragments?: readonly CustomHtmlFragment[] } = {}) {
  return (tree: unknown) => {
    if (
      typeof tree !== "object" ||
      tree === null ||
      !("type" in tree) ||
      tree.type !== "root" ||
      !("children" in tree) ||
      !Array.isArray(tree.children)
    )
      return;
    let previousLevel = 2;
    const pending = [...(tree.children as MarkdownNode[])].reverse();
    while (pending.length) {
      const node = pending.pop();
      if (!node) continue;
      if (node.type === "heading" && node.depth && node.depth >= 1 && node.depth <= 3) {
        const preferredLevel = node.depth === 3 ? 4 : 3;
        const level = Math.min(preferredLevel, previousLevel + 1);
        node.data = {
          ...node.data,
          hProperties: {
            ...node.data?.hProperties,
            dataProfileHeadingLevel: String(level),
          },
        };
        previousLevel = level;
      } else if (node.type === "profileHtml") {
        const index = Number(node.data?.hProperties?.dataProfileHtmlIndex);
        const fragment = Number.isSafeInteger(index) ? options.fragments?.[index] : undefined;
        if (fragment && containsHeading(fragment)) previousLevel = fragment.headingLevel;
      }
      if (node.children) pending.push(...[...node.children].reverse());
    }
  };
}
