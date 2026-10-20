import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import type { Root } from "mdast";
import { codeLanguages, normalizeCodeLanguage, renderCodeFence } from "./index";

describe("bounded literal code languages and fences", () => {
  it.each([
    ["", ""],
    [" TS ", "typescript"],
    ["yml", "yaml"],
    ["C#", "csharp"],
    ["c++", "cpp"],
    ["My-Language.2", "my-language.2"],
    ["jsonc", "jsonc"],
    ["sass", "sass"],
  ])("normalizes %j to %j without requiring a catalog match", (input, expected) => {
    expect(normalizeCodeLanguage(input)).toBe(expected);
  });

  it.each(["js\n<script>", "js`x", "js attr=value", "<html>", "x".repeat(65)])(
    "rejects an unsafe or unbounded fence token %j",
    (language) => expect(normalizeCodeLanguage(language)).toBeNull(),
  );

  it("catalog identifiers and aliases resolve deterministically without collisions", () => {
    const seen = new Set<string>();
    for (const entry of codeLanguages) {
      for (const alias of [entry.id, ...entry.aliases]) {
        expect(seen.has(alias)).toBe(false);
        seen.add(alias);
        expect(normalizeCodeLanguage(alias)).toBe(entry.id);
      }
    }
  });

  it.each([
    'name = "Juan"',
    "before\n```html\n<script>alert(1)</script>\n```\nafter",
    "\n\n leading\tspaces \n",
    '😀 <img src="https://images.example.com/x"> & **text**',
    "`".repeat(100),
  ])("keeps an authored source literal inside exactly one code node", (source) => {
    const markdown = renderCodeFence(source, "toml");
    const root = unified().use(remarkParse).parse(markdown) as Root;
    expect(root.children).toHaveLength(1);
    expect(root.children[0]).toMatchObject({ type: "code", lang: "toml", value: source });
    expect(markdown).toContain(`\n${source}\n`);
  });

  it("does not normalize CRLF in the exported source", () => {
    const source = "one\r\ntwo\r\n";
    expect(renderCodeFence(source, "")).toBe(`\`\`\`\n${source}\n\`\`\``);
  });
});
