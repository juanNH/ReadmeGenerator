import { describe, expect, it } from "vitest";
import { analyzeReadmeImport, buildImportedProfile } from "./index";

function importSource(source: string) {
  const analysis = analyzeReadmeImport(source, "en");
  expect(analysis.errors).toEqual([]);
  const result = buildImportedProfile(
    analysis,
    analysis.sections.map((section) => section.id),
  );
  if (!result.success) throw new Error(JSON.stringify(result.errors));
  return { analysis, result };
}

describe("editable literal code import", () => {
  it.each([
    ["toml", "toml"],
    ["TS", "typescript"],
    ["c++", "cpp"],
    ["future-lang", "future-lang"],
    ["", ""],
  ])("retains fenced %j source as code language %j", (language, expected) => {
    const source = 'name = "Juan"\n<script>literal()</script>\n';
    const { analysis, result } = importSource(`## About\n\n\`\`\`${language}\n${source}\n\`\`\``);
    expect(result.document.customSections[0]?.blocks).toEqual([
      expect.objectContaining({ type: "code", language: expected, source }),
    ]);
    expect(
      analysis.sections[0]?.notices.some((notice) => notice.code === "code_metadata_removed"),
    ).toBe(false);
    expect(result.readme.customHtml).toBeUndefined();
  });

  it("keeps independent code beside HTML without turning its source into interpreted HTML", () => {
    const { result } = importSource(
      '<h3 align="center">My setup</h3>\n\n```toml\nname = "Juan"\n```\n\n<p>After</p>',
    );
    const blocks = result.document.customSections[0]!.blocks;
    expect(blocks.map((block) => block.type)).toEqual(["html", "code", "html"]);
    expect(blocks[1]).toMatchObject({ language: "toml", source: 'name = "Juan"' });
    expect(result.readme.customHtml).toHaveLength(2);
  });

  it("notifies only discarded metadata, keeping language and content", () => {
    const { analysis, result } = importSource("```ts title=sample\nconst value = 1;\n```");
    expect(result.document.customSections[0]?.blocks[0]).toMatchObject({
      type: "code",
      language: "typescript",
      source: "const value = 1;",
    });
    expect(analysis.sections[0]?.notices).toContainEqual(
      expect.objectContaining({ code: "code_metadata_removed" }),
    );
  });

  it("preserves malformed language source as plain code with an explicit notice", () => {
    const { analysis, result } = importSource("~~~{.toml}\nname = 1\n~~~");
    expect(result.document.customSections[0]?.blocks[0]).toMatchObject({
      type: "code",
      language: "",
      source: "name = 1",
    });
    expect(analysis.sections[0]?.notices).toContainEqual(
      expect.objectContaining({ code: "code_metadata_removed" }),
    );
  });

  it("preserves exact BOM/CRLF section ranges while retaining code as normalized AST text", () => {
    const source =
      '\uFEFF<h1 align="center">Hi 🌱</h1>\r\n<h3>My setup</h3>\r\n\r\n```toml\r\nname = "Juan"\r\n```\r\n\r\n<h3>Links</h3>\r\n<p>Later</p>\r\n';
    const { analysis, result } = importSource(source);
    expect(analysis.sections).toHaveLength(2);
    expect(analysis.sections.map((section) => section.source).join("")).toBe(source);
    expect(analysis.sections[1]?.source.startsWith("<h3>Links</h3>")).toBe(true);
    expect(result.document.customSections[0]?.blocks).toContainEqual(
      expect.objectContaining({ type: "code", language: "toml", source: 'name = "Juan"' }),
    );
  });

  it("does not split code located in an uncertain open HTML container", () => {
    const { analysis, result } = importSource("<div>\n\n```ts\nconst value = 1;\n```\n\n</div>");
    expect(result.document.customSections[0]?.blocks.every((block) => block.type === "html")).toBe(
      true,
    );
    expect(analysis.sections[0]?.notices).toContainEqual(
      expect.objectContaining({ code: "code_metadata_removed" }),
    );
    expect(analysis.sections[0]?.notices).toContainEqual(
      expect.objectContaining({ code: "grouped_html_context" }),
    );
  });
});
