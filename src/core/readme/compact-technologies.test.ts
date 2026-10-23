import type { Root, RootContent } from "hast";
import { describe, expect, it } from "vitest";
import { createEmptyProfile, createEmptyProfileV1 } from "../profile/profile-operations";
import type { ProfileModuleData } from "../profile/module-content";
import { parseProfileDocument } from "../profile/profile-validation";
import { parseProjectFile, serializeProjectFile } from "../project";
import {
  moveTechnologyItem,
  organizeTechnologyGroups,
  removeTechnologyCategory,
  reorderTechnologyItem,
} from "../technologies/technology-groups";
import { generateReadme } from "./generate-readme";

type Technologies = ProfileModuleData["technologies"];
function documentWith(technologies: Technologies) {
  const document = createEmptyProfile("en");
  document.visibility.technologies = true;
  document.data.technologies = technologies;
  return document;
}
function generated(technologies: Technologies) {
  const result = generateReadme(documentWith(technologies));
  if (!result.success) throw new Error(JSON.stringify(result.errors));
  return result;
}
function text(node: Root | RootContent): string {
  return node.type === "text"
    ? node.value
    : "children" in node
      ? node.children.map(text).join("")
      : "";
}
const groups = [
  {
    id: "web",
    name: "Frontend",
    items: [
      { id: "react", name: "reactjs", context: "" },
      { id: "next", name: "Next.js", context: "" },
    ],
  },
  {
    id: "data",
    name: "Data",
    items: [{ id: "sql", name: "Own [tool]", context: "First paragraph\n\nSecond paragraph" }],
  },
];

describe("compact technologies", () => {
  it("uses compact only for new profiles and leaves recovered v1/v2 output unchanged", () => {
    expect(createEmptyProfile("en").data.technologies.layout).toBe("compact");
    const legacy = createEmptyProfileV1("en");
    legacy.data.technologies.groups = structuredClone(groups);
    legacy.visibility.technologies = true;
    const migrated = parseProfileDocument(legacy);
    if (!migrated.success) throw new Error(JSON.stringify(migrated.errors));
    expect(migrated.data.data.technologies).not.toHaveProperty("layout");
    const previous = generated({ groups });
    expect(generateReadme(migrated.data)).toEqual(previous);
    const parsed = parseProfileDocument(documentWith({ groups }));
    if (!parsed.success) throw new Error(JSON.stringify(parsed.errors));
    expect(parsed.data.data.technologies).not.toHaveProperty("layout");
    expect(generated({ groups, layout: "grouped" })).toEqual(previous);
    expect(
      parseProfileDocument({
        ...legacy,
        data: { ...legacy.data, technologies: { groups, layout: "compact" } },
      }).success,
    ).toBe(false);
  });

  it("keeps category labels inline, emits decorated chips and preserves context paragraphs and order", () => {
    const data: Technologies = { groups: structuredClone(groups), layout: "compact" };
    const original = structuredClone(data);
    const result = generated(data);
    expect(result.markdown).not.toContain("### Frontend");
    expect(result.markdown).toContain("<strong>Frontend: </strong><kbd>");
    expect(result.markdown).toContain('alt=""');
    expect(result.markdown).toContain('width="20" height="20"');
    expect(result.markdown).not.toContain('width="32"');
    expect(result.customImages).toBeUndefined();
    expect(result.customHtml).toHaveLength(2);
    const visibleText = result.customHtml!.map((fragment) => text(fragment.tree));
    expect(visibleText).toEqual([
      "Frontend:  React  Next.js ",
      "Data: Own [tool]: First paragraphSecond paragraph",
    ]);
    for (const fragment of result.customHtml ?? [])
      expect(result.markdown.slice(fragment.start, fragment.end)).toBe(fragment.html);
    expect(data).toEqual(original);
  });

  it("treats custom names and notes as text while authorizing only catalog image URLs", () => {
    const result = generated({
      layout: "compact",
      groups: [
        {
          id: "custom",
          name: "<script>Category</script>",
          items: [
            {
              id: "tool",
              name: '<img src="https://example.com/attack.png">',
              context: "[open](javascript:alert(1))\n\n# Still text",
            },
          ],
        },
      ],
    });
    expect(result.markdown.match(/<img /g)).toBeNull();
    expect(result.markdown).not.toContain("<script>");
    const tree = JSON.stringify(result.customHtml?.[0]?.tree);
    expect(tree).not.toContain('"tagName":"a"');
    expect(tree).not.toContain('"tagName":"script"');
    expect(tree).not.toContain('"tagName":"img"');
    expect(text(result.customHtml![0]!.tree)).toContain("[open](javascript:alert(1))");
  });

  it("preserves layout, categories, identities and contexts through organization, moves and JSON", () => {
    const data: Technologies = { layout: "compact", groups: structuredClone(groups) };
    const moved = moveTechnologyItem(data, "web", "react", "data", () => "fresh");
    const reordered = reorderTechnologyItem(moved, "data", "react", -1);
    const withoutTitle = removeTechnologyCategory(reordered, "web");
    const organized = organizeTechnologyGroups(withoutTitle, "es", () => "new-category");
    for (const next of [moved, reordered, withoutTitle, organized])
      expect(next.layout).toBe("compact");
    const document = documentWith(reordered);
    const serialized = serializeProjectFile(document);
    if (!serialized.success) throw new Error(serialized.code);
    expect(parseProjectFile(serialized.source)).toMatchObject({ success: true, document });
    expect(reordered.groups[1]?.items[1]?.context).toBe("First paragraph\n\nSecond paragraph");
    expect(data.groups).toEqual(groups);
  });

  it("shares exact ranges and HTML budget with the rest of the document and skips hidden sections", () => {
    const document = documentWith({
      layout: "compact",
      groups: [
        {
          id: "large",
          name: "Tools",
          items: [{ id: "tool", name: "Custom", context: "x".repeat(6000) }],
        },
      ],
    });
    document.customSections = [
      {
        id: "notes",
        title: "",
        visible: true,
        blocks: Array.from({ length: 5 }, (_, index) => ({
          id: `html-${index}`,
          type: "html" as const,
          source: `<p>${"x".repeat(29000)}</p>`,
        })),
      },
    ];
    document.sectionOrder.unshift({ kind: "custom", sectionId: "notes" });
    expect(generateReadme(document)).toEqual({
      success: false,
      errors: [{ code: "invalid_html", path: ["data", "technologies", "groups", 0] }],
    });
    document.visibility.technologies = false;
    const hidden = generateReadme(document);
    expect(hidden.success).toBe(true);
    if (hidden.success) expect(hidden.customHtml).toHaveLength(5);
  });
});
