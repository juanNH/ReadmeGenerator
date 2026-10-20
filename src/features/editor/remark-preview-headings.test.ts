import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { toHast } from "mdast-util-to-hast";
import type { Root, Heading } from "mdast";
import { createEmptyProfile } from "@/core/profile/profile-operations";
import { generateReadme, type CustomHtmlFragment } from "@/core/readme";
import { remarkCustomHtml } from "./remark-custom-html";
import { remarkPreviewHeadings } from "./remark-preview-headings";

function analyzeHeadings(markdown: string, fragments: readonly CustomHtmlFragment[] = []) {
  const tree = unified().use(remarkParse).parse(markdown) as Root;
  remarkCustomHtml({ fragments })(tree, { value: markdown });
  remarkPreviewHeadings({ fragments })(tree);
  const headings = tree.children.filter((node): node is Heading => node.type === "heading");
  return {
    tree,
    depths: headings.map((node) => node.depth),
    levels: headings.map((node) => node.data?.hProperties?.dataProfileHeadingLevel),
  };
}

function formattedDocument(html: string, hasSectionTitle: boolean) {
  const document = createEmptyProfile("en");
  document.customSections = [
    {
      id: "custom",
      title: hasSectionTitle ? "Section" : "",
      visible: true,
      blocks: [
        { id: "html", type: "html", source: html },
        { id: "small", type: "heading", text: "Small heading", level: 3 },
      ],
    },
  ];
  document.sectionOrder.push({ kind: "custom", sectionId: "custom" });
  const result = generateReadme(document);
  if (!result.success) throw new Error(JSON.stringify(result.errors));
  return result;
}

describe("semantic preview levels for native Markdown headings", () => {
  it("keeps a first ### visually small but exposes h3 beneath the editor's h2", () => {
    const result = analyzeHeadings("### A small introduction");
    expect(result.depths).toEqual([3]);
    expect(result.levels).toEqual(["3"]);
    const hast = toHast(result.tree);
    expect(hast).toMatchObject({
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h3",
          properties: { dataProfileHeadingLevel: "3" },
        },
      ],
    });
  });

  it.each([
    ["# Name\n\n## Headline", [1, 2], ["3", "3"]],
    ["## Technologies\n\n### Frontend", [2, 3], ["3", "4"]],
    ["### First\n\n### Second", [3, 3], ["3", "4"]],
    ["## First\n\n### Detail\n\n## Next\n\n### Detail", [2, 3, 2, 3], ["3", "4", "3", "4"]],
  ])(
    "adapts the semantic sequence of %j while preserving authored depths",
    (markdown, depths, levels) => {
      const result = analyzeHeadings(String(markdown));
      expect(result.depths).toEqual(depths);
      expect(result.levels).toEqual(levels);
    },
  );

  it("counts an exact derived HTML heading before a following native subtitle", () => {
    const document = formattedDocument('<h2 align="center">HTML heading</h2>', false);
    const before = document.markdown;
    const result = analyzeHeadings(document.markdown, document.customHtml);
    expect(result.depths).toEqual([3]);
    expect(result.levels).toEqual(["4"]);
    expect(document.markdown).toBe(before);
  });

  it("keeps native subtitle nesting following a titled section with an HTML heading", () => {
    const document = formattedDocument('<h3 align="right">HTML detail</h3>', true);
    expect(analyzeHeadings(document.markdown, document.customHtml).levels).toEqual(["3", "4"]);
  });

  it("does not count an HTML slot containing only paragraphs as a previous heading", () => {
    const document = formattedDocument("<p>Just text, not a heading</p>", false);
    expect(analyzeHeadings(document.markdown, document.customHtml).levels).toEqual(["3"]);
  });

  it("does not count escaped heading-like text inside an HTML paragraph", () => {
    const document = formattedDocument("<p>&lt;h1>Literal&lt;/h1></p>", false);
    expect(analyzeHeadings(document.markdown, document.customHtml).levels).toEqual(["3"]);
  });

  it("ignores unrecognized raw HTML and code fences when determining semantic order", () => {
    const source =
      "<h1>Unverified HTML</h1>\n\n```markdown\n# Literal heading\n```\n\n### Real title";
    expect(analyzeHeadings(source).levels).toEqual(["3"]);
  });

  it("preserves existing heading metadata and source positions", () => {
    const tree = unified().use(remarkParse).parse("### Small") as Root;
    const heading = tree.children[0] as Heading;
    heading.data = { hProperties: { title: "Accessible title" } };
    const position = structuredClone(heading.position);
    remarkPreviewHeadings()(tree);
    expect(heading.data).toEqual({
      hProperties: { title: "Accessible title", dataProfileHeadingLevel: "3" },
    });
    expect(heading.position).toEqual(position);
    expect(heading.depth).toBe(3);
  });

  it.each([null, undefined, {}, { type: "root" }, { type: "paragraph", children: [] }])(
    "ignores non-root input %j",
    (tree) => expect(() => remarkPreviewHeadings()(tree)).not.toThrow(),
  );
});
