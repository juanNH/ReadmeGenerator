import { describe, expect, it } from "vitest";
import { classHighlighter, highlightTree } from "@lezer/highlight";
import { codeLanguages } from "@/core/code";
import enCustom from "@/messages/en/modules/custom.json";
import esCustom from "@/messages/es/modules/custom.json";
import { loadCodeLanguage } from "./code-editor-language";

const samples: Record<(typeof codeLanguages)[number]["id"], string> = {
  toml: 'name = "Alex"\n[profile]\nactive = true',
  json: '{ "name": "Alex", "active": true, "count": 1 }',
  jsonc: '{ // profile\n "name": "Alex", "count": 1\n}',
  yaml: 'name: "Alex"\nactive: true',
  javascript: 'const name = "Alex"; console.log(name);',
  typescript: 'const name: string = "Alex";',
  jsx: 'const Welcome = () => <h1 title="Welcome">Hello</h1>;',
  tsx: "const Welcome = ({name}: {name: string}) => <h1>{name}</h1>;",
  html: '<h1 title="Welcome">Hello</h1>',
  css: ".profile { color: red; margin: 10px; }",
  scss: "$color: red; .profile { color: $color; }",
  sass: "$color: red\n.profile\n  color: $color",
  markdown: "# Hello\n\nA **small** profile with *emphasis*.",
  bash: '# Profile\necho "Hello $USER"',
  powershell: '# Profile\nWrite-Output "Hello $env:USERNAME"',
  python: 'def greet(name):\n  return "Hello " + name',
  java: 'public class Hello { String name = "Alex"; }',
  c: "#include <stdio.h>\nint main() { return 0; }",
  cpp: '#include <string>\nclass Hello { std::string name = "Alex"; };',
  csharp: 'class Hola { string name = "Alex"; int count = 1; }',
  go: 'package main\nfunc main() { println("Hello") }',
  rust: 'fn main() { let name = "Alex"; }',
  ruby: 'def greet(name)\n  puts "Hello #{name}"\nend',
  php: '<?php function greet($name) { echo "Hello " . $name; }',
  swift: 'let name: String = "Alex"\nprint(name)',
  kotlin: 'fun main() { val name: String = "Alex" }',
  dart: 'void main() { final name = "Alex"; print(name); }',
  sql: "SELECT name FROM profiles WHERE active = true;",
  graphql: "query Profile($id: ID!) { user(id: $id) { name } }",
  dockerfile: 'FROM node:24\nRUN echo "Hello"',
  xml: '<?xml version="1.0"?><profile name="Alex">Hello</profile>',
  diff: "@@ -1 +1 @@\n-Hello\n+Welcome",
};

async function highlightedTokens(language: string, source: string) {
  const support = await loadCodeLanguage(language);
  const tokens: { text: string; classes: string }[] = [];
  if (support) {
    highlightTree(support.language.parser.parse(source), classHighlighter, (from, to, classes) => {
      tokens.push({ text: source.slice(from, to), classes });
    });
  }
  return { support, tokens };
}

describe("local syntax highlighting coverage", () => {
  it.each(codeLanguages)("highlights a representative $label snippet", async (entry) => {
    const { support, tokens } = await highlightedTokens(entry.id, samples[entry.id]);
    expect(support).not.toBeNull();
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.every((token) => token.text.length > 0 && token.classes.length > 0)).toBe(true);
  });

  it.each(
    codeLanguages.flatMap((entry) => entry.aliases.map((alias) => ({ alias, id: entry.id }))),
  )("uses the same grammar for alias $alias and $id", async ({ alias, id }) => {
    const canonical = await highlightedTokens(id, samples[id]);
    const alternative = await highlightedTokens(` ${alias.toUpperCase()} `, samples[id]);
    expect(alternative.support).not.toBeNull();
    expect(alternative.tokens).toEqual(canonical.tokens);
  });

  it.each(["", " ", "my-language.2", "madeup", "x".repeat(65), "js attr=x", "js`x"])(
    "keeps plain or unrecognized language %j without a grammar",
    async (language) => expect(await loadCodeLanguage(language)).toBeNull(),
  );

  it("colors the user's C# class keyword and its types, strings and numbers", async () => {
    const { tokens } = await highlightedTokens("c#", samples.csharp);
    expect(tokens).toContainEqual({ text: "class", classes: "tok-keyword" });
    expect(tokens).toContainEqual({ text: '"Alex"', classes: "tok-string" });
    expect(tokens).toContainEqual({ text: "1", classes: "tok-number" });
    expect(tokens.some((token) => token.classes === "tok-typeName")).toBe(true);
  });

  it("colors JSONC comments and keeps them out of strings", async () => {
    const { tokens } = await highlightedTokens("jsonc", samples.jsonc);
    expect(tokens).toContainEqual({ text: "// profile", classes: "tok-comment" });
    expect(tokens).toContainEqual({ text: '"Alex"', classes: "tok-string" });
  });

  it.each([
    'function greet($name) { echo "Hello"; }',
    '<?php function greet($name) { echo "Hello"; } ?>',
  ])("colors PHP snippets with or without opening markers: %s", async (source) => {
    const { tokens } = await highlightedTokens("php", source);
    expect(tokens).toContainEqual({ text: "function", classes: "tok-keyword" });
    expect(tokens).toContainEqual({ text: "echo", classes: "tok-keyword" });
    expect(tokens).toContainEqual({ text: '"Hello"', classes: "tok-string" });
    expect(
      tokens.some((token) => token.text === "$name" && token.classes.includes("tok-variableName")),
    ).toBe(true);
  });

  it("recognizes Markdown headings and emphasis and Diff additions and deletions", async () => {
    const markdown = await highlightedTokens("markdown", samples.markdown);
    expect(markdown.tokens.some((token) => token.classes.includes("tok-heading"))).toBe(true);
    expect(markdown.tokens.some((token) => token.classes.includes("tok-strong"))).toBe(true);
    expect(markdown.tokens.some((token) => token.classes.includes("tok-emphasis"))).toBe(true);
    const diff = await highlightedTokens("diff", samples.diff);
    expect(diff.tokens).toContainEqual({ text: "-Hello", classes: "tok-deleted" });
    expect(diff.tokens).toContainEqual({ text: "+Welcome", classes: "tok-inserted" });
  });

  it("recognizes GraphQL keywords, directives, variables, values and comments lexically", async () => {
    const source =
      '# profile\nquery Profile($id: ID!) { user(id: $id, count: -1.5e2, active: true, data: null) @skip(if: false) { name alias: "Alex\\\"" } }';
    const { tokens } = await highlightedTokens("graphql", source);
    expect(tokens).toContainEqual({ text: "# profile", classes: "tok-comment" });
    expect(tokens).toContainEqual({ text: "query", classes: "tok-keyword" });
    expect(tokens).toContainEqual({ text: "$id", classes: "tok-variableName2" });
    expect(tokens).toContainEqual({ text: "-1.5e2", classes: "tok-number" });
    expect(tokens).toContainEqual({ text: "true", classes: "tok-atom" });
    expect(tokens).toContainEqual({ text: "null", classes: "tok-atom" });
    expect(tokens).toContainEqual({ text: "@skip", classes: "tok-meta" });
    expect(tokens).toContainEqual({ text: '"Alex\\\""', classes: "tok-string" });
  });

  it("keeps GraphQL multiline descriptions and escaped triple quotes inside strings", async () => {
    const source =
      '"""A profile\nwith an escaped \\""" marker\nand more text"""\ntype Profile { name: String }';
    const { tokens } = await highlightedTokens("graphql", source);
    const firstKeyword = tokens.find((token) => token.classes === "tok-keyword");
    expect(firstKeyword?.text).toBe("type");
    const strings = tokens
      .filter((token) => token.classes === "tok-string")
      .map((token) => token.text);
    expect(strings.join("\n")).toContain("and more text");
    expect(
      tokens.some((token) => token.text === "Profile" && token.classes === "tok-typeName"),
    ).toBe(true);
  });

  it.each([enCustom, esCustom])(
    "offers valid JSON as the explicit example in each locale",
    (messages) => {
      expect(JSON.parse(messages.code.exampleSource)).toMatchObject({ name: "Alex" });
      expect(messages.code.exampleTitle).toContain("JSON");
      expect(messages.code.useExample).toContain("JSON");
      expect(messages.code.replaceConfirmation).toContain("JSON");
    },
  );
});
