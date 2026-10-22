import { describe, expect, it } from "vitest";
import { toHtml } from "hast-util-to-html";
import type { Root } from "hast";
import type { CustomBlock, CustomSection } from "../profile/custom-content";
import { createEmptyProfile } from "../profile/profile-operations";
import type { ContentLocale, ProfileDocument } from "../profile/profile-schema";
import { parseProfileDocument } from "../profile/profile-validation";
import { generateReadme } from "./generate-readme";
import { renderCustomSection, renderCustomSectionWithListIndex } from "./render-custom";
import type { CustomImageSource, ReadmeIssue, ReadmeResult } from "./readme-result";
import { PROFILE_HTML_MAX_DOCUMENT_LENGTH, PROFILE_HTML_MAX_LENGTH } from "./profile-html";

function section(blocks: CustomBlock[], overrides: Partial<CustomSection> = {}): CustomSection {
  return { id: "custom", title: "My section", visible: true, blocks, ...overrides };
}

function profileFor(custom: CustomSection[], locale: ContentLocale = "en"): ProfileDocument {
  const profile = createEmptyProfile(locale);
  profile.customSections = custom;
  profile.sectionOrder.push(
    ...custom.map((entry) => ({ kind: "custom" as const, sectionId: entry.id })),
  );
  return profile;
}

function markdown(result: ReadmeResult): string {
  if (!result.success) throw new Error(`Expected Markdown: ${JSON.stringify(result.errors)}`);
  return result.markdown;
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function canonicalHtml(tree: Root) {
  return toHtml(tree).replace(/\r/g, "&#13;").replace(/\n/g, "&#10;");
}

describe("explicit sanitized HTML and exact exported ranges", () => {
  it.each([
    ["", 3],
    ["Section title", 4],
  ] as const)(
    "wraps an HTML block and supplies relative ranges with title %j",
    (title, headingLevel) => {
      const custom = section(
        [{ id: "html", type: "html", source: "<h1>Hello</h1><p>My words</p>" }],
        { title },
      );
      const errors: ReadmeIssue[] = [];
      const rendered = renderCustomSectionWithListIndex(freezeDeep(custom), 2, errors, 5);
      expect(errors).toEqual([]);
      expect(rendered.nextListIndex).toBe(5);
      expect(rendered.htmlFragments).toHaveLength(1);
      const fragment = rendered.htmlFragments![0]!;
      expect(fragment.headingLevel).toBe(headingLevel);
      expect(fragment.html).toBe("<div><h1>Hello</h1><p>My words</p></div>");
      expect(canonicalHtml(fragment.tree)).toBe(fragment.html);
      expect(rendered.markdown.slice(fragment.start, fragment.end)).toBe(fragment.html);
      expect(fragment.start).toBe(title ? "## Section title\n\n".length : 0);
      expect(renderCustomSection(custom, 2, [])).toBe(rendered.markdown);
    },
  );

  it("keeps absolute UTF16 ranges exact across repeated HTML, Unicode, module output and escaped titles", () => {
    const repeated = "<details><summary>More 🌱</summary>\n\n<p>Repeated content</p></details>";
    const profile = profileFor([
      section(
        [
          { id: "before", type: "paragraph", text: "Before 🌈 and **plain**" },
          { id: "html-one", type: "html", source: repeated },
          { id: "empty", type: "html", source: " \n " },
          {
            id: "middle",
            type: "list",
            style: "ordered",
            items: [{ id: "item", text: "Between" }],
          },
          { id: "html-two", type: "html", source: repeated },
        ],
        { id: "one", title: "A 🌱 [title]" },
      ),
      section([{ id: "last", type: "html", source: "<p>Last block 🌸</p>" }], {
        id: "two",
        title: "",
      }),
    ]);
    profile.visibility.presentation = true;
    profile.data.presentation.displayName = "Alex 🌟";
    profile.sectionOrder = [
      { kind: "custom", sectionId: "two" },
      { kind: "module", moduleId: "presentation" },
      { kind: "custom", sectionId: "one" },
      ...profile.sectionOrder.filter(
        (entry) => entry.kind === "module" && entry.moduleId !== "presentation",
      ),
    ];
    const original = structuredClone(profile);
    const result = generateReadme(freezeDeep(profile));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.customHtml).toHaveLength(4);
    expect(result.customHtml!.map((entry) => entry.headingLevel)).toEqual([3, 3, 4, 4]);
    expect(result.customHtml![0]!.start).toBe(0);
    let previousEnd = -1;
    for (const fragment of result.customHtml!) {
      expect(fragment.start).toBeGreaterThan(previousEnd);
      expect(result.markdown.slice(fragment.start, fragment.end)).toBe(fragment.html);
      expect(canonicalHtml(fragment.tree)).toBe(fragment.html);
      previousEnd = fragment.end;
    }
    expect(result.customHtml![2]!.html).toBe(result.customHtml![3]!.html);
    expect(result.customHtml![2]!.start).not.toBe(result.customHtml![3]!.start);
    expect(result.markdown).toContain(
      '<div><h1 align="center">Alex 🌟</h1></div>\n\n## A 🌱 \\[title\\]\n\n',
    );
    expect(generateReadme(profile)).toEqual(result);
    expect(profile).toEqual(original);
  });

  it("reports original source paths when custom storage and output orders differ", () => {
    const profile = profileFor([
      section([{ id: "a", type: "html", source: '<a href="#fragment">Saved</a>' }], { id: "one" }),
      section(
        [
          { id: "p", type: "paragraph", text: "Valid content" },
          { id: "b", type: "html", source: '<img src="https://images.example.com/x">' },
        ],
        { id: "two" },
      ),
    ]);
    profile.sectionOrder.reverse();
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [
        { code: "invalid_html", path: ["customSections", 1, "blocks", 1, "source"] },
        { code: "invalid_html", path: ["customSections", 0, "blocks", 0, "source"] },
      ],
    });
  });

  it.each([
    "<script>Only removed content</script>",
    "<details><p>Missing summary</p></details>",
    "<p></p>",
  ])("rejects visible nonexportable HTML without partial output or metadata: %s", (source) => {
    const profile = profileFor([
      section([
        { id: "valid", type: "html", source: "<p>Valid HTML</p>" },
        { id: "image", type: "image", url: "https://images.example.com/x", alt: "Valid image" },
        { id: "invalid", type: "html", source },
      ]),
    ]);
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [{ code: "invalid_html", path: ["customSections", 0, "blocks", 2, "source"] }],
    });
  });

  it("omits blank HTML and never adds empty metadata properties to existing output", () => {
    const profile = profileFor([
      section(
        [
          { id: "blank", type: "html", source: " \n\t " },
          { id: "plain", type: "paragraph", text: "Useful words" },
        ],
        { title: "" },
      ),
    ]);
    expect(generateReadme(profile)).toEqual({ success: true, markdown: "Useful words\n" });
  });

  it("omits hidden malformed and oversized HTML without changing the source or ranges", () => {
    const hidden = section(
      [
        { id: "unsafe", type: "html", source: '<img src="javascript:alert(1)">' },
        { id: "oversized", type: "html", source: "x".repeat(PROFILE_HTML_MAX_DOCUMENT_LENGTH + 1) },
      ],
      { visible: false, id: "hidden" },
    );
    const profile = profileFor([
      hidden,
      section([{ id: "plain", type: "paragraph", text: "Visible" }], { id: "shown", title: "" }),
    ]);
    const original = structuredClone(profile);
    expect(generateReadme(freezeDeep(profile))).toEqual({ success: true, markdown: "Visible\n" });
    expect(profile).toEqual(original);
  });

  it("keeps sanitized HTML images in the HTML tree without changing customImages", () => {
    const profile = profileFor([
      section(
        [
          {
            id: "html",
            type: "html",
            source:
              '<p align="center"><img src="https://images.example.com/icon" alt="" width="40" height="40"></p>',
          },
        ],
        { title: "" },
      ),
    ]);
    const result = generateReadme(profile);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.customImages).toBeUndefined();
    expect(result.customHtml).toHaveLength(1);
    expect(result.markdown).toContain('width="40"');
    expect(result.markdown).toContain('alt=""');
    expect(canonicalHtml(result.customHtml![0]!.tree)).toBe(result.customHtml![0]!.html);
  });

  it("retains original HTML and publishes only its sanitized canonical form", () => {
    const source =
      '<p class="hero" onclick="alert(1)">Keep &copy;</p><script>never publish</script>';
    const profile = profileFor([section([{ id: "html", type: "html", source }], { title: "" })]);
    const result = generateReadme(freezeDeep(profile));
    expect(markdown(result)).toBe("<div><p>Keep ©</p></div>\n");
    expect(profile.customSections[0]!.blocks[0]).toEqual({ id: "html", type: "html", source });
  });

  it("does not reparse expanded canonical output under source-size limits", () => {
    const source = `<p>${"&".repeat(10_000)}</p>`;
    const result = generateReadme(
      profileFor([section([{ id: "html", type: "html", source }], { title: "" })]),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    const fragment = result.customHtml![0]!;
    expect(fragment.html.length).toBeGreaterThan(PROFILE_HTML_MAX_LENGTH);
    expect(canonicalHtml(fragment.tree)).toBe(fragment.html);
    expect(result.markdown.slice(fragment.start, fragment.end)).toBe(fragment.html);
  });

  it("encodes semantic line breaks so HTML text cannot open another Markdown block", () => {
    const source =
      "<div>\n\n![No image request](http://localhost/private)\n\n[No executable link](javascript:alert(1))\n\n# Not a Markdown heading\n\n---\n\n1. Not a list\n\n</div><pre><code>first\n\nsecond</code></pre>";
    const result = generateReadme(
      profileFor([section([{ id: "html", type: "html", source }], { title: "" })]),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    const fragment = result.customHtml![0]!;
    expect(fragment.html).not.toContain("\n");
    expect(fragment.html).toContain("&#10;&#10;");
    expect(canonicalHtml(fragment.tree)).toBe(fragment.html);
    expect(fragment.html).toContain("![No image request](http://localhost/private)");
    expect(fragment.html).toContain("[No executable link](javascript:alert(1))");
    expect(fragment.html).toContain("<pre><code>first&#10;&#10;second</code></pre>");
  });

  it("checks the aggregate visible HTML source budget before rendering any fragment", () => {
    const profile = profileFor([
      section(
        Array.from({ length: 6 }, (_, index) => ({
          id: `html-${index}`,
          type: "html" as const,
          source: `<p>${"x".repeat(26_000)}</p>`,
        })),
        { title: "" },
      ),
    ]);
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [{ code: "invalid_html", path: ["customSections", 0, "blocks", 5, "source"] }],
    });
  });

  it("accepts the exact aggregate source limit with independent trees and offsets", () => {
    const source = `<p>${"x".repeat(PROFILE_HTML_MAX_LENGTH - 7)}</p>`;
    const profile = profileFor([
      section(
        Array.from({ length: 5 }, (_, index) => ({
          id: `html-${index}`,
          type: "html" as const,
          source,
        })),
        { title: "" },
      ),
    ]);
    expect(source.length * 5).toBe(PROFILE_HTML_MAX_DOCUMENT_LENGTH);
    const result = generateReadme(profile);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.customHtml).toHaveLength(5);
    expect(result.customHtml![0]!.tree).not.toBe(result.customHtml![1]!.tree);
    for (const fragment of result.customHtml!)
      expect(result.markdown.slice(fragment.start, fragment.end)).toBe(fragment.html);
  });

  it("preserves list alternation and activity restrictions around HTML fragments", () => {
    const profile = profileFor([
      section(
        [
          { id: "before", type: "list", style: "unordered", items: [{ id: "a", text: "Before" }] },
          { id: "html", type: "html", source: "<hr>" },
          { id: "after", type: "list", style: "ordered", items: [{ id: "b", text: "After" }] },
        ],
        { title: "" },
      ),
    ]);
    profile.visibility.metrics = true;
    profile.data.metrics = { username: "alex", cards: ["summary"] };
    const result = generateReadme(profile);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.markdown).toContain("+ Before\n\n<div><hr></div>\n\n1) After\n");
    expect(result.exportIssues).toEqual([
      { code: "activity_not_configured", path: ["data", "metrics"] },
    ]);
    expect(result.customHtml).toHaveLength(1);
  });
});

describe("plain custom blocks", () => {
  it("combines authored paragraphs, a list and a link without inventing labels", () => {
    const custom = section([
      {
        id: "paragraph",
        type: "paragraph",
        text: "A little about my hobbies\n\nI like sharing what I learn",
      },
      {
        id: "list",
        type: "list",
        style: "unordered",
        items: [
          { id: "first", text: "Reading" },
          { id: "second", text: "Building small tools" },
        ],
      },
      { id: "link", type: "link", label: "My writing", url: "https://example.com/writing" },
    ]);
    const errors: ReadmeIssue[] = [];
    expect(renderCustomSection(custom, 0, errors)).toBe(
      "## My section\n\nA little about my hobbies\n\nI like sharing what I learn\n\n+ Reading\n+ Building small tools\n\n[My writing](<https://example.com/writing>)",
    );
    expect(errors).toEqual([]);
  });

  it.each(["", " \t\n "])("allows the title to be omitted: %j", (title) => {
    const custom = section([{ id: "paragraph", type: "paragraph", text: "A personal note" }], {
      title,
    });
    expect(markdown(generateReadme(profileFor([custom])))).toBe("A personal note\n");
  });

  it.each<{ blocks: CustomBlock[] }>([
    { blocks: [] },
    { blocks: [{ id: "paragraph", type: "paragraph", text: " \n\t " }] },
    { blocks: [{ id: "heading", type: "heading", text: " \n\t " }] },
    { blocks: [{ id: "quote", type: "quote", text: " \n\t " }] },
    { blocks: [{ id: "image", type: "image", url: " \n\t ", alt: " \n\t " }] },
    { blocks: [{ id: "list", type: "list", style: "ordered", items: [] }] },
    {
      blocks: [
        { id: "list", type: "list", style: "unordered", items: [{ id: "empty", text: " \n " }] },
      ],
    },
    { blocks: [{ id: "link", type: "link", label: " \n ", url: "\t" }] },
  ])("omits a title when its blocks contain no useful content: %j", ({ blocks }) => {
    const custom = section(blocks, { title: "A title alone is not content" });
    expect(generateReadme(profileFor([custom]))).toEqual({
      success: false,
      errors: [{ code: "empty_profile", path: [] }],
    });
  });

  it.each(["en", "es"] as const)(
    "does not translate authored titles or block text in %s",
    (locale) => {
      const custom = section([{ id: "own", type: "paragraph", text: "My own words" }], {
        title: "Mi título personal",
      });
      expect(markdown(generateReadme(profileFor([custom], locale)))).toBe(
        "## Mi título personal\n\nMy own words\n",
      );
    },
  );

  it("keeps literal Markdown, HTML and arbitrary image syntax inert in all authored fields", () => {
    const plain = '<img src="https://evil.example/x.svg" onerror="alert(1)">';
    const custom = section(
      [
        {
          id: "paragraph",
          type: "paragraph",
          text: "# Heading\n> Quote\n![image](https://evil.example/x.svg)\n<script>alert(1)</script>",
        },
        { id: "list", type: "list", style: "unordered", items: [{ id: "item", text: plain }] },
        {
          id: "link",
          type: "link",
          label: "![image](https://evil.example/image.svg)",
          url: "https://example.com",
        },
      ],
      { title: plain },
    );
    const output = markdown(generateReadme(profileFor([custom])));
    expect(output).not.toContain("<img");
    expect(output).not.toContain("<script>");
    expect(output).not.toContain("![image]");
    expect(output).toContain("\\# Heading\n&gt; Quote");
    expect(output).toContain("\\!\\[image\\]\\(https&#58;//evil\\.example/x\\.svg\\)");
    expect(output).toContain("&lt;script&gt;alert\\(1\\)&lt;/script&gt;");
    expect(output).toContain(
      '+ &lt;img src\\="https&#58;//evil\\.example/x\\.svg" onerror\\="alert\\(1\\)"&gt;',
    );
  });

  it("normalizes line separators and controls without mutating the original text", () => {
    const text = "First\r\n\r\n  Second\u2028line\u0000\u202e";
    const custom = section([{ id: "text", type: "paragraph", text }]);
    expect(markdown(generateReadme(profileFor([custom])))).toBe(
      "## My section\n\nFirst\n\nSecond\nline\ufffd\ufffd\n",
    );
    expect(custom.blocks).toEqual([{ id: "text", type: "paragraph", text }]);
  });
});

describe("custom visual text blocks", () => {
  it.each([
    ["My section", "## My section\n\n### My heading\n"],
    ["", "## My heading\n"],
    [" \n\t ", "## My heading\n"],
  ])("uses a heading level below the optional section title %j", (title, expected) => {
    const custom = section([{ id: "heading", type: "heading", text: "My heading" }], { title });
    expect(markdown(generateReadme(profileFor([custom])))).toBe(expected);
  });

  it("keeps heading text plain and on one line", () => {
    const custom = section(
      [{ id: "heading", type: "heading", text: "# Title\n<script>alert(1)</script>" }],
      { title: "" },
    );
    expect(markdown(generateReadme(profileFor([custom])))).toBe(
      "## \\# Title &lt;script&gt;alert\\(1\\)&lt;/script&gt;\n",
    );
  });

  it("renders an explicit divider without requiring authored text", () => {
    const custom = section([{ id: "divider", type: "divider" }], { title: "" });
    expect(generateReadme(profileFor([custom]))).toEqual({ success: true, markdown: "---\n" });
  });

  it("keeps every line and paragraph inside a quote while escaping authored syntax", () => {
    const custom = section(
      [
        {
          id: "quote",
          type: "quote",
          text: "First line\r\n  Second line\n\n# Heading\n![x](https://evil.example/x)\n<script>",
        },
      ],
      { title: "" },
    );
    expect(markdown(generateReadme(profileFor([custom])))).toBe(
      "> First line\n> Second line\n>\n> \\# Heading\n> \\!\\[x\\]\\(https&#58;//evil\\.example/x\\)\n> &lt;script&gt;\n",
    );
  });

  it("preserves the authored order of all seven custom block types", () => {
    const custom = section(
      [
        { id: "heading", type: "heading", text: "A few things" },
        { id: "paragraph", type: "paragraph", text: "My own introduction" },
        { id: "divider", type: "divider" },
        { id: "quote", type: "quote", text: "Keep learning" },
        {
          id: "list",
          type: "list",
          style: "unordered",
          items: [{ id: "item", text: "Build something small" }],
        },
        {
          id: "image",
          type: "image",
          url: "https://images.example.com/project.gif",
          alt: "A small project demo",
        },
        { id: "link", type: "link", label: "Try it", url: "https://example.com/demo" },
      ],
      { title: "" },
    );
    const profile = profileFor([custom]);
    const original = structuredClone(profile);
    const result = generateReadme(freezeDeep(profile));
    expect(result).toEqual({
      success: true,
      markdown:
        "## A few things\n\nMy own introduction\n\n---\n\n> Keep learning\n\n+ Build something small\n\n![A small project demo](<https://images.example.com/project.gif>)\n\n[Try it](<https://example.com/demo>)\n",
      customImages: [
        { src: "https://images.example.com/project.gif", alt: "A small project demo" },
      ],
    });
    expect(generateReadme(profile)).toEqual(result);
    expect(profile).toEqual(original);
  });

  it("keeps list marker alternation after visual blocks and omitted empty blocks", () => {
    const custom = section(
      [
        {
          id: "first",
          type: "list",
          style: "unordered",
          items: [{ id: "first-item", text: "First" }],
        },
        { id: "heading", type: "heading", text: "" },
        { id: "quote", type: "quote", text: "" },
        { id: "image", type: "image", url: "", alt: "" },
        { id: "divider", type: "divider" },
        {
          id: "second",
          type: "list",
          style: "ordered",
          items: [{ id: "second-item", text: "Second" }],
        },
      ],
      { title: "" },
    );
    expect(renderCustomSectionWithListIndex(custom, 0, [], 4)).toEqual({
      markdown: "+ First\n\n---\n\n1) Second",
      nextListIndex: 6,
    });
  });
});

describe("custom public image export and metadata", () => {
  it.each([
    ["HTTPS://IMAGES.EXAMPLE.COM/banner.gif", "https://images.example.com/banner.gif"],
    ["https://images.example.com/no-extension", "https://images.example.com/no-extension"],
    [
      "https://images.example.com/a(b).gif?first=1&copy;=2",
      "https://images.example.com/a(b).gif?first=1&copy;=2",
    ],
  ])("exports a public HTTPS image without fetching it: %s", (url, src) => {
    const custom = section([{ id: "image", type: "image", url, alt: "My image" }], { title: "" });
    const result = generateReadme(profileFor([custom]));
    expect(result).toEqual({
      success: true,
      markdown: `![My image](<${src.replace(/&/g, "&amp;")}>)\n`,
      customImages: [{ src, alt: "My image" }],
    });
  });

  it("matches metadata to normalized plain alternative text and escapes its Markdown separately", () => {
    const custom = section(
      [
        {
          id: "image",
          type: "image",
          url: "https://images.example.com/banner.svg?x=1&y=2",
          alt: '  A [link]\r\n&copy; <script> "quote" \u000b \u202e á  ',
        },
      ],
      { title: "" },
    );
    expect(generateReadme(profileFor([custom]))).toEqual({
      success: true,
      markdown:
        '![A \\[link\\] &amp;copy; &lt;script&gt; "quote" \ufffd \ufffd á](<https://images.example.com/banner.svg?x=1&amp;y=2>)\n',
      customImages: [
        {
          src: "https://images.example.com/banner.svg?x=1&y=2",
          alt: 'A [link] &copy; <script> "quote" \ufffd \ufffd á',
        },
      ],
    });
  });

  it.each(["", " \t\r\n "])("requires alternative text when an image has a URL: %j", (alt) => {
    const custom = section(
      [{ id: "image", type: "image", url: "https://images.example.com/banner.gif", alt }],
      { title: "" },
    );
    expect(generateReadme(profileFor([custom]))).toEqual({
      success: false,
      errors: [{ code: "missing_image_alt", path: ["customSections", 0, "blocks", 0, "alt"] }],
    });
  });

  it.each([
    "",
    "http://images.example.com/banner.png",
    "file:///C:/images/banner.png",
    "blob:https://example.com/image",
    "data:image/png;base64,aGVsbG8=",
    "javascript:alert(1)",
    "//images.example.com/banner.png",
    "assets/banner.png",
    "https://localhost/banner.png",
    "https://127.0.0.1/banner.png",
    "https://10.0.0.1/banner.png",
    "https://[::1]/banner.png",
    "https://user:password@images.example.com/banner.png",
    "https://images.example.com:8443/banner.png",
    "https://images.example.com/banner.png#fragment",
    "https://images.example.com/has space.png",
  ])("rejects a nonexportable image URL with its original field path: %j", (url) => {
    const custom = section([
      { id: "before", type: "paragraph", text: "Useful content" },
      { id: "image", type: "image", url, alt: "A saved image" },
    ]);
    expect(generateReadme(profileFor([custom]))).toEqual({
      success: false,
      errors: [{ code: "invalid_url", path: ["customSections", 0, "blocks", 1, "url"] }],
    });
  });

  it("reports both invalid image fields without returning partial Markdown or metadata", () => {
    const custom = section([
      {
        id: "valid",
        type: "image",
        url: "https://images.example.com/valid.gif",
        alt: "A valid image",
      },
      { id: "invalid", type: "image", url: "javascript:alert(1)", alt: "" },
    ]);
    expect(generateReadme(profileFor([custom]))).toEqual({
      success: false,
      errors: [
        { code: "invalid_url", path: ["customSections", 0, "blocks", 1, "url"] },
        { code: "missing_image_alt", path: ["customSections", 0, "blocks", 1, "alt"] },
      ],
    });
  });

  it("omits blank images and does not add an empty metadata property", () => {
    const custom = section(
      [
        { id: "empty", type: "image", url: " \n ", alt: " \n " },
        { id: "paragraph", type: "paragraph", text: "Still useful" },
      ],
      { title: "" },
    );
    expect(generateReadme(profileFor([custom]))).toEqual({
      success: true,
      markdown: "Still useful\n",
    });
  });

  it("ignores all hidden visual blocks in direct rendering and in the document", () => {
    const hidden = section(
      [
        { id: "heading", type: "heading", text: "Hidden heading" },
        { id: "quote", type: "quote", text: "Hidden quote" },
        { id: "divider", type: "divider" },
        { id: "invalid", type: "image", url: "javascript:alert(1)", alt: "" },
        {
          id: "valid",
          type: "image",
          url: "https://images.example.com/hidden.gif",
          alt: "Hidden image",
        },
      ],
      { visible: false },
    );
    const errors: ReadmeIssue[] = [];
    const images: CustomImageSource[] = [];
    expect(renderCustomSectionWithListIndex(freezeDeep(hidden), 3, errors, 7, images)).toEqual({
      markdown: "",
      nextListIndex: 7,
    });
    expect(renderCustomSection(hidden, 3, errors)).toBe("");
    expect(errors).toEqual([]);
    expect(images).toEqual([]);
    const profile = profileFor([hidden]);
    profile.visibility.presentation = true;
    profile.data.presentation.bio = "Only visible content";
    expect(generateReadme(freezeDeep(profile))).toEqual({
      success: true,
      markdown: "Only visible content\n",
    });
  });

  it("collects repeated and duplicated image blocks in output order with independent source objects", () => {
    const image = {
      id: "opaque-image",
      type: "image" as const,
      url: "https://images.example.com/repeated.gif",
      alt: "Repeated image",
    };
    const profile = profileFor([
      section([image, { ...image, id: "duplicated-image" }], { id: "first", title: "" }),
      section(
        [
          {
            id: "second-image",
            type: "image",
            url: "https://images.example.com/second.png",
            alt: "Second image",
          },
        ],
        { id: "second", title: "" },
      ),
    ]);
    profile.sectionOrder.reverse();
    const result = generateReadme(freezeDeep(profile));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.customImages).toEqual([
      { src: "https://images.example.com/second.png", alt: "Second image" },
      { src: "https://images.example.com/repeated.gif", alt: "Repeated image" },
      { src: "https://images.example.com/repeated.gif", alt: "Repeated image" },
    ]);
    expect(result.customImages?.[1]).not.toBe(result.customImages?.[2]);
    expect(result.markdown).toBe(
      "![Second image](<https://images.example.com/second.png>)\n\n![Repeated image](<https://images.example.com/repeated.gif>)\n\n![Repeated image](<https://images.example.com/repeated.gif>)\n",
    );
  });

  it("retains original image error indices when custom display order changes", () => {
    const profile = profileFor([
      section([{ id: "first-image", type: "image", url: "", alt: "Missing URL" }], {
        id: "first",
      }),
      section(
        [{ id: "second-image", type: "image", url: "https://images.example.com/a.gif", alt: "" }],
        { id: "second" },
      ),
    ]);
    profile.sectionOrder.reverse();
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [
        { code: "missing_image_alt", path: ["customSections", 1, "blocks", 0, "alt"] },
        { code: "invalid_url", path: ["customSections", 0, "blocks", 0, "url"] },
      ],
    });
  });

  it("keeps activity card export restrictions alongside custom image metadata", () => {
    const profile = profileFor([
      section(
        [{ id: "image", type: "image", url: "https://images.example.com/a.gif", alt: "My image" }],
        { title: "" },
      ),
    ]);
    profile.visibility.metrics = true;
    profile.data.metrics = { username: "alex", cards: ["summary"] };
    const result = generateReadme(profile);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.customImages).toEqual([
      { src: "https://images.example.com/a.gif", alt: "My image" },
    ]);
    expect(result.exportIssues).toEqual([
      { code: "activity_not_configured", path: ["data", "metrics"] },
    ]);
  });
});

describe("custom list indentation and order", () => {
  it.each([
    ["ordered", "1. First list\n\n1) Second list\n\n1. Third list"],
    ["unordered", "+ First list\n\n* Second list\n\n+ Third list"],
  ] as const)(
    "keeps adjacent %s list blocks separate using distinct CommonMark markers",
    (style, expected) => {
      const custom = section(
        [
          { id: "first", type: "list", style, items: [{ id: "first-item", text: "First list" }] },
          {
            id: "second",
            type: "list",
            style,
            items: [{ id: "second-item", text: "Second list" }],
          },
          { id: "third", type: "list", style, items: [{ id: "third-item", text: "Third list" }] },
        ],
        { title: "" },
      );
      expect(markdown(generateReadme(profileFor([custom])))).toBe(`${expected}\n`);
    },
  );

  it("does not count blank lists or omitted blocks as separators between emitted lists", () => {
    const custom = section(
      [
        {
          id: "first",
          type: "list",
          style: "ordered",
          items: [{ id: "first-item", text: "First" }],
        },
        { id: "empty-paragraph", type: "paragraph", text: " \n " },
        {
          id: "empty-list",
          type: "list",
          style: "unordered",
          items: [{ id: "empty-item", text: " \n " }],
        },
        { id: "empty-link", type: "link", label: "", url: "" },
        {
          id: "second",
          type: "list",
          style: "ordered",
          items: [{ id: "second-item", text: "Second" }],
        },
      ],
      { title: "" },
    );
    expect(renderCustomSectionWithListIndex(custom, 0, [], 0)).toEqual({
      markdown: "1. First\n\n1) Second",
      nextListIndex: 2,
    });
    const empty = section([{ id: "none", type: "list", style: "unordered", items: [] }]);
    expect(renderCustomSectionWithListIndex(empty, 0, [], 5)).toEqual({
      markdown: "",
      nextListIndex: 5,
    });
  });

  it("counts lists after escaping controls, using an explicit offset without global state", () => {
    const custom = freezeDeep(
      section(
        [
          {
            id: "control",
            type: "list",
            style: "unordered",
            items: [{ id: "control-item", text: "\u000b" }],
          },
          {
            id: "ordered",
            type: "list",
            style: "ordered",
            items: [{ id: "ordered-item", text: "Next list" }],
          },
        ],
        { title: "" },
      ),
    );
    expect(renderCustomSectionWithListIndex(custom, 0, [], 4)).toEqual({
      markdown: "+ \ufffd\n\n1) Next list",
      nextListIndex: 6,
    });
    expect(renderCustomSectionWithListIndex(custom, 0, [], 5)).toEqual({
      markdown: "* \ufffd\n\n1. Next list",
      nextListIndex: 7,
    });
    expect(renderCustomSection(custom, 0, [])).toBe("+ \ufffd\n\n1) Next list");
    expect(renderCustomSection(custom, 0, [])).toBe("+ \ufffd\n\n1) Next list");
  });

  it.each([
    ["unordered", "+ first\n  next line\n  \n  Another paragraph\n+ second"],
    ["ordered", "1. first\n   next line\n   \n   Another paragraph\n2. second"],
  ] as const)("indents multiline %s list entries under the correct marker", (style, expected) => {
    const custom = section(
      [
        {
          id: "list",
          type: "list",
          style,
          items: [
            { id: "first", text: "first\nnext line\n\nAnother paragraph" },
            { id: "empty", text: " \n " },
            { id: "second", text: "second" },
          ],
        },
      ],
      { title: "" },
    );
    expect(markdown(generateReadme(profileFor([custom])))).toBe(`${expected}\n`);
  });

  it("uses four-space continuations once an ordered marker reaches two digits", () => {
    const custom = section(
      [
        {
          id: "list",
          type: "list",
          style: "ordered",
          items: Array.from({ length: 11 }, (_, index) => ({
            id: `item-${index}`,
            text:
              index === 9 ? "Tenth entry\nStill tenth\n\nSecond paragraph" : `Entry ${index + 1}`,
          })),
        },
      ],
      { title: "" },
    );
    const output = markdown(generateReadme(profileFor([custom])));
    expect(output).toContain(
      "9. Entry 9\n10. Tenth entry\n    Still tenth\n    \n    Second paragraph\n11. Entry 11\n",
    );
  });

  it("does not turn nested Markdown, ordered markers or indentation from list text into more structure", () => {
    const custom = section(
      [
        {
          id: "list",
          type: "list",
          style: "unordered",
          items: [
            {
              id: "item",
              text: "Start\n    - Nested\n    1. Pretend ordered\n    ```js\n    <script>",
            },
          ],
        },
      ],
      { title: "" },
    );
    expect(markdown(generateReadme(profileFor([custom])))).toBe(
      "+ Start\n  \\- Nested\n  1\\. Pretend ordered\n  \\`\\`\\`js\n  &lt;script&gt;\n",
    );
  });

  it("preserves repeated item text and the authored block order", () => {
    const custom = section(
      [
        { id: "first", type: "paragraph", text: "Before" },
        {
          id: "list",
          type: "list",
          style: "ordered",
          items: [
            { id: "a", text: "Same text" },
            { id: "b", text: "Same text" },
          ],
        },
        { id: "after", type: "paragraph", text: "After" },
      ],
      { title: "" },
    );
    expect(markdown(generateReadme(profileFor([custom])))).toBe(
      "Before\n\n1. Same text\n2. Same text\n\nAfter\n",
    );
  });
});

describe("custom web links and export safeguards", () => {
  it.each([
    ["https://example.com/a(b)?first=1&copy;=2", "https://example.com/a(b)?first=1&amp;copy;=2"],
    ["HTTP://LOCALHOST:3000/profile", "http://localhost:3000/profile"],
    ["https://münich.example", "https://xn--mnich-kva.example/"],
  ])("uses the shared web policy for %s", (url, expected) => {
    const custom = section([{ id: "link", type: "link", label: "A link", url }], { title: "" });
    expect(markdown(generateReadme(profileFor([custom])))).toBe(`[A link](<${expected}>)\n`);
  });

  it("uses an escaped address as the label when no link label was authored", () => {
    const custom = section([{ id: "link", type: "link", label: "", url: "https://example.com" }], {
      title: "",
    });
    expect(markdown(generateReadme(profileFor([custom])))).toBe(
      "[https&#58;//example\\.com](<https://example.com/>)\n",
    );
  });

  it.each([
    "",
    "mailto:alex@example.com",
    "javascript:alert(1)",
    "data:image/svg+xml,<svg></svg>",
    "//example.com",
    "/relative",
    "https://user:password@example.com",
    "https://example.com/has space",
    "https://example.com/\\path",
  ])("blocks an invalid visible custom link with its full storage path: %j", (url) => {
    const profile = profileFor([
      section([], { id: "hidden-first", visible: false }),
      section(
        [
          { id: "empty", type: "paragraph", text: "" },
          { id: "valid", type: "paragraph", text: "Useful content" },
          { id: "invalid", type: "link", label: "My link", url },
        ],
        { id: "shown-second" },
      ),
    ]);
    profile.visibility.presentation = true;
    profile.data.presentation.bio = "Valid fixed content";
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [{ code: "invalid_url", path: ["customSections", 1, "blocks", 2, "url"] }],
    });
  });

  it("omits hidden invalid custom sections while preserving their data", () => {
    const hidden = section(
      [{ id: "invalid", type: "link", label: "Saved", url: "javascript:alert(1)" }],
      { visible: false },
    );
    const profile = profileFor([hidden]);
    profile.visibility.presentation = true;
    profile.data.presentation.bio = "Still exportable";
    const before = structuredClone(profile);
    expect(markdown(generateReadme(freezeDeep(profile)))).toBe("Still exportable\n");
    expect(profile).toEqual(before);
  });

  it("reports original custom storage indices even when sectionOrder differs", () => {
    const profile = profileFor([
      section(
        [{ id: "first-link", type: "link", label: "First", url: "mailto:alex@example.com" }],
        { id: "one" },
      ),
      section([{ id: "second-link", type: "link", label: "Second", url: "/relative" }], {
        id: "two",
      }),
    ]);
    profile.sectionOrder.reverse();
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [
        { code: "invalid_url", path: ["customSections", 1, "blocks", 0, "url"] },
        { code: "invalid_url", path: ["customSections", 0, "blocks", 0, "url"] },
      ],
    });
  });
});

describe("one Markdown source in mixed section order", () => {
  it.each([
    ["ordered", "1. First\n\n1) Second\n\n1. Third\n"],
    ["unordered", "+ First\n\n* Second\n\n+ Third\n"],
  ] as const)(
    "keeps independent %s lists in untitled custom sections separate",
    (style, expected) => {
      const profile = profileFor([
        section(
          [{ id: "first-list", type: "list", style, items: [{ id: "first-item", text: "First" }] }],
          { id: "first", title: "" },
        ),
        section(
          [
            {
              id: "hidden-list",
              type: "list",
              style,
              items: [{ id: "hidden-item", text: "Hidden" }],
            },
          ],
          { id: "hidden", title: "", visible: false },
        ),
        section([{ id: "empty-list", type: "list", style, items: [] }], { id: "empty", title: "" }),
        section(
          [
            {
              id: "second-list",
              type: "list",
              style,
              items: [{ id: "second-item", text: "Second" }],
            },
          ],
          { id: "second", title: "" },
        ),
        section(
          [{ id: "third-list", type: "list", style, items: [{ id: "third-item", text: "Third" }] }],
          { id: "third", title: "" },
        ),
      ]);
      expect(markdown(generateReadme(freezeDeep(profile)))).toBe(expected);
    },
  );

  it("uses custom unordered markers distinct from the fixed modules' dash lists", () => {
    const profile = profileFor([
      section(
        [
          {
            id: "first-list",
            type: "list",
            style: "unordered",
            items: [{ id: "first-item", text: "Before contact" }],
          },
        ],
        { id: "before", title: "" },
      ),
      section(
        [
          {
            id: "second-list",
            type: "list",
            style: "unordered",
            items: [{ id: "second-item", text: "After contact" }],
          },
        ],
        { id: "after", title: "" },
      ),
    ]);
    profile.visibility.contact = true;
    profile.data.contact.links = [{ id: "website", label: "Website", url: "https://example.com" }];
    profile.sectionOrder = [
      { kind: "custom", sectionId: "before" },
      { kind: "module", moduleId: "contact" },
      { kind: "custom", sectionId: "after" },
      ...profile.sectionOrder.filter(
        (reference) => reference.kind === "module" && reference.moduleId !== "contact",
      ),
    ];
    expect(markdown(generateReadme(profile))).toBe(
      "+ Before contact\n\n## Contact\n\n- [Website](<https://example.com/>)\n\n* After contact\n",
    );
  });

  it("interleaves fixed and custom sections using sectionOrder rather than storage order", () => {
    const profile = profileFor([
      section([{ id: "a", type: "paragraph", text: "First custom body" }], {
        id: "first",
        title: "First custom",
      }),
      section([{ id: "b", type: "paragraph", text: "Second custom body" }], {
        id: "second",
        title: "Second custom",
      }),
    ]);
    profile.visibility.presentation = true;
    profile.visibility.contact = true;
    profile.data.presentation.displayName = "Alex";
    profile.data.contact.links = [{ id: "website", label: "Website", url: "https://example.com" }];
    const remaining = profile.sectionOrder.filter(
      (reference) =>
        reference.kind === "module" &&
        reference.moduleId !== "presentation" &&
        reference.moduleId !== "contact",
    );
    profile.sectionOrder = [
      { kind: "custom", sectionId: "second" },
      { kind: "module", moduleId: "presentation" },
      { kind: "custom", sectionId: "first" },
      { kind: "module", moduleId: "contact" },
      ...remaining,
    ];
    const before = JSON.stringify(profile);
    const result = generateReadme(freezeDeep(profile));
    expect(markdown(result)).toBe(
      '## Second custom\n\nSecond custom body\n\n<div><h1 align="center">Alex</h1></div>\n\n## First custom\n\nFirst custom body\n\n## Contact\n\n- [Website](<https://example.com/>)\n',
    );
    expect(generateReadme(profile)).toEqual(result);
    expect(JSON.stringify(profile)).toBe(before);
  });

  it("preserves opaque custom, block and item IDs without deriving output from them", () => {
    const custom = section(
      [
        {
          id: "\ud800",
          type: "list",
          style: "ordered",
          items: [{ id: "__proto__", text: "Readable content" }],
        },
      ],
      { id: "\ud800", title: "" },
    );
    const profile = freezeDeep(profileFor([custom]));
    expect(markdown(generateReadme(profile))).toBe("1. Readable content\n");
    expect(profile.customSections[0]?.id).toBe("\ud800");
  });

  it("retains activity export restrictions beside useful custom content", () => {
    const profile = profileFor([
      section([{ id: "own", type: "paragraph", text: "My own content" }]),
    ]);
    profile.visibility.metrics = true;
    profile.data.metrics = { username: "alex", cards: ["summary"] };
    const local = generateReadme(profile);
    expect(local.success).toBe(true);
    if (!local.success) return;
    expect(local.markdown).toContain("My own content");
    expect(local.markdown).toContain("/cards/github/alex/summary.svg?locale=en");
    expect(local.exportIssues).toEqual([
      { code: "activity_not_configured", path: ["data", "metrics"] },
    ]);
    const hosted = generateReadme(profile, { activityCardBaseUrl: "https://profiles.example.com" });
    expect(hosted.success).toBe(true);
    if (!hosted.success) return;
    expect(hosted.exportIssues).toBeUndefined();
    expect(hosted.markdown).toContain(
      "https://profiles.example.com/cards/github/alex/summary.svg?locale=en",
    );
  });

  it("keeps fixed section output unchanged after migrating a v1 profile with no custom sections", () => {
    const expected = createEmptyProfile("es");
    delete expected.data.technologies.layout;
    expected.visibility.presentation = true;
    expected.visibility.contact = true;
    expected.visibility.metrics = true;
    expected.data.presentation.bio = "My existing biography";
    expected.data.contact.links = [{ id: "\ud800", label: "Mi web", url: "https://example.com" }];
    expected.data.metrics = { username: "alex", cards: ["calendar"] };
    const legacy = {
      schemaVersion: 1,
      contentLocale: expected.contentLocale,
      data: expected.data,
      visibility: expected.visibility,
      moduleOrder: expected.sectionOrder.map((reference) => {
        if (reference.kind !== "module") throw new Error("Expected a fixed section");
        return reference.moduleId;
      }),
    };
    const parsed = parseProfileDocument(legacy);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.schemaVersion).toBe(2);
    expect(parsed.data.customSections).toEqual([]);
    expect(generateReadme(parsed.data)).toEqual(generateReadme(expected));
    const options = { activityCardBaseUrl: "https://profiles.example.com" };
    expect(generateReadme(parsed.data, options)).toEqual(generateReadme(expected, options));
  });
});
