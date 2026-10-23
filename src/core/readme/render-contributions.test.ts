import { describe, expect, it } from "vitest";
import type { ProfileModuleData } from "../profile/module-content";
import { PROFILE_HTML_MAX_DOCUMENT_LENGTH } from "./profile-html";
import { readmeLabels } from "./readme-labels";
import { renderContributionItems } from "./render-contributions";
import type { ReadmeIssue } from "./readme-result";

type Entry = ProfileModuleData["contributions"]["items"][number];

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "entry",
    title: "Documentation",
    description: "Reviewed the setup guide",
    url: "",
    ...overrides,
  };
}

function render(...items: Entry[]) {
  return renderWithBudget(items, 0);
}

function renderWithBudget(items: Entry[], sourceLength: number) {
  const errors: ReadmeIssue[] = [];
  const result = renderContributionItems({ items }, readmeLabels.en, errors, { sourceLength });
  return { ...result, errors };
}

describe("manual contribution rendering", () => {
  it("keeps the legacy URL output when the v2 links property is absent", () => {
    const result = render(entry({ url: "https://example.com/guide" }));
    expect(result.markdown).toBe(
      "- **Documentation**: Reviewed the setup guide\n  \n  [More information](<https://example.com/guide>)",
    );
    expect(result.errors).toEqual([]);
    expect(result.htmlFragments).toEqual([]);
  });

  it("renders named links in saved order and ignores the legacy URL when links exist", () => {
    const result = render(
      entry({
        url: "https://example.com/legacy",
        links: [
          { id: "docs", label: "Documentation", url: "https://example.com/docs" },
          { id: "review", label: "Review", url: "https://github.com/example/project/pull/1" },
        ],
      }),
    );
    expect(result.markdown).toContain(
      "[Documentation](<https://example.com/docs>) · [Review](<https://github.com/example/project/pull/1>)",
    );
    expect(result.markdown).not.toContain("/legacy");
    expect(result.errors).toEqual([]);
  });

  it("uses a localized fallback label for a link without a custom label", () => {
    const result = render(
      entry({ links: [{ id: "link", label: "", url: "https://example.com/guide" }] }),
    );
    expect(result.markdown).toContain("[More information](<https://example.com/guide>)");
  });

  it("reports invalid legacy, secondary, image, and repository URLs at their stored paths", () => {
    const legacy = render(entry({ url: "javascript:alert(1)" }));
    expect(legacy.errors).toEqual([
      { code: "invalid_url", path: ["data", "contributions", "items", 0, "url"] },
    ]);

    const secondary = render(
      entry({ links: [{ id: "unsafe", label: "Documentation", url: "javascript:alert(1)" }] }),
    );
    expect(secondary.errors).toEqual([
      {
        code: "invalid_url",
        path: ["data", "contributions", "items", 0, "links", 0, "url"],
      },
    ]);

    const image = render(
      entry({ images: [{ id: "unsafe", url: "http://images.example.com/x.png", alt: "Preview" }] }),
    );
    expect(image.errors).toEqual([
      {
        code: "invalid_url",
        path: ["data", "contributions", "items", 0, "images", 0, "url"],
      },
    ]);

    const repository = render(
      entry({ repository: { url: "https://github.com/owner/repo/tree/main", description: "" } }),
    );
    expect(repository.errors).toEqual([
      {
        code: "invalid_url",
        path: ["data", "contributions", "items", 0, "repository", "url"],
      },
    ]);
  });

  it("requires alt text for chosen images and omits empty image drafts", () => {
    const missingAlt = render(
      entry({ images: [{ id: "image", url: "https://images.example.com/x.png", alt: " " }] }),
    );
    expect(missingAlt.errors).toEqual([
      {
        code: "missing_image_alt",
        path: ["data", "contributions", "items", 0, "images", 0, "alt"],
      },
    ]);

    const empty = render(entry({ images: [{ id: "image", url: "", alt: "" }] }));
    expect(empty.errors).toEqual([]);
    expect(empty.htmlFragments).toEqual([]);
  });

  it("derives exact, escaped image and repository HTML ranges without customImages", () => {
    const result = render(
      entry({
        images: [
          {
            id: "image",
            url: "https://images.example.com/x.png",
            alt: 'Screenshot <script>alert("x")</script>',
          },
        ],
        repository: {
          url: "https://github.com/Example/project/",
          description: "A <script>safe text</script> description",
        },
      }),
    );
    expect(result.errors).toEqual([]);
    expect(result.htmlFragments).toHaveLength(2);
    for (const fragment of result.htmlFragments) {
      expect(result.markdown.slice(fragment.start, fragment.end)).toBe(fragment.html);
      expect(fragment.tree.children[0]).toMatchObject({ type: "element", tagName: "div" });
      expect(JSON.stringify(fragment.tree)).not.toContain('"tagName":"script"');
    }
    expect(result.htmlFragments[0]?.html).toContain(
      'alt="Screenshot <script>alert(&#x22;x&#x22;)</script>"',
    );
    expect(result.htmlFragments[1]?.html).toContain("Example/project");
    expect(result.htmlFragments[1]?.html).toContain("&#x3C;script>safe text&#x3C;/script>");
    expect(result.markdown).toContain("https://github.com/Example/project");
  });

  it("shares the aggregate HTML budget and points an overflow to the contributing field", () => {
    const result = renderWithBudget(
      [
        entry({
          images: [
            { id: "image", url: "https://images.example.com/x.png", alt: "x".repeat(6_000) },
          ],
        }),
      ],
      PROFILE_HTML_MAX_DOCUMENT_LENGTH - 10,
    );
    expect(result.errors).toEqual([
      {
        code: "invalid_html",
        path: ["data", "contributions", "items", 0, "images", 0, "url"],
      },
    ]);
  });

  it("includes the entire reordered item in the exported order", () => {
    const result = render(
      entry({
        id: "second",
        title: "Second",
        images: [
          { id: "second-image", url: "https://images.example.com/second.png", alt: "Second" },
        ],
      }),
      entry({
        id: "first",
        title: "First",
        links: [{ id: "first-link", label: "Docs", url: "https://example.com/first" }],
      }),
    );
    expect(result.markdown.indexOf("Second")).toBeLessThan(result.markdown.indexOf("First"));
    const image = result.htmlFragments.find((fragment) => fragment.html.includes("second.png"));
    expect(image).toBeDefined();
    expect(result.markdown.slice(image!.start, image!.end)).toBe(image!.html);
  });
});
