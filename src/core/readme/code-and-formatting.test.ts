import { describe, expect, it } from "vitest";
import { toHtml } from "hast-util-to-html";
import { CODE_MAX_DOCUMENT_LENGTH, CODE_MAX_SOURCE_LENGTH } from "../code";
import type { CustomBlock, CustomSection } from "../profile/custom-content";
import { createEmptyProfile, duplicateCustomSection } from "../profile/profile-operations";
import { parseProfileDocument } from "../profile/profile-validation";
import { generateReadme } from "./generate-readme";
import { PROFILE_HTML_MAX_DOCUMENT_LENGTH, PROFILE_HTML_MAX_LENGTH } from "./profile-html";

function profile(blocks: CustomBlock[], changes: Partial<CustomSection> = {}) {
  const document = createEmptyProfile("en");
  document.customSections = [{ id: "section", title: "", visible: true, blocks, ...changes }];
  document.sectionOrder.push({ kind: "custom", sectionId: "section" });
  return document;
}

function successful(blocks: CustomBlock[], changes: Partial<CustomSection> = {}) {
  const result = generateReadme(profile(blocks, changes));
  if (!result.success) throw new Error(JSON.stringify(result.errors));
  return result;
}

describe("additive code and visual formatting contracts", () => {
  it("does not persist defaults or change output of existing blocks", () => {
    const document = profile(
      [
        { id: "p", type: "paragraph", text: "My **plain** words" },
        { id: "h", type: "heading", text: "Details" },
      ],
      { title: "About" },
    );
    const parsed = parseProfileDocument(document);
    expect(parsed).toEqual({ success: true, data: document });
    expect(generateReadme(document)).toEqual({
      success: true,
      markdown: "## About\n\nMy \\*\\*plain\\*\\* words\n\n### Details\n",
    });
    expect(Object.hasOwn(parsed.success ? parsed.data.customSections[0]! : {}, "titleLevel")).toBe(
      false,
    );
  });

  it.each([
    [{ alignment: "justify" }, "blocks", "alignment"],
    [{ level: 4 }, "heading", "level"],
    [{ titleLevel: 0 }, "section", "titleLevel"],
    [{ titleAlignment: "middle" }, "section", "titleAlignment"],
  ] as const)("rejects unknown formatting without dropping it: %j", (changes, target, field) => {
    const document = profile([
      { id: "b", type: target === "heading" ? "heading" : "paragraph", text: "Words" },
    ]);
    if (target === "section") Object.assign(document.customSections[0]!, changes);
    else Object.assign(document.customSections[0]!.blocks[0]!, changes);
    const original = structuredClone(document);
    const parsed = parseProfileDocument(document);
    expect(parsed).toMatchObject({ success: false });
    if (parsed.success) throw new Error("Expected rejected format");
    expect(parsed.errors.some((issue) => issue.path.at(-1) === field)).toBe(true);
    expect(document).toEqual(original);
  });

  it("duplicates all formatting and literal code independently with fresh identities", () => {
    const document = profile(
      [
        { id: "p", type: "paragraph", text: "Words", alignment: "center" },
        { id: "h", type: "heading", text: "Heading", level: 1, alignment: "right" },
        { id: "c", type: "code", source: 'name = "Juan"\r\n', language: "toml" },
      ],
      { title: "About", titleLevel: 1, titleAlignment: "center" },
    );
    const snapshot = structuredClone(document);
    let index = 0;
    const result = duplicateCustomSection(document, "section", () => `new-${++index}`);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const copy = result.data.customSections[1]!;
    expect(copy).toEqual({
      ...document.customSections[0],
      id: "new-1",
      blocks: document.customSections[0]!.blocks.map((block, blockIndex) => ({
        ...block,
        id: `new-${blockIndex + 2}`,
      })),
    });
    expect(copy.blocks[0]).not.toBe(document.customSections[0]!.blocks[0]);
    expect(document).toEqual(snapshot);
  });

  it("accepts a code source structurally without treating validation as export permission", () => {
    const document = profile([
      {
        id: "c",
        type: "code",
        language: "js\ninjected",
        source: "x".repeat(CODE_MAX_SOURCE_LENGTH + 1),
      },
    ]);
    expect(parseProfileDocument(document).success).toBe(true);
    expect(generateReadme(document)).toEqual({
      success: false,
      errors: [
        { code: "invalid_code", path: ["customSections", 0, "blocks", 0, "language"] },
        { code: "invalid_code", path: ["customSections", 0, "blocks", 0, "source"] },
      ],
    });
  });

  it.each(["source", "language"])(
    "requires a string code %s and preserves unsupported properties",
    (field) => {
      const document = profile([{ id: "c", type: "code", source: "x", language: "" }]);
      Object.assign(document.customSections[0]!.blocks[0]!, { [field]: 1 });
      expect(parseProfileDocument(document).success).toBe(false);
      Object.assign(document.customSections[0]!.blocks[0]!, { [field]: "x", executable: true });
      expect(parseProfileDocument(document).success).toBe(false);
    },
  );
});

describe("literal code generation and bounded export", () => {
  it("exports TOML, unknown safe languages and plain text with source unchanged", () => {
    const source = 'name = "Juan"\r\n# **literal** <script>x</script>\r\n';
    const result = successful([
      { id: "toml", type: "code", language: "TOML", source },
      { id: "unknown", type: "code", language: "future-lang", source: "  untouched  " },
      { id: "plain", type: "code", language: "", source: "\n" },
    ]);
    expect(result.markdown).toContain(`\`\`\`toml\n${source}\n\`\`\``);
    expect(result.markdown).toContain("```future-lang\n  untouched  \n```");
    expect(result.markdown).toContain("```\n\n\n```");
    expect(result.customHtml).toBeUndefined();
    expect(result.customImages).toBeUndefined();
  });

  it("does not count hidden code or HTML toward visible budgets or errors", () => {
    const document = profile(
      [
        {
          id: "bad",
          type: "code",
          source: "x".repeat(CODE_MAX_DOCUMENT_LENGTH + 1),
          language: "`bad",
        },
        { id: "html", type: "html", source: "x".repeat(PROFILE_HTML_MAX_DOCUMENT_LENGTH + 1) },
      ],
      { visible: false },
    );
    document.visibility.presentation = true;
    document.data.presentation.bio = "Hello";
    expect(generateReadme(document)).toEqual({ success: true, markdown: "Hello\n" });
  });

  it("enforces exact per-block and aggregate code source budgets", () => {
    const blocks: CustomBlock[] = Array.from(
      { length: CODE_MAX_DOCUMENT_LENGTH / CODE_MAX_SOURCE_LENGTH },
      (_, index) => ({
        id: `c-${index}`,
        type: "code",
        language: "",
        source: "x".repeat(CODE_MAX_SOURCE_LENGTH),
      }),
    );
    expect(generateReadme(profile(blocks)).success).toBe(true);
    expect(
      generateReadme(
        profile([...blocks, { id: "extra", type: "code", source: "x", language: "" }]),
      ),
    ).toEqual({
      success: false,
      errors: [{ code: "invalid_code", path: ["customSections", 0, "blocks", 5, "source"] }],
    });
  });

  it("omits exactly empty code and titles without body", () => {
    expect(
      generateReadme(
        profile([{ id: "c", type: "code", source: "", language: "toml" }], {
          title: "Title",
          titleAlignment: "center",
        }),
      ),
    ).toEqual({ success: false, errors: [{ code: "empty_profile", path: [] }] });
  });
});

describe("safe formatting from plain authored fields", () => {
  it.each([1, 2, 3] as const)(
    "exports explicit section and heading level %i as Markdown",
    (level) => {
      const result = successful([{ id: "h", type: "heading", text: "Heading", level }], {
        title: "Section",
        titleLevel: level,
      });
      expect(result.markdown).toBe(
        `${"#".repeat(level)} Section\n\n${"#".repeat(level)} Heading\n`,
      );
      expect(result.customHtml).toBeUndefined();
    },
  );

  it("keeps left alignment as ordinary Markdown and does not interpret syntax", () => {
    const result = successful(
      [{ id: "p", type: "paragraph", text: "<b>**plain**</b>", alignment: "left" }],
      { title: "My title", titleAlignment: "left" },
    );
    expect(result.markdown).toBe("## My title\n\n&lt;b&gt;\\*\\*plain\\*\\*&lt;/b&gt;\n");
    expect(result.customHtml).toBeUndefined();
  });

  it("derives escaped aligned HTML and exact UTF16 ranges for every allowed unit", () => {
    const result = successful(
      [
        {
          id: "p",
          type: "paragraph",
          text: "😀 <img src=x> **plain**\r\nsecond line\n\nnext paragraph",
          alignment: "center",
        },
        {
          id: "h",
          type: "heading",
          text: "Right <script>alert(1)</script>",
          level: 1,
          alignment: "right",
        },
        { id: "raw", type: "html", source: "<p>Explicit</p>" },
        { id: "code", type: "code", source: "```\n<div>literal</div>", language: "markdown" },
      ],
      { title: "<b>Juan 🌱</b>", titleLevel: 1, titleAlignment: "center" },
    );
    expect(result.markdown).toContain('<h1 align="center">&#x3C;b>Juan 🌱&#x3C;/b></h1>');
    expect(result.markdown).toContain(
      '<p align="center">😀 &#x3C;img src=x> **plain**&#10;second line</p><p align="center">next paragraph</p>',
    );
    expect(result.markdown).toContain(
      '<h1 align="right">Right &#x3C;script>alert(1)&#x3C;/script></h1>',
    );
    expect(result.customHtml).toHaveLength(4);
    let previousEnd = 0;
    for (const fragment of result.customHtml!) {
      expect(fragment.start).toBeGreaterThanOrEqual(previousEnd);
      expect(result.markdown.slice(fragment.start, fragment.end)).toBe(fragment.html);
      expect(toHtml(fragment.tree).replace(/\r/g, "&#13;").replace(/\n/g, "&#10;")).toBe(
        fragment.html,
      );
      previousEnd = fragment.end;
    }
    expect(result.customHtml![0]!.headingLevel).toBe(3);
    expect(result.customHtml![1]!.headingLevel).toBe(4);
    expect(result.customImages).toBeUndefined();
  });

  it("keeps absolute HTML ranges valid before and after ordinary modules", () => {
    const document = profile(
      [{ id: "p", type: "paragraph", text: "Aligned", alignment: "right" }],
      { title: "Title", titleAlignment: "center" },
    );
    document.visibility.presentation = true;
    document.data.presentation.displayName = "Name 🌟";
    const result = generateReadme(document);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.markdown.startsWith('<div><h1 align="center">Name 🌟</h1></div>\n\n')).toBe(true);
    expect(
      result.customHtml?.every(
        (fragment) => result.markdown.slice(fragment.start, fragment.end) === fragment.html,
      ),
    ).toBe(true);
  });

  it("applies existing HTML block and visible-document budgets to derived formatting", () => {
    expect(
      generateReadme(
        profile([
          {
            id: "p",
            type: "paragraph",
            text: "x".repeat(PROFILE_HTML_MAX_LENGTH),
            alignment: "center",
          },
        ]),
      ),
    ).toEqual({
      success: false,
      errors: [{ code: "invalid_html", path: ["customSections", 0, "blocks", 0, "text"] }],
    });
    const raw = "x".repeat(29_990);
    const blocks: CustomBlock[] = Array.from({ length: 5 }, (_, index) => ({
      id: `raw-${index}`,
      type: "html",
      source: raw,
    }));
    blocks.push({ id: "formatted", type: "paragraph", text: "x".repeat(100), alignment: "right" });
    expect(generateReadme(profile(blocks))).toEqual({
      success: false,
      errors: [{ code: "invalid_html", path: ["customSections", 0, "blocks", 5, "text"] }],
    });
  });
});
