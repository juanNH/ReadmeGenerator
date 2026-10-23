import { describe, expect, it } from "vitest";
import { createEmptyProfile, createEmptyProfileV1 } from "../profile/profile-operations";
import type { ProfileModuleData } from "../profile/module-content";
import { parseProfileDocument } from "../profile/profile-validation";
import { parseProjectFile, serializeProjectFile } from "../project";
import { generateReadme } from "./generate-readme";

function project(overrides: Partial<ProfileModuleData["projects"]["items"][number]> = {}) {
  return {
    id: "app",
    name: "My app",
    description: "A useful little app",
    role: "",
    technologies: [],
    links: [],
    ...overrides,
  };
}
function documentWith(...items: ReturnType<typeof project>[]) {
  const document = createEmptyProfile("en");
  document.visibility.projects = true;
  document.data.projects.items = items;
  return document;
}
function generated(document = documentWith(project())) {
  const result = generateReadme(document);
  if (!result.success) throw new Error(JSON.stringify(result.errors));
  return result;
}

describe("project showcase", () => {
  it("uses one title URL and omits secondary legacy links while keeping partial projects useful", () => {
    const document = documentWith(
      project({
        titleUrl: "https://example.com/title",
        links: [
          { id: "empty", label: "", url: " " },
          { id: "demo", label: "Try it", url: "https://example.com/demo" },
          { id: "repo", label: "Repository", url: "https://github.com/example/app" },
        ],
        role: "Author",
        technologies: ["TypeScript", "React"],
      }),
      project({
        id: "legacy",
        name: "Imported app",
        description: "Work in progress",
        links: [
          { id: "site", label: "Hosted app", url: "https://example.com/legacy" },
          { id: "old-repo", label: "Repository", url: "https://github.com/example/legacy" },
        ],
      }),
    );
    const result = generated(document);
    expect(result.markdown).toContain("### [My app](<https://example.com/title>)");
    expect(result.markdown).toContain("### [Imported app](<https://example.com/legacy>)");
    expect(result.markdown.match(/https:\/\/example.com\/legacy/g)).toHaveLength(1);
    expect(result.markdown).not.toContain("Try it");
    expect(result.markdown).not.toContain("Repository");
    expect(result.markdown).not.toContain("Hosted app");
    expect(result.markdown).toContain("Role: Author · Technologies: TypeScript, React");
    expect(document.data.projects.items[0]?.links).toHaveLength(3);
    expect(document.data.projects.items[0]?.links[1]?.label).toBe("Try it");
  });

  it("keeps invalid links blocking with their original nested paths", () => {
    const document = documentWith(
      project({
        links: [
          { id: "unsafe", label: "Demo", url: "javascript:alert(1)" },
          { id: "valid", label: "Code", url: "https://github.com/example/app" },
        ],
      }),
    );
    expect(generateReadme(document)).toEqual({
      success: false,
      errors: [{ code: "invalid_url", path: ["data", "projects", "items", 0, "links", 0, "url"] }],
    });
  });

  it("derives exact HTML ranges for repeated covers after Unicode without authorizing ordinary text", () => {
    const cover = {
      url: "https://images.example.com/app.png",
      alt: 'App <script> & "preview"\n  view',
    };
    const document = documentWith(
      project({ name: "🌱 My [app]", cover }),
      project({ id: "second", name: "Second", cover }),
    );
    document.visibility.presentation = true;
    document.data.presentation.bio = "👋 Hello\n\n<img src=javascript:alert(1)>";
    const result = generated(document);
    expect(result.customImages).toBeUndefined();
    expect(result.customHtml).toHaveLength(2);
    for (const fragment of result.customHtml ?? []) {
      expect(result.markdown.slice(fragment.start, fragment.end)).toBe(fragment.html);
      expect(fragment.html).toContain('width="480"');
      expect(JSON.stringify(fragment.tree)).not.toContain('"tagName":"script"');
      expect(fragment.tree.children[0]).toMatchObject({ type: "element", tagName: "div" });
    }
    expect(result.customHtml?.[0]?.html).toBe(result.customHtml?.[1]?.html);
    expect(result.customHtml?.[0]?.start).toBeLessThan(result.customHtml?.[1]?.start ?? 0);
    expect(result.markdown).toContain("&lt;img src\\=javascript&#58;alert\\(1\\)&gt;");
  });

  it.each([
    "http://images.example.com/app.png",
    "https://localhost/app.png",
    "https://127.0.0.1/app.png",
    "data:image/png;base64,abc",
    "blob:https://example.com/x",
    "https://images.example.com/app#x",
    "https://user:password@images.example.com/app",
    "https://images.example.com:8080/app",
  ])("rejects a nonpublic cover URL: %s", (url) => {
    expect(generateReadme(documentWith(project({ cover: { url, alt: "App preview" } })))).toEqual({
      success: false,
      errors: [{ code: "invalid_url", path: ["data", "projects", "items", 0, "cover", "url"] }],
    });
  });

  it("requires an alternative for a chosen cover, omits an empty one and ignores hidden data", () => {
    const document = documentWith(
      project({ cover: { url: "https://images.example.com/app", alt: "  " } }),
    );
    expect(generateReadme(document)).toEqual({
      success: false,
      errors: [
        { code: "missing_image_alt", path: ["data", "projects", "items", 0, "cover", "alt"] },
      ],
    });
    document.data.projects.items[0]!.cover = { url: "", alt: "" };
    expect(generated(document).customHtml).toBeUndefined();
    document.data.projects.items[0]!.cover = { url: "http://localhost/x", alt: "" };
    document.visibility.projects = false;
    document.visibility.presentation = true;
    document.data.presentation.bio = "Still available";
    expect(generated(document).markdown).toBe("Still available\n");
  });

  it("shares the visible HTML budget with existing custom content", () => {
    const document = documentWith(
      project({ cover: { url: "https://images.example.com/app", alt: "x".repeat(6000) } }),
    );
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
      errors: [{ code: "invalid_html", path: ["data", "projects", "items", 0, "cover", "url"] }],
    });
  });

  it("preserves title URLs, covers and incomplete source through JSON without changing v1", () => {
    const document = documentWith(
      project({
        titleUrl: "https://example.com/project",
        cover: { url: "  not-yet-a-url\r\n", alt: "\ufeff  Draft preview\n" },
      }),
    );
    const result = serializeProjectFile(document);
    if (!result.success) throw new Error(result.code);
    const reopened = parseProjectFile(result.source);
    expect(reopened).toMatchObject({ success: true, document });
    const legacy = createEmptyProfileV1("en");
    legacy.data.projects.items = [project()];
    const current = parseProfileDocument(legacy);
    expect(current).toMatchObject({ success: true });
    if (current.success) expect(current.data.data.projects.items[0]).not.toHaveProperty("cover");
    const extendedLegacy = {
      ...legacy,
      data: { ...legacy.data, projects: document.data.projects },
    };
    expect(parseProfileDocument(extendedLegacy).success).toBe(false);
    const oldCurrent = documentWith(project());
    const parsed = parseProfileDocument(oldCurrent);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.errors));
    expect(parsed.data).toEqual(oldCurrent);
    expect(parsed.data.data.projects.items[0]).not.toHaveProperty("cover");
    expect(
      parseProfileDocument({
        ...document,
        data: {
          ...document.data,
          projects: {
            items: [{ ...project(), cover: { url: "", alt: "", unsupported: true } }],
          },
        },
      }).success,
    ).toBe(false);
  });
});
