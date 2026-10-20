import { describe, expect, it, vi } from "vitest";
import { toHtml } from "hast-util-to-html";
import { fromHtml } from "hast-util-from-html";
import type { Root } from "hast";
import {
  analyzeProfileHtml,
  htmlNoticeCodes,
  htmlProblemCodes,
  PROFILE_HTML_MAX_DEPTH,
  PROFILE_HTML_MAX_LENGTH,
  PROFILE_HTML_MAX_NODES,
} from "./profile-html";

function problemCodes(source: string) {
  return analyzeProfileHtml(source).errors.map((problem) => problem.code);
}

function canonicalHtml(tree: Root) {
  return toHtml(tree).replace(/\r/g, "&#13;").replace(/\n/g, "&#10;");
}

describe("pure profile HTML contract", () => {
  it("exports a stable closed list of diagnostics and resource limits", () => {
    expect(htmlNoticeCodes).toEqual([
      "unsupported_elements",
      "unsupported_attributes",
      "comments_removed",
      "repaired_html",
    ]);
    expect(htmlProblemCodes).toEqual([
      "too_large",
      "too_complex",
      "invalid_url",
      "missing_image_alt",
      "invalid_structure",
      "empty_html",
    ]);
    expect(PROFILE_HTML_MAX_LENGTH).toBe(30_000);
    expect(PROFILE_HTML_MAX_NODES).toBe(1500);
    expect(PROFILE_HTML_MAX_DEPTH).toBe(32);
  });

  it.each(["", " \n\t\r "])("omits blank source without an empty-HTML error: %j", (source) => {
    expect(analyzeProfileHtml(source)).toEqual({
      html: "",
      tree: { type: "root", children: [] },
      notices: [],
      errors: [],
    });
  });

  it("preserves content and heading levels, adds no wrapper, and returns the corresponding safe tree", () => {
    const source =
      '<div align="center"><h1>Hi, I am Alex</h1><h3>My interests</h3><p>I enjoy <strong>building</strong> &amp; sharing.</p></div>';
    const result = analyzeProfileHtml(source);
    expect(result.errors).toEqual([]);
    expect(result.notices).toEqual([]);
    expect(result.html).toBe(source.replace("&amp;", "&#x26;"));
    expect(canonicalHtml(result.tree)).toBe(result.html);
    expect(result.tree.children[0]).toMatchObject({
      type: "element",
      tagName: "div",
      properties: { align: "center" },
    });
  });

  it("is deterministic without reading time, randomness, DOM or the network", () => {
    vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("No clock");
    });
    vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("No randomness");
    });
    const source = '<p title="A title">Hello <a href="https://example.com">world</a></p>';
    expect(analyzeProfileHtml(source)).toEqual(analyzeProfileHtml(source));
    expect(source).toBe('<p title="A title">Hello <a href="https://example.com">world</a></p>');
  });

  it("keeps canonicalization separate from removal notices", () => {
    const result = analyzeProfileHtml("<P>Hello &copy;</P>");
    expect(result.errors).toEqual([]);
    expect(result.notices).toEqual([]);
    expect(result.html).toBe("<p>Hello ©</p>");
  });

  it("keeps newlines inside preformatted content and details", () => {
    const source =
      "<details><summary>More about me</summary>\n\n<pre><code>first\n\nsecond &lt;tag&gt;</code></pre></details>";
    const result = analyzeProfileHtml(source);
    expect(result.errors).toEqual([]);
    expect(result.html).not.toContain("\n");
    expect(result.html).toContain("&#10;&#10;");
    expect(result.html).toContain("<pre><code>first&#10;&#10;second &#x3C;tag>");
    expect(canonicalHtml(result.tree)).toBe(result.html);
    expect(toHtml(fromHtml(result.html, { fragment: true }))).toBe(toHtml(result.tree));
  });

  it.each([
    ["<pre>\nhello</pre>", "hello", "<pre>hello</pre>"],
    ["<pre>\n\nhello</pre>", "\nhello", "<pre>&#10;&#10;hello</pre>"],
    ["<pre>\n\n\nhello</pre>", "\n\nhello", "<pre>&#10;&#10;&#10;hello</pre>"],
    ["<pre>&#10;&#10;hello</pre>", "\nhello", "<pre>&#10;&#10;hello</pre>"],
    ["<pre>&#xA;&#xA;&#xA;hello</pre>", "\n\nhello", "<pre>&#10;&#10;&#10;hello</pre>"],
    ["<pre>\r\n\r\nhello</pre>", "\nhello", "<pre>&#10;&#10;hello</pre>"],
    ["<pre> \nhello</pre>", " \nhello", "<pre> &#10;hello</pre>"],
  ])(
    "preserves the parsed PRE leading line feed after destination reparsing: %j",
    (source, text, html) => {
      const result = analyzeProfileHtml(source);
      expect(result.errors).toEqual([]);
      expect(result.html).toBe(html);
      expect(result.tree.children[0]).toMatchObject({
        type: "element",
        tagName: "pre",
        children: [{ type: "text", value: text }],
      });
      const reparsed = fromHtml(result.html, { fragment: true });
      expect(toHtml(reparsed)).toBe(toHtml(result.tree));
      expect(analyzeProfileHtml(source)).toEqual(result);
      expect(analyzeProfileHtml(result.html).html).toBe(result.html);
    },
  );

  it("does not compensate PRE when a CODE element precedes its line feeds", () => {
    const source = "<pre><code>\n\nhello</code></pre>";
    const result = analyzeProfileHtml(source);
    expect(result.errors).toEqual([]);
    expect(result.html).toBe("<pre><code>&#10;&#10;hello</code></pre>");
    expect(result.tree.children[0]).toMatchObject({
      type: "element",
      tagName: "pre",
      children: [
        { type: "element", tagName: "code", children: [{ type: "text", value: "\n\nhello" }] },
      ],
    });
    expect(toHtml(fromHtml(result.html, { fragment: true }))).toBe(toHtml(result.tree));
  });

  it("accepts output expanded by entities beyond the source limit without imposing a second limit", () => {
    const source = `<p>${"&".repeat(10_000)}</p>`;
    const result = analyzeProfileHtml(source);
    expect(source.length).toBeLessThan(PROFILE_HTML_MAX_LENGTH);
    expect(result.errors).toEqual([]);
    expect(result.html.length).toBeGreaterThan(PROFILE_HTML_MAX_LENGTH);
    expect(canonicalHtml(result.tree)).toBe(result.html);
  });
});

describe("profile HTML elements and attributes", () => {
  it("supports tables, folding, lists, code and inline semantics with bounded native attributes", () => {
    const source =
      '<details open><summary>A little more</summary><table align="center"><caption>Interests</caption><thead><tr><th scope="col" colspan="2">Topic</th></tr></thead><tbody><tr><td rowspan="2">UI</td><td>Accessibility</td></tr></tbody><tfoot><tr><td colspan="2">Always learning</td></tr></tfoot></table><ol start="3"><li><kbd>Tab</kbd> <sub>sub</sub> <sup>sup</sup> <del>old</del> <s>done</s></li></ol><blockquote><p><b>Bold</b> and <i>italic</i> <em>words</em><br></p></blockquote><hr></details>';
    const result = analyzeProfileHtml(source);
    expect(result.errors).toEqual([]);
    expect(result.notices).toEqual([]);
    expect(result.html).toContain("<details open>");
    expect(result.html).toContain('<th scope="col" colspan="2">');
    expect(result.html).toContain('<td rowspan="2">');
    expect(result.html).toContain('<ol start="3">');
    expect(result.html).toContain("<caption>Interests</caption>");
    expect(canonicalHtml(result.tree)).toBe(result.html);
  });

  it.each([
    "script",
    "style",
    "iframe",
    "object",
    "svg",
    "math",
    "template",
    "form",
    "button",
    "textarea",
    "video",
    "audio",
  ])("drops all content of dangerous %s elements", (tag) => {
    const result = analyzeProfileHtml(`<p>Keep this</p><${tag}>Never publish this</${tag}>`);
    expect(result.errors).toEqual([]);
    expect(result.notices).toContainEqual({ code: "unsupported_elements" });
    expect(result.html).not.toContain("Never publish this");
    expect(result.html).not.toContain(`<${tag}`);
    expect(result.html).toBe("<p>Keep this</p>");
  });

  it("drops void embed elements while preserving the text that follows them", () => {
    const result = analyzeProfileHtml(
      '<embed src="https://example.com/widget">Text after the void element',
    );
    expect(result.html).toBe("Text after the void element");
    expect(result.notices).toContainEqual({ code: "unsupported_elements" });
  });

  it("unwraps unsupported nonexecutable elements while preserving their useful text", () => {
    const result = analyzeProfileHtml("<section><article>My own words</article></section>");
    expect(result.html).toBe("My own words");
    expect(result.errors).toEqual([]);
    expect(result.notices).toEqual([{ code: "unsupported_elements" }]);
  });

  it("removes comments, arbitrary attributes, events, CSS and DOM-clobbering identities", () => {
    const result = analyzeProfileHtml(
      '<div id="location" name="__proto__" style="position:fixed" class="hero" tabindex="-1" onclick="alert(1)" data-x="x"><!--secret--><p title="Useful" align="center">Keep this</p></div>',
    );
    expect(result.errors).toEqual([]);
    expect(result.html).toBe('<div><p title="Useful" align="center">Keep this</p></div>');
    expect(result.notices).toEqual([
      { code: "comments_removed" },
      { code: "unsupported_attributes" },
    ]);
  });

  it("notices actual parse repairs such as duplicate attributes", () => {
    const result = analyzeProfileHtml('<p title="first" title="second">A note</p>');
    expect(result.errors).toEqual([]);
    expect(result.notices).toContainEqual({ code: "repaired_html" });
    expect(result.html).toBe('<p title="first">A note</p>');
  });

  it("drops invalid optional presentational values with a removal notice", () => {
    const result = analyzeProfileHtml(
      '<p align="justify">Text</p><ol start="10001"><li>Entry</li></ol><table><tbody><tr><td colspan="0" rowspan="101" scope="invalid">Cell</td></tr></tbody></table>',
    );
    expect(result.errors).toEqual([]);
    expect(result.notices).toContainEqual({ code: "unsupported_attributes" });
    expect(result.html).not.toContain("justify");
    expect(result.html).not.toContain("start=");
    expect(result.html).not.toContain("colspan=");
    expect(result.html).not.toContain("rowspan=");
    expect(result.html).not.toContain("scope=");
  });

  it.each([
    "<details><p>No summary</p></details>",
    "<details><summary> </summary><p>Body</p></details>",
    "<details><p>Before the summary</p><summary>Title</summary></details>",
    "<details><summary>One</summary><summary>Two</summary></details>",
    "<summary>Outside details</summary>",
    "<li>Outside a list</li>",
  ])("rejects invalid meaningful structure: %s", (source) => {
    expect(problemCodes(source)).toContain("invalid_structure");
    expect(analyzeProfileHtml(source).html).toBe("");
  });

  it.each(["<!--comment only-->", "<script>alert(1)</script>", "<p> \n </p>", "<br>"])(
    "rejects nonblank source with no exportable content: %s",
    (source) => {
      expect(problemCodes(source)).toContain("empty_html");
    },
  );
});

describe("profile HTML URLs and accessible names", () => {
  it.each(["https://example.com/a(b)?first=1&copy;=2", "http://localhost:3000/profile"])(
    "uses the shared absolute web policy for href %s",
    (href) => {
      const result = analyzeProfileHtml(
        `<a href="${href.replace(/&/g, "&amp;")}" target="_blank">A link</a>`,
      );
      expect(result.errors).toEqual([]);
      expect(result.html).toContain('<a href="');
      expect(result.html).not.toContain("target=");
    },
  );

  it.each([
    "javascript:alert(1)",
    "java&#x73;cript:alert(1)",
    "javascript&#58;alert(1)",
    "data:text/html,hello",
    "mailto:alex@example.com",
    "/relative",
    "#fragment",
    "//example.com",
    "",
    "https://user:pass@example.com",
    "https://example.com/has space",
  ])("reports unsafe href before sanitization can silently drop it: %s", (href) => {
    const result = analyzeProfileHtml(`<a href="${href}">A link</a>`);
    expect(result.errors).toContainEqual({ code: "invalid_url" });
    expect(result.html).toBe("");
    expect(result.tree.children).toEqual([]);
  });

  it("requires a readable name for a real link after unsafe descendants are removed", () => {
    expect(problemCodes('<a href="https://example.com"><script>Fake name</script></a>')).toContain(
      "invalid_structure",
    );
    expect(
      problemCodes(
        '<a href="https://example.com"><img src="https://images.example.com/x" alt=""></a>',
      ),
    ).toContain("invalid_structure");
    expect(
      analyzeProfileHtml(
        '<a href="https://example.com" aria-label="A project"><img src="https://images.example.com/x" alt=""></a>',
      ).errors,
    ).toEqual([]);
    expect(
      analyzeProfileHtml(
        '<a href="https://example.com"><img src="https://images.example.com/x" alt="A project"></a>',
      ).errors,
    ).toEqual([]);
  });

  it("permits a nonlink anchor's text without adding a URL", () => {
    expect(analyzeProfileHtml("<a>Plain text</a>").html).toBe("<a>Plain text</a>");
  });

  it.each([
    '<a href="https://example.com"><details><summary>More</summary><p>Body</p></details></a>',
    '<details><summary><a href="https://example.com">A nested link</a></summary><p>Body</p></details>',
    '<details><summary><span><a href="https://example.com">A deeply nested link</a></span></summary><p>Body</p></details>',
    "<details><summary>More <details><summary>Nested</summary><p>Body</p></details></summary><p>Body</p></details>",
    "<details><summary>More <summary>Nested</summary></summary><p>Body</p></details>",
  ])(
    "rejects nested interactive details, summary or links without rewriting the source: %s",
    (source) => {
      expect(problemCodes(source)).toContain("invalid_structure");
      expect(analyzeProfileHtml(source).html).toBe("");
    },
  );

  it("keeps noninteractive flow content inside links and formatted summary text", () => {
    expect(
      analyzeProfileHtml(
        '<a href="https://example.com"><div><p>Read <strong>more</strong></p></div></a>',
      ).errors,
    ).toEqual([]);
    expect(
      analyzeProfileHtml(
        "<details><summary><strong>More</strong> about me</summary><p>Body</p></details>",
      ).errors,
    ).toEqual([]);
  });

  it("accepts an explicitly decorative empty alt and injects browser-only loading controls", () => {
    const result = analyzeProfileHtml(
      '<img src="https://images.example.com/icon.svg" alt="" width="40" height="40" onerror="alert(1)" srcset="https://evil.example/x 2x">',
    );
    expect(result.errors).toEqual([]);
    expect(result.html).toContain('src="https://images.example.com/icon.svg"');
    expect(result.html).toContain('alt=""');
    expect(result.html).toContain('width="40"');
    expect(result.html).toContain('height="40"');
    expect(result.html).toContain('loading="lazy"');
    expect(result.html).toContain('decoding="async"');
    expect(result.html).toContain('referrerpolicy="no-referrer"');
    expect(result.html).not.toContain("onerror");
    expect(result.html).not.toContain("srcset");
    expect(analyzeProfileHtml(result.html)).toEqual({ ...result, notices: [] });
  });

  it("requires an alt attribute to exist, even if its value may intentionally be empty", () => {
    expect(problemCodes('<img src="https://images.example.com/x">')).toContain("missing_image_alt");
    expect(analyzeProfileHtml('<img src="https://images.example.com/x" alt>').errors).toEqual([]);
  });

  it.each([
    "http://images.example.com/x",
    "https://127.0.0.1/x",
    "https://host.local/x",
    "https://example.com/x#f",
    "data:image/png,x",
    "/assets/x.png",
    "javascript&#58;alert(1)",
    "",
  ])("restricts image sources to public HTTPS: %s", (src) => {
    expect(problemCodes(`<img src="${src}" alt="A demo">`)).toContain("invalid_url");
  });

  it("accepts bounded pixel dimensions and width percentages", () => {
    const result = analyzeProfileHtml(
      '<img src="https://images.example.com/x" alt="Demo" width="100%" height="2000">',
    );
    expect(result.errors).toEqual([]);
    expect(result.html).toContain('width="100%"');
    expect(result.html).toContain('height="2000"');
  });

  it.each(["0", "2001", "-1", "auto", "101%", "0%", "1.5"])(
    "removes unsupported image width %s",
    (width) => {
      const result = analyzeProfileHtml(
        `<img src="https://images.example.com/x" alt="Demo" width="${width}">`,
      );
      expect(result.errors).toEqual([]);
      expect(result.notices).toContainEqual({ code: "unsupported_attributes" });
      expect(result.html).not.toContain("width=");
    },
  );

  it("never allows percentage height or user-selected request controls", () => {
    const result = analyzeProfileHtml(
      '<img src="https://images.example.com/x" alt="Demo" height="100%" loading="eager" decoding="sync" referrerpolicy="unsafe-url">',
    );
    expect(result.errors).toEqual([]);
    expect(result.html).not.toContain("height=");
    expect(result.html).not.toContain("eager");
    expect(result.html).not.toContain('decoding="sync"');
    expect(result.html).not.toContain("unsafe-url");
  });
});

describe("profile HTML resource limits and parser boundaries", () => {
  it("checks length before parsing even for blank source", () => {
    expect(problemCodes(" ".repeat(PROFILE_HTML_MAX_LENGTH + 1))).toEqual(["too_large"]);
    expect(problemCodes("x".repeat(PROFILE_HTML_MAX_LENGTH))).toEqual([]);
  });

  it("rejects deeply nested input before recursive cleaning", () => {
    const source = `${"<div>".repeat(PROFILE_HTML_MAX_DEPTH + 1)}text${"</div>".repeat(PROFILE_HTML_MAX_DEPTH + 1)}`;
    expect(problemCodes(source)).toEqual(["too_complex"]);
  });

  it("accepts a text leaf at the maximum permitted depth", () => {
    const source = `${"<div>".repeat(PROFILE_HTML_MAX_DEPTH - 1)}text${"</div>".repeat(PROFILE_HTML_MAX_DEPTH - 1)}`;
    expect(problemCodes(source)).toEqual([]);
  });

  it("bounds node count independently of source length", () => {
    const source = "<br>".repeat(PROFILE_HTML_MAX_NODES);
    expect(source.length).toBeLessThan(PROFILE_HTML_MAX_LENGTH);
    expect(problemCodes(source)).toEqual(["too_complex"]);
  });

  it("also counts dangerous template content before dropping it", () => {
    const source = `<template>${"<br>".repeat(PROFILE_HTML_MAX_NODES)}</template><p>Keep</p>`;
    expect(problemCodes(source)).toEqual(["too_complex"]);
  });

  it.each([
    '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">',
    '<svg><foreignObject><p><img src="https://images.example.com/x" alt="" onerror="alert(1)"></p></foreignObject></svg><p>Safe</p>',
    "<table><caption><svg><desc><![CDATA[</desc><script>alert(1)</script>]]></svg></caption></table><p>Safe</p>",
  ])(
    "cannot emit active attributes, raw or executable nodes from malformed namespace input",
    (source) => {
      const result = analyzeProfileHtml(source);
      expect(result.html).not.toMatch(/<(?:script|svg|math|iframe|style)\b/i);
      expect(result.html).not.toMatch(/\son[a-z]+=/i);
      expect(result.html).not.toContain("javascript:");
      expect(canonicalHtml(result.tree)).toBe(result.html);
    },
  );
});
