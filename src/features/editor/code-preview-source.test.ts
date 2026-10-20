import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { describe, expect, it } from "vitest";
import { renderCodeFence } from "@/core/code";
import { remarkProfileIcons } from "./remark-profile-icons";
import { readGeneratedCodeSource } from "./code-preview-source";

describe("exact generated code in preview", () => {
  it.each([
    "name = 'Juan'",
    "\uFEFFname = 'Juan'\r\nlast = true\r\n",
    "first\rlast\r",
    "nested ``` fence\n\n",
    '<img src="https://example.com/a.svg" alt="test" />\n<script>alert(1)</script>',
    "",
    "\n",
  ])("recovers literal source from parser offsets: %j", (source) => {
    const markdown = `# Profile\n\n${renderCodeFence(source, "toml")}\n\n## Next`;
    let recovered: string | null = null;
    const html = renderToStaticMarkup(
      createElement(
        ReactMarkdown,
        {
          skipHtml: true,
          remarkPlugins: [remarkProfileIcons],
          components: {
            pre: ({ node }) => {
              recovered = readGeneratedCodeSource(
                markdown,
                node?.position?.start.offset,
                node?.position?.end.offset,
                "toml",
              );
              return createElement("pre", null, recovered);
            },
          },
        },
        markdown,
      ),
    );
    expect(recovered).toBe(source);
    expect(html).not.toMatch(/<img|<script/);
  });

  it("rejects noncanonical or unmatched ranges", () => {
    const markdown = renderCodeFence("a", "toml");
    expect(readGeneratedCodeSource(markdown, 0, markdown.length, "html")).toBeNull();
    expect(readGeneratedCodeSource(markdown, undefined, markdown.length, "toml")).toBeNull();
    expect(readGeneratedCodeSource(markdown, -1, markdown.length, "toml")).toBeNull();
    expect(readGeneratedCodeSource(markdown, 0, markdown.length - 1, "toml")).toBeNull();
    const excessiveFence = "````toml\na\n````";
    expect(readGeneratedCodeSource(excessiveFence, 0, excessiveFence.length, "toml")).toBeNull();
  });
});
