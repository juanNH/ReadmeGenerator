import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "../profile/profile-operations";
import { findTechnology, findTechnologyByIconUrl, technologyCatalog } from "../technologies";
import { generateReadme } from "./generate-readme";
import {
  namedTechnologyIconMarkup,
  parseNamedTechnologyIconRow,
  parseTechnologyIconRow,
  technologyIconMarkup,
} from "./technology-icons";

describe("catalog icons and profile text", () => {
  it("resolves names and aliases without assigning a brand to an unknown tool", () => {
    expect(findTechnology("  REACT.js ")?.id).toBe("react");
    expect(findTechnology("ts")?.name).toBe("TypeScript");
    expect(findTechnology("React Native")?.id).toBe("react-native");
    expect(findTechnology("SQL")).toBeUndefined();
    expect(findTechnology("https://example.com/react.svg")).toBeUndefined();
  });

  it("only allows exact pinned icon URLs from the local catalog", () => {
    expect(new Set(technologyCatalog.map((entry) => entry.id)).size).toBe(technologyCatalog.length);
    for (const entry of technologyCatalog) {
      const source = new URL(entry.iconUrl);
      expect(source.origin).toBe("https://raw.githubusercontent.com");
      expect(source.pathname).toMatch(
        /^\/(?:devicons\/devicon\/[a-f0-9]{40}\/icons\/[a-z0-9-]+\/[a-z0-9-]+|simple-icons\/simple-icons\/[a-f0-9]{40}\/icons\/[a-z0-9-]+|lobehub\/lobe-icons\/[a-f0-9]{40}\/packages\/static-svg\/icons\/[a-z0-9-]+)\.svg$/,
      );
      expect(source.search).toBe("");
      expect(source.hash).toBe("");
      expect(entry.iconPath).toBe(`/technology-icons/${entry.id}.svg`);
      expect(findTechnologyByIconUrl(entry.iconUrl)).toBeDefined();
      expect(findTechnologyByIconUrl(`${entry.iconUrl}?override=true`)).toBeUndefined();
    }
    expect(findTechnologyByIconUrl("https://example.com/react.svg")).toBeUndefined();
  });

  it("recognizes only complete generated rows, with the correct name for shared assets", () => {
    const react = findTechnology("React")!;
    const native = findTechnology("React Native")!;
    expect(
      parseTechnologyIconRow(`${technologyIconMarkup(react)} ${technologyIconMarkup(native)}\n`),
    ).toEqual([react, native]);
    for (const value of [
      "",
      "<img src=x>",
      `${technologyIconMarkup(react)}<script>x</script>`,
      technologyIconMarkup(react).replace('width="32"', 'width="900"'),
      technologyIconMarkup(react).replace(" />", ' onerror="x" />'),
    ]) {
      expect(parseTechnologyIconRow(value)).toBeNull();
    }
  });

  it("accepts only exact decorative 20px tokens and preserves shared asset URLs", () => {
    const tools = ["React Native", "SvelteKit", "TanStack Query", "TanStack Router"].map((name) =>
      findTechnology(name)!,
    );
    const parsed = parseNamedTechnologyIconRow(tools.map(namedTechnologyIconMarkup).join(" \n "));
    expect(parsed?.map((entry) => entry.iconUrl)).toEqual(tools.map((entry) => entry.iconUrl));
    expect(namedTechnologyIconMarkup(tools[0]!)).toContain('width="20" height="20"');
    expect(namedTechnologyIconMarkup(tools[0]!)).toContain('alt=""');
    const markup = namedTechnologyIconMarkup(findTechnology("React")!);
    for (const value of [
      "",
      '<img width="20" height="20" src="https://example.com/tool.svg" alt="" />',
      markup.replace('width="20"', 'width="32"'),
      markup.replace('alt=""', 'alt="React"'),
      markup.replace(" />", ' onerror="alert(1)" />'),
      markup.replace(" />", ' style="display:none" />'),
      markup.replace(".svg", ".svg?override=1"),
      `${markup}<script>run()</script>`,
      `${markup}${markup}`,
      `${markup} React`,
      `&lt;${markup.slice(1)}`,
    ]) {
      expect(parseNamedTechnologyIconRow(value)).toBeNull();
    }
    expect(parseTechnologyIconRow(markup)).toBeNull();
    expect(parseNamedTechnologyIconRow(technologyIconMarkup(findTechnology("React")!))).toBeNull();
  });

  it("exports selected tools with decorative icons and visible names while keeping custom names inert", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.technologies = true;
    profile.data.technologies.groups = [
      {
        id: "tools",
        name: "",
        items: [
          { id: "react", name: "reactjs", context: "" },
          { id: "custom", name: '<img src="https://example.com/attack.svg">', context: "" },
        ],
      },
    ];
    const original = structuredClone(profile);
    const result = generateReadme(profile);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.markdown).toContain(
      `${namedTechnologyIconMarkup(findTechnology("React")!)}&nbsp;React`,
    );
    expect(result.markdown).toContain("&lt;img");
    expect(result.markdown.match(/<img /g)).toHaveLength(1);
    expect(result.markdown).not.toContain('width="32"');
    expect(profile).toEqual(original);
  });

  it("keeps readable catalog names in order and escapes their punctuation outside icon markup", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.technologies = true;
    profile.data.technologies.groups = [
      {
        id: "tools",
        name: "",
        items: [
          { id: "node", name: "nodejs", context: "" },
          { id: "wandb", name: "wandb", context: "" },
          { id: "custom", name: "Own [tool]", context: "" },
          { id: "react", name: "React", context: "Own <notes>" },
        ],
      },
    ];
    const result = generateReadme(profile);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.markdown).toBe(
      `## Technologies\n\n${namedTechnologyIconMarkup(findTechnology("Node.js")!)}&nbsp;Node\\.js · ${namedTechnologyIconMarkup(findTechnology("Weights & Biases")!)}&nbsp;Weights &amp; Biases · Own \\[tool\\]\n\n- ${namedTechnologyIconMarkup(findTechnology("React")!)} **React**: Own &lt;notes&gt;\n`,
    );
  });
});
