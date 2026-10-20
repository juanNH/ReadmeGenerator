import type { ElementContent, Root } from "hast";
import { toHtml } from "hast-util-to-html";
import { analyzeProfileHtml, PROFILE_HTML_MAX_DOCUMENT_LENGTH } from "./profile-html";
import type { ReadmeIssue } from "./readme-result";

export type ProfileHtmlBudget = { sourceLength: number };

/** Text values are literal HAST text nodes, never parsed as user-authored HTML. */
export function formattedTextSource(
  tag: string,
  text: string,
  alignment: "left" | "center" | "right",
): string {
  const tree: Root = {
    type: "root",
    children: (tag === "p" ? text.split("\n\n") : [text]).map((value) => ({
      type: "element",
      tagName: tag,
      properties: { align: alignment },
      children: [{ type: "text", value }],
    })),
  };
  return toHtml(tree);
}

/** Share HTML policy, wrapper and aggregate budget for explicit and derived content. */
export function renderProfileHtml(
  source: string,
  path: readonly (string | number)[],
  errors: ReadmeIssue[],
  budget: ProfileHtmlBudget,
): { html: string; tree: Root } | null {
  budget.sourceLength += source.length;
  if (budget.sourceLength > PROFILE_HTML_MAX_DOCUMENT_LENGTH) {
    errors.push({ code: "invalid_html", path });
    return null;
  }
  const analyzed = analyzeProfileHtml(source);
  if (analyzed.errors.length > 0) {
    errors.push({ code: "invalid_html", path });
    return null;
  }
  if (!analyzed.html) return null;
  return {
    html: `<div>${analyzed.html}</div>`,
    tree: {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "div",
          properties: {},
          children: analyzed.tree.children as ElementContent[],
        },
      ],
    },
  };
}
