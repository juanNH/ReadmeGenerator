import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findTechnology, findTechnologyByIconUrl, technologyCatalog } from "./index";

describe("curated technology catalog", () => {
  it("provides a broad catalog with unique identities and unambiguous aliases", () => {
    expect(technologyCatalog.length).toBeGreaterThanOrEqual(200);
    expect(new Set(technologyCatalog.map((entry) => entry.id)).size).toBe(technologyCatalog.length);
    expect(new Set(technologyCatalog.map((entry) => entry.name.toLowerCase())).size).toBe(
      technologyCatalog.length,
    );
    for (const entry of technologyCatalog) {
      expect(entry.id).toMatch(/^[a-z0-9-]+$/);
      expect(findTechnology(` ${entry.name.toUpperCase()} `)).toBe(entry);
      for (const alias of entry.aliases) expect(findTechnology(alias)).toBe(entry);
    }
  });

  it("resolves AI assistants, agent tools, messaging and their familiar names", () => {
    for (const [name, id] of [
      ["openai codex", "codex"],
      ["Claude Code", "claude-code"],
      ["langraph", "langgraph"],
      ["lang chain", "langchain"],
      ["Chat GPT", "chatgpt"],
      ["copilot", "github-copilot"],
      ["geminicli", "gemini-cli"],
      ["jetbrains junie", "junie"],
      ["antigravity", "antigravity"],
      ["roo", "roo-code"],
      ["hf", "hugging-face"],
      ["llama index", "llamaindex"],
      ["mcp", "mcp"],
      ["kafka", "kafka"],
      ["rabbit mq", "rabbitmq"],
      ["gcp", "google-cloud"],
      ["sklearn", "scikit-learn"],
    ] as const) {
      expect(findTechnology(name)?.id).toBe(id);
    }
  });

  it("retains custom names as unrecognized text rather than inventing a logo", () => {
    for (const name of ["", "  ", "Jev", "My custom tool", "<script>x</script>"]) {
      expect(findTechnology(name)).toBeUndefined();
    }
  });

  it("matches exported images only to immutable curated source URLs", () => {
    for (const entry of technologyCatalog) {
      const source = new URL(entry.iconUrl);
      expect(source.origin).toBe("https://raw.githubusercontent.com");
      expect(source.pathname).toMatch(
        /^\/(?:devicons\/devicon\/[a-f0-9]{40}\/icons\/[a-z0-9-]+\/[a-z0-9-]+|simple-icons\/simple-icons\/[a-f0-9]{40}\/icons\/[a-z0-9-]+|lobehub\/lobe-icons\/[a-f0-9]{40}\/packages\/static-svg\/icons\/[a-z0-9-]+)\.svg$/,
      );
      expect(findTechnologyByIconUrl(entry.iconUrl)?.iconUrl).toBe(entry.iconUrl);
      expect(findTechnologyByIconUrl(`${entry.iconUrl}?override=1`)).toBeUndefined();
      expect(
        findTechnologyByIconUrl(entry.iconUrl.replace(/\/[a-f0-9]{40}\//, "/main/")),
      ).toBeUndefined();
    }
  });

  it("ships a passive local SVG for every entry without active or remote content", () => {
    const assetsRoot = new URL("../../../public/", import.meta.url);
    for (const entry of technologyCatalog) {
      const asset = readFileSync(
        fileURLToPath(new URL(entry.iconPath.slice(1), assetsRoot)),
        "utf8",
      );
      expect(asset).toMatch(/<svg[\s>]/);
      expect(asset).not.toMatch(/<(?:script|foreignObject|iframe|object|embed|image)\b/i);
      expect(asset).not.toMatch(/\son[a-z]+\s*=/i);
      expect(asset).not.toMatch(/(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:|javascript:)/i);
      expect(asset).not.toMatch(/@import|url\(\s*["']?(?:https?:|\/\/|data:|javascript:)/i);
    }
  });

  it("keeps the catalog and its aliases immutable across consumers", () => {
    expect(Object.isFrozen(technologyCatalog)).toBe(true);
    for (const entry of technologyCatalog) {
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.aliases)).toBe(true);
    }
  });
});
