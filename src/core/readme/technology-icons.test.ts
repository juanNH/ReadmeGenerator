import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "../profile/profile-operations";
import { findTechnology, findTechnologyByIconUrl, technologyCatalog } from "../technologies";
import { generateReadme } from "./generate-readme";
import { parseTechnologyIconRow, technologyIconMarkup } from "./technology-icons";

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

  it("exports selected tools with fixed icon dimensions while keeping custom names as text", () => {
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
    expect(result.markdown).toContain(technologyIconMarkup(findTechnology("React")!));
    expect(result.markdown).toContain("&lt;img");
    expect(result.markdown.match(/<img /g)).toHaveLength(1);
    expect(profile).toEqual(original);
  });
});
