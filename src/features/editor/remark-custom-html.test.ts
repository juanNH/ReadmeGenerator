import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "@/core/profile/profile-operations";
import { generateReadme, type CustomHtmlFragment } from "@/core/readme";
import { remarkCustomHtml } from "./remark-custom-html";
import { remarkProfileIcons } from "./remark-profile-icons";

function generated(...sources: string[]) {
  const profile = createEmptyProfile("en");
  profile.customSections = [
    {
      id: "corner",
      title: "My corner",
      visible: true,
      blocks: sources.map((source, index) => ({
        id: `html-${index}`,
        type: "html" as const,
        source,
      })),
    },
  ];
  profile.sectionOrder.push({ kind: "custom", sectionId: "corner" });
  const result = generateReadme(profile);
  if (!result.success) throw new Error(JSON.stringify(result.errors));
  return result;
}

function render(markdown: string, fragments: readonly CustomHtmlFragment[] = []) {
  return renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      {
        skipHtml: true,
        remarkPlugins: [[remarkCustomHtml, { fragments }], remarkProfileIcons],
        components: {
          div: ({ node }) =>
            createElement(
              "section",
              { "data-slot": node?.properties.dataProfileHtmlIndex },
              "Controlled HTML",
            ),
        },
      },
      markdown,
    ),
  );
}

describe("controlled HTML preview ranges", () => {
  it("keeps the app recovery manifest out of rendered README preview", () => {
    const profile = createEmptyProfile("en");
    profile.customSections.push({
      id: "note",
      title: "Visible note",
      visible: true,
      blocks: [{ id: "paragraph", type: "paragraph", text: "Visible README content" }],
    });
    profile.sectionOrder.push({ kind: "custom", sectionId: "note" });
    const result = generateReadme(profile, { includeRecoverySnapshot: true });
    if (!result.success) throw new Error(JSON.stringify(result.errors));

    expect(result.markdown).toContain("<!-- github-profile-generator:manifest:v1");
    expect(result.markdown).toContain("Visible README content");
    const output = render(result.markdown, result.customHtml);
    expect(output).toContain("Visible README content");
    expect(output).not.toContain("github-profile-generator:manifest");
    expect(output).not.toContain("recoverySnapshot");
  });

  it("authorizes generated project covers only through their exact HTML fragment", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.projects = true;
    profile.data.projects.items = [
      {
        id: "app",
        name: "🌱 My app",
        description: "<img src=javascript:alert(1)>",
        role: "",
        technologies: [],
        links: [{ id: "demo", label: "Demo", url: "https://example.com/demo" }],
        cover: { url: "https://images.example.com/app.png", alt: "Project search interface" },
      },
    ];
    const result = generateReadme(profile);
    if (!result.success) throw new Error(JSON.stringify(result.errors));
    const output = render(result.markdown, result.customHtml);
    expect(output).toContain('data-slot="0"');
    expect(output).toContain('href="https://example.com/demo"');
    expect(output).toContain("&lt;img src=javascript:alert(1)&gt;");
    expect(output).not.toContain("<img");
    expect(render(result.markdown)).not.toContain("Controlled HTML");
    const fragment = result.customHtml![0]!;
    expect(render(result.markdown, [{ ...fragment, start: fragment.start + 1 }])).not.toContain(
      "Controlled HTML",
    );
  });
  it("keeps Markdown-looking text inert in the exported HTML without requiring our preview plugin", () => {
    const result = generated(
      "<div>\n\n![x](http://localhost/x)\n\n[link](javascript:alert(1))\n\n# Heading\n\n</div><pre><code>first\n\nsecond</code></pre>",
    );
    const output = renderToStaticMarkup(
      createElement(ReactMarkdown, { skipHtml: true }, result.customHtml![0]!.html),
    );
    expect(output).toBe("");
    expect(result.customHtml![0]!.html).not.toContain("\n");
  });
  it("replaces a complete multiline fragment even when CommonMark split its contents", () => {
    const result = generated(
      "<details>\n<summary>My notes</summary>\n\n# This stays HTML text\n\n<p>A note</p>\n</details>",
    );
    const output = render(`${result.markdown}\n## After\n\nStill here.\n`, result.customHtml);
    expect(output).toContain('<section data-slot="0">Controlled HTML</section>');
    expect(output).toContain("<h2>After</h2>");
    expect(output).toContain("<p>Still here.</p>");
    expect(output).not.toContain("My notes");
    expect(output).not.toContain("This stays HTML text");
  });

  it("keeps repeated fragments as independent authorized slots in output order", () => {
    const result = generated("<p>🌱 A thought</p>", "<p>🌱 A thought</p>");
    const output = render(result.markdown, result.customHtml);
    expect(output).toContain('data-slot="0"');
    expect(output).toContain('data-slot="1"');
    expect(output.match(/Controlled HTML/g)).toHaveLength(2);
    expect(output).toContain("<h2>My corner</h2>");
  });

  it("does not authorize HTML without exact source and complete root-node ranges", () => {
    const result = generated("<p>One thought</p>");
    const fragment = result.customHtml![0]!;
    for (const changed of [
      { ...fragment, start: fragment.start + 1 },
      { ...fragment, end: fragment.end - 1 },
      { ...fragment, start: -1 },
      { ...fragment, end: Number.POSITIVE_INFINITY },
      { ...fragment, html: fragment.html.replace("thought", "different") },
    ])
      expect(render(result.markdown, [changed])).not.toContain("Controlled HTML");
    expect(render(result.markdown)).not.toContain("Controlled HTML");
  });

  it("rejects overlapping ranges without hiding or replacing the following Markdown", () => {
    const result = generated("<p>One thought</p>");
    const fragment = result.customHtml![0]!;
    const output = render(`${result.markdown}\nPlain ending.\n`, [fragment, fragment]);
    expect(output.match(/Controlled HTML/g)).toHaveLength(1);
    expect(output).toContain("<p>Plain ending.</p>");
  });

  it("keeps other raw HTML skipped and escaped user markup as visible text", () => {
    const result = generated("<p>Controlled thought</p>");
    const output = render(
      `${result.markdown}\n<div><img src="https://untrusted.example.com/image.png"></div>\n\n&lt;img src=x onerror=run()&gt;\n`,
      result.customHtml,
    );
    expect(output).toContain("Controlled HTML");
    expect(output).not.toContain("untrusted.example.com");
    expect(output).toContain("&lt;img src=x onerror=run()&gt;");
  });
});
