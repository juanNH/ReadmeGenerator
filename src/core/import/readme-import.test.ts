import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "../profile/profile-operations";
import { parseProfileDocument } from "../profile/profile-validation";
import { generateReadme } from "../readme/generate-readme";
import {
  analyzeReadmeImport,
  buildImportedProfile,
  README_IMPORT_MAX_LENGTH,
  type ReadmeImportAnalysis,
} from "./index";

function buildAll(analysis: ReadmeImportAnalysis) {
  return buildImportedProfile(
    analysis,
    analysis.sections.map((section) => section.id),
  );
}

function imported(source: string) {
  const analysis = analyzeReadmeImport(source, "en");
  expect(analysis.errors).toEqual([]);
  const result = buildAll(analysis);
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(JSON.stringify(result.errors));
  return { analysis, result };
}

describe("local README import analysis", () => {
  it("creates an ordered proposal without assuming the fixed identity of headings", () => {
    const source =
      "# Hi, I am Alex\n\nI build useful tools.\n\n## Technologies\n\nReact and Rust.\n\n## Contact\n\n[Portfolio](https://alex.dev)";
    const { analysis, result } = imported(source);
    expect(analysis.sections.map((section) => section.label)).toEqual([
      "Hi, I am Alex",
      "Technologies",
      "Contact",
    ]);
    expect(analysis.sections.map((section) => section.source).join("")).toBe(source);
    expect(result.document.customSections).toHaveLength(3);
    expect(Object.values(result.document.visibility).every((visible) => !visible)).toBe(true);
    expect(result.document.data.metrics.cards).toEqual([]);
    expect(
      result.document.sectionOrder.filter((section) => section.kind === "module"),
    ).toHaveLength(9);
    expect(parseProfileDocument(result.document).success).toBe(true);
    expect(result.readme.markdown).toContain("<h1>Hi, I am Alex</h1>");
    expect(result.document.data.technologies).toEqual(createEmptyProfile("en").data.technologies);
  });

  it("keeps retired heading names as personal custom content", () => {
    const { result } = imported(
      "## Knowledge\n\nI enjoy accessibility.\n\n## Education\n\nLearning every day.",
    );
    expect(result.document.customSections.map((section) => section.title)).toEqual([
      "Knowledge",
      "Education",
    ]);
    expect(result.document.visibility.knowledge).toBe(false);
    expect(result.document.visibility.education).toBe(false);
  });

  it("uses visual blocks for compatible text, lists, links, images, quotes and dividers", () => {
    const { result } = imported(
      "## About\n\nHello &amp; welcome.\n\n### What I like\n\n- Building tools\n- Sharing ideas\n\n1. Learn\n2. Make\n\n[My website](https://alex.dev)\n\n![Project preview](https://images.alex.dev/preview.png)\n\n> One idea\n>\n> Another thought\n\n---",
    );
    expect(result.document.customSections[0]?.blocks.map((block) => block.type)).toEqual([
      "paragraph",
      "heading",
      "list",
      "list",
      "link",
      "image",
      "quote",
      "divider",
    ]);
    expect(result.readme.customImages).toEqual([
      { src: "https://images.alex.dev/preview.png", alt: "Project preview" },
    ]);
    expect(result.readme.markdown).toContain("Hello &amp; welcome");
  });

  it("preserves escapes and entities as decoded plain content, not extra markup", () => {
    const { result } = imported(String.raw`Literal \*stars\* and &lt;script&gt; text.`);
    const block = result.document.customSections[0]?.blocks[0];
    expect(block).toMatchObject({ type: "paragraph", text: "Literal *stars* and <script> text." });
    expect(result.readme.markdown).not.toContain("<script>");
  });

  it("preserves original Unicode and CRLF source ranges", () => {
    const source = "😀 intro\r\n\r\n## Tools\r\n\r\nOne\r\n\r\n## Tools\r\n\r\nTwo\r\n";
    const { analysis } = imported(source);
    expect(analysis.source).toBe(source);
    expect(analysis.sections.map((section) => section.source).join("")).toBe(source);
    for (const section of analysis.sections)
      expect(source.slice(section.start, section.end)).toBe(section.source);
    expect(new Set(analysis.sections.map((section) => section.id)).size).toBe(3);
  });

  it("provides localized fallback labels without translating personal text", () => {
    const analysis = analyzeReadmeImport("My personal words.\n\n## Mi título\n\nHello.", "es");
    expect(analysis.sections.map((section) => section.label)).toEqual(["Contenido 1", "Mi título"]);
    expect(buildAll(analysis)).toMatchObject({ success: true, document: { contentLocale: "es" } });
  });

  it("returns deterministic opaque identities and independent document objects", () => {
    const source = "## About\n\n- One\n- Two";
    const first = analyzeReadmeImport(source, "en");
    expect(first).toEqual(analyzeReadmeImport(source, "en"));
    const one = buildAll(first);
    const two = buildAll(first);
    expect(one.success && two.success).toBe(true);
    if (!one.success || !two.success) return;
    one.document.customSections[0]!.title = "Edited";
    const list = one.document.customSections[0]!.blocks[0]!;
    if (list.type === "list") list.items[0]!.text = "Changed";
    expect(two.document.customSections[0]!.title).toBe("About");
    expect(first.sections[0]!.title).toBe("About");
    expect(first.sections[0]!.blocks[0]).toMatchObject({
      type: "list",
      items: [{ text: "One" }, { text: "Two" }],
    });
  });
});

describe("README import formatting and global context", () => {
  it.each([1, 2, 3, 4, 5, 6])("preserves a heading-only H%i as HTML", (depth) => {
    const { result } = imported(`${"#".repeat(depth)} Heading without body`);
    expect(result.document.customSections[0]?.title).toBe("");
    expect(result.document.customSections[0]?.blocks[0]?.type).toBe("html");
    expect(result.readme.markdown).toContain(`<h${depth}>Heading without body</h${depth}>`);
  });

  it("preserves heading levels and inline emphasis instead of flattening them", () => {
    const { analysis, result } = imported(
      "# A **bold** title\n\nSome *emphasis* and `inline code`.\n\n#### Small heading\n\n~~Old~~ new",
    );
    expect(result.readme.markdown).toContain("<h1>A <strong>bold</strong> title</h1>");
    expect(result.readme.markdown).toContain("<h4>Small heading</h4>");
    expect(result.readme.markdown).toContain("<em>emphasis</em>");
    expect(result.readme.markdown).toContain("<code>inline code</code>");
    expect(result.readme.markdown).toContain("<del>Old</del>");
    expect(analysis.sections[0]?.notices).toContainEqual(
      expect.objectContaining({ code: "converted_to_html" }),
    );
  });

  it("converts complex structures through HTML while preserving fenced code and its language", () => {
    const { analysis, result } = imported(
      "## Examples\n\n| Name | Value |\n| :--- | ---: |\n| Tool | 1 |\n\n```ts extra\nconst text = '<script>unsafe()</script>';\n- not a list\n```\n\nLine one  \nLine two\n\n- Parent\n  - Nested\n\n7. Seven\n8. Eight",
    );
    expect(result.readme.markdown).toContain("<table>");
    expect(result.readme.markdown).toContain(
      "```typescript\nconst text = '<script>unsafe()</script>';",
    );
    expect(result.document.customSections[0]?.blocks).toContainEqual(
      expect.objectContaining({ type: "code", language: "typescript" }),
    );
    expect(result.readme.customHtml?.every((fragment) => !fragment.html.includes("<script>"))).toBe(
      true,
    );
    expect(result.readme.markdown).toContain("<br>");
    expect(result.readme.markdown).toContain('<ol start="7">');
    expect(result.readme.markdown).toContain("Nested");
    expect(analysis.sections[0]?.notices).toContainEqual(
      expect.objectContaining({ code: "code_metadata_removed" }),
    );
  });

  it("resolves references from the entire AST, including definitions after other sections", () => {
    const { analysis, result } = imported(
      "## One\n\n[Shared][site]\n\n## Two\n\n![Preview][picture]\n\n[site]: https://alex.dev 'Website title'\n[picture]: https://images.alex.dev/preview.svg",
    );
    expect(result.readme.markdown).toContain('href="https://alex.dev/"');
    expect(result.readme.markdown).toContain('title="Website title"');
    expect(result.readme.markdown).toContain("https://images.alex.dev/preview.svg");
    expect(analysis.sections.every((section) => section.errors.length === 0)).toBe(true);
    expect(analysis.sections[0]?.notices).toContainEqual(
      expect.objectContaining({ code: "references_resolved" }),
    );
  });

  it("honors the first global reference definition even when a later section has another", () => {
    const { result } = imported(
      "[site]: https://first.dev\n\n## First\n\n[Go][site]\n\n## Second\n\n[site]: https://second.dev\n\n[Go][site]",
    );
    expect(result.readme.markdown.match(/https:\/\/first.dev/g)).toHaveLength(2);
    expect(result.readme.markdown).not.toContain("second.dev");
  });

  it("keeps exact compatible HTML source and communicates filtered attributes", () => {
    const source =
      '<h1 align="center" class="hello"> Hello </h1>\n\n<p style="color:red">Personal words</p>';
    const { analysis, result } = imported(source);
    expect(result.document.customSections[0]?.blocks[0]).toMatchObject({ type: "html", source });
    expect(analysis.sections[0]?.notices).toContainEqual(
      expect.objectContaining({ code: "retained_html" }),
    );
    expect(analysis.sections[0]?.notices).toContainEqual(
      expect.objectContaining({ code: "html_unsupported_attributes" }),
    );
    expect(result.readme.markdown).not.toContain('class="hello"');
    expect(result.readme.markdown).toContain('align="center"');
  });

  it("keeps HTML containers together across blank lines and Markdown headings", () => {
    const source =
      '<div align="center">\n\n## Inside\n\n**Bold** text.\n\n</div>\n\n## Outside\n\nMore words.';
    const { analysis, result } = imported(source);
    expect(analysis.sections).toHaveLength(1);
    expect(analysis.sections[0]?.source).toBe(source);
    expect(analysis.sections[0]?.notices).toContainEqual(
      expect.objectContaining({ code: "grouped_html_context" }),
    );
    expect(result.readme.markdown).toContain('<div align="center">');
    expect(result.readme.markdown).toContain("<h2>Inside</h2>");
    expect(result.readme.markdown).toContain("<strong>Bold</strong>");
    expect(result.readme.markdown).toContain("<h2>Outside</h2>");
  });

  it("preserves literal Markdown inside an uninterrupted raw HTML block", () => {
    const source = "<div>\n**literal**\n</div>";
    const { result } = imported(source);
    expect(result.document.customSections[0]?.blocks[0]).toMatchObject({ type: "html", source });
    expect(result.readme.markdown).toContain("**literal**");
    expect(result.readme.markdown).not.toContain("<strong>");
  });

  it("converts inline HTML and Markdown in the same paragraph together", () => {
    const { result } = imported("Hello <kbd>Enter</kbd> and **welcome**.");
    expect(result.readme.markdown).toContain(
      "<p>Hello <kbd>Enter</kbd> and <strong>welcome</strong>.</p>",
    );
  });

  it("imports generated profile content without enabling activity or recovering hidden data", () => {
    const document = createEmptyProfile("en");
    document.customSections = [
      {
        id: "personal",
        title: "About",
        visible: true,
        blocks: [
          { id: "paragraph", type: "paragraph", text: "I enjoy building." },
          {
            id: "html",
            type: "html",
            source: "<details><summary>More</summary><p>Extra ideas</p></details>",
          },
        ],
      },
    ];
    document.sectionOrder.push({ kind: "custom", sectionId: "personal" });
    const generated = generateReadme(document);
    expect(generated.success).toBe(true);
    if (!generated.success) return;
    const { result } = imported(generated.markdown);
    expect(result.readme.markdown).toContain("I enjoy building");
    expect(result.readme.markdown).toContain("<details>");
    expect(result.document.data.metrics.cards).toEqual([]);
  });

  it("supports a profile HTML fixture without assigning icon-only technologies", () => {
    const source =
      '<h1 align="center">Hi 👋, I am Alex</h1>\n<h3 align="center">A developer who likes tools</h3>\n\n- 🔭 Working on **an idea**\n- 🌱 Learning **Rust**\n\n<h3>Connect with me:</h3>\n<p><a href="https://linkedin.com/in/sample"><img src="https://cdn.simpleicons.org/linkedin" alt="LinkedIn" width="30" height="30"></a></p>\n\n<h3>Languages and Tools:</h3>\n<p><img src="https://cdn.simpleicons.org/react" alt="React" width="40" height="40"></p>';
    const { result } = imported(source);
    expect(result.readme.markdown).toContain("<strong>an idea</strong>");
    expect(result.readme.markdown).toContain("linkedin.com/in/sample");
    expect(result.document.visibility.technologies).toBe(false);
  });
});

describe("README import decisions, safety and limits", () => {
  it.each([
    ["[Local](./README.md)", "relative_url"],
    ["[Anchor](#about)", "anchor_link"],
    ["[Unsafe](javascript:alert%281%29)", "invalid_url"],
    ["[Mail](mailto:alex@example.com)", "invalid_url"],
    ["![No alt](http://images.alex.dev/a.png)", "invalid_url"],
    ["![Local](./a.png)", "relative_url"],
    ["![](https://images.alex.dev/a.png)", "missing_image_alt"],
    ['<img src="https://images.alex.dev/a.png">', "missing_image_alt"],
    ["- [x] Task status", "unsupported_format"],
  ])("blocks incompatible segment %s without discarding its original", (source, code) => {
    const analysis = analyzeReadmeImport(source, "en");
    expect(analysis.source).toBe(source);
    expect(analysis.sections[0]?.source).toBe(source);
    expect(analysis.sections[0]?.errors).toContainEqual(expect.objectContaining({ code }));
    expect(buildAll(analysis).success).toBe(false);
  });

  it("allows an explicitly decorative image only in existing HTML", () => {
    const { result } = imported('<img src="https://images.alex.dev/a.png" alt="">');
    expect(result.readme.markdown).toContain('alt=""');
    expect(result.readme.customImages).toBeUndefined();
  });

  it("requires explicit exclusion of a blocked section and preserves the remaining source order", () => {
    const analysis = analyzeReadmeImport(
      "## First\n\nFine.\n\n## Broken\n\n[Local](./file)\n\n## Last\n\nGood.",
      "en",
    );
    expect(buildAll(analysis).success).toBe(false);
    const result = buildImportedProfile(analysis, [
      analysis.sections[2]!.id,
      analysis.sections[0]!.id,
    ]);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.document.customSections.map((section) => section.title)).toEqual([
      "First",
      "Last",
    ]);
    expect(result.excludedSectionIds).toEqual([analysis.sections[1]!.id]);
    expect(analysis.source).toContain("[Local](./file)");
  });

  it("rejects empty, unknown or duplicate selections", () => {
    const analysis = analyzeReadmeImport("Some words.", "en");
    expect(buildImportedProfile(analysis, [])).toMatchObject({
      success: false,
      errors: [{ code: "no_sections_selected" }],
    });
    expect(buildImportedProfile(analysis, ["missing"])).toMatchObject({
      success: false,
      errors: [{ code: "invalid_selection" }],
    });
    expect(
      buildImportedProfile(analysis, [analysis.sections[0]!.id, analysis.sections[0]!.id]),
    ).toMatchObject({ success: false, errors: [{ code: "invalid_selection" }] });
  });

  it("filters scripts and events before offering any exportable output", () => {
    const { analysis, result } = imported(
      '<p onclick="alert(1)">Useful text<script>alert(1)</script></p>',
    );
    expect(analysis.sections[0]?.notices).toContainEqual(
      expect.objectContaining({ code: "html_unsupported_elements" }),
    );
    expect(analysis.sections[0]?.notices).toContainEqual(
      expect.objectContaining({ code: "html_unsupported_attributes" }),
    );
    expect(result.readme.markdown).not.toContain("onclick");
    expect(result.readme.markdown).not.toContain("alert(1)");
    expect(analysis.source).toContain("alert(1)");
  });

  it("blocks all-active/empty HTML and exposes filtering notices on useful HTML", () => {
    expect(buildAll(analyzeReadmeImport("<script>alert(1)</script>", "en")).success).toBe(false);
    const { analysis } = imported("<!-- private comment -->\n\nPersonal words.");
    expect(analysis.sections[0]?.notices).toContainEqual(
      expect.objectContaining({ code: "html_comments_removed" }),
    );
  });

  it("does not make an exception for external activity images or local application paths", () => {
    const external = imported("![Activity](https://stats.alex.dev/api?username=alex)");
    expect(external.result.document.data.metrics.cards).toEqual([]);
    expect(external.result.document.customSections[0]?.blocks[0]?.type).toBe("image");
    const local = analyzeReadmeImport("![Activity](/api/github/summary/alex)", "en");
    expect(buildAll(local).success).toBe(false);
  });

  it("does not silently reinterpret a relative reference definition", () => {
    const analysis = analyzeReadmeImport("[Go][site]\n\n[site]: ../readme.md", "en");
    expect(analysis.sections[0]?.errors).toContainEqual(
      expect.objectContaining({ code: "relative_url" }),
    );
    expect(buildAll(analysis).success).toBe(false);
  });

  it("keeps empty input and a global size limit non-excludable", () => {
    expect(analyzeReadmeImport(" \n\t", "en").errors).toEqual([{ code: "empty_source" }]);
    const source = "x".repeat(README_IMPORT_MAX_LENGTH + 1);
    const analysis = analyzeReadmeImport(source, "en");
    expect(analysis.errors).toEqual([{ code: "source_too_large" }]);
    expect(analysis.source).toBe(source);
    expect(buildImportedProfile(analysis, [])).toMatchObject({
      success: false,
      errors: [{ code: "source_too_large" }],
    });
  });

  it("checks Markdown node count and depth before converting the AST", () => {
    expect(analyzeReadmeImport("> ".repeat(40) + "Nested", "en").errors).toEqual([
      { code: "too_complex" },
    ]);
    expect(analyzeReadmeImport("- one\n".repeat(2100), "en").errors).toEqual([
      { code: "too_complex" },
    ]);
  });

  it("reuses per-block HTML limits without truncating the retained original", () => {
    const source = `<p>${"x".repeat(30_001)}</p>`;
    const analysis = analyzeReadmeImport(source, "en");
    expect(analysis.sections[0]?.errors).toContainEqual(
      expect.objectContaining({ code: "invalid_html", detail: "too_large" }),
    );
    expect(analysis.source).toBe(source);
    expect(buildAll(analysis).success).toBe(false);
  });

  it("still applies profile and generator validation to a changed proposal", () => {
    const analysis = analyzeReadmeImport("Safe words.", "en");
    const altered: ReadmeImportAnalysis = {
      ...analysis,
      sections: analysis.sections.map((section) => ({
        ...section,
        blocks: [{ id: "html", type: "html", source: '<a href="javascript:alert(1)">Unsafe</a>' }],
      })),
    };
    expect(buildAll(altered)).toMatchObject({
      success: false,
      errors: [{ code: "generation_failed" }],
    });
    const invalid: ReadmeImportAnalysis = {
      ...analysis,
      sections: analysis.sections.map((section) => ({ ...section, id: " " })),
    };
    expect(buildAll(invalid)).toMatchObject({
      success: false,
      errors: [{ code: "invalid_document" }],
    });
  });
});
